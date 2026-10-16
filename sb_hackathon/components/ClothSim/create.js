// createClothSim: canvas 하나에 천 시뮬레이션을 붙이는 함수 (React 없이도 씀). React 컴포넌트는 ClothSimView.js
//
//   import { createClothSim } from './ClothSim';
//   const sim = await createClothSim(canvasElement, { scene: '/결과폴더/cloth' });
//   sim.set('tear', false);   sim.pause();   sim.destroy();
//
// scene: scene.json, scene.bin 이 있는 폴더 주소, 또는 { meta, bin } (이미 받은 JSON 과 ArrayBuffer)
// 장면 파일은 Python 쪽 (garment/export/webgpu_scene.py, design 또는 render 결과의 cloth/ 폴더) 이 만든다.
import { initGPU } from './gpu.js';
import { loadScene, derive } from './scene.js';
import { Solver } from './solver.js';
import { Renderer } from './renderer.js';
import { OrbitCamera } from './camera.js';

// 켜고 끄는 값과 기본값 (봉제선 터짐, 손가락 충돌은 기본 끔: README 6장)
export const DEFAULT_OPTIONS = {
  strain: true,      // 늘어남 색
  tear: true,        // 원단 찢어짐
  seamTear: false,   // 봉제선 터짐
  push: false,       // 손가락 충돌 (몸 점 -> 천 삼각형)
  body: true,        // 마네킹 보이기
  tearScale: 1,      // 찢어짐 기준 배수에 곱하는 값
  speed: 1,          // 화면 한 번에 계산할 프레임 수
};

export async function createClothSim(canvas, options = {}) {
  const {
    scene: source, device: givenDevice, autoplay = true, look = {}, offscreen = false,
    onStats = null, statsEvery = 10, onError = null,
  } = options;
  if (!canvas) throw new Error('createClothSim: canvas 가 필요합니다');
  if (!source) throw new Error('createClothSim: scene (장면 폴더 주소 또는 { meta, bin }) 이 필요합니다');
  let clothRepresentText = String(options.clothRepresentText ?? '');
  const device = givenDevice || (await initGPU()).device;
  const scene = await loadScene(source);
  const derived = derive(scene);
  const solver = await Solver.create(device, scene, derived);
  const renderer = await Renderer.create(device, canvas, solver, derived, offscreen, look);
  const abort = new AbortController();

  // 카메라: 천 중심을 보게
  const X = scene.A.X;
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < X.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], X[i + k]); hi[k] = Math.max(hi[k], X[i + k]); }
  const camera = new OrbitCamera(canvas, [0, (lo[1] + hi[1]) / 2, 0], Math.max(180, (hi[1] - lo[1]) * 3.2), abort.signal);

  const opts = { ...DEFAULT_OPTIONS };
  for (const k of Object.keys(DEFAULT_OPTIONS)) if (k in options) opts[k] = options[k];
  const apply = () => {
    solver.opts.tear_on = opts.tear; solver.opts.seam_tear_on = opts.seamTear;
    solver.opts.tear_scale = opts.tearScale; solver.opts.push_on = opts.push;
    renderer.flags.strain = opts.strain; renderer.flags.body = opts.body;
  };
  apply();

  let playing = autoplay, alive = true, msPerFrame = 0, pending = false, lastStats = null, raf = 0;
  device.lost.then(info => { alive = false; if (onError) onError(new Error('WebGPU 장치 끊김: ' + info.message)); });

  async function stats() {
    const s = await solver.readStats();
    delete s.X;
    lastStats = { ...s, msPerFrame, vertices: solver.n, ramp: solver.sim.ramp };
    return lastStats;
  }
  function refresh() {
    if (pending || !onStats) return;
    pending = true;
    stats().then(onStats).catch(e => onError && onError(e)).finally(() => { pending = false; });
  }
  function loop() {
    if (!alive) return;
    if (playing) {
      const t0 = performance.now();
      for (let k = 0; k < opts.speed; k++) solver.stepFrame();
      msPerFrame = 0.9 * msPerFrame + 0.1 * (performance.now() - t0) / opts.speed;
      if (solver.frame % statsEvery === 0) refresh();
    }
    if (!offscreen) renderer.draw(camera);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  refresh();

  return {
    get frame() { return solver.frame; },
    get playing() { return playing; },
    get options() { return { ...opts }; },
    get lastStats() { return lastStats; },
    camera,
    play() { playing = true; },
    pause() { playing = false; },
    reset() { solver.reset(); refresh(); },
    set(name, value) {
      if (!(name in DEFAULT_OPTIONS)) throw new Error(`ClothSim: 모르는 설정 ${name}`);
      opts[name] = value; apply();
    },
    setClothRepresentText(value) {
      clothRepresentText = String(value ?? '').slice(0, 36);
    },
    getClothRepresentText() { return clothRepresentText; },
    stats,
    // 화면 없이 k 프레임 계산 (점검, 미리 돌려 두기용). 끝난 뒤 상태와 위치(X) 반환
    async step(k = 1) {
      const was = playing; playing = false;
      const t0 = performance.now();
      for (let i = 0; i < k; i++) { solver.stepFrame(); if (i % 10 === 9) await device.queue.onSubmittedWorkDone(); }
      await device.queue.onSubmittedWorkDone();
      msPerFrame = (performance.now() - t0) / k;
      const s = await solver.readStats();
      playing = was;
      lastStats = { ...s, msPerFrame, vertices: solver.n, ramp: solver.sim.ramp };
      return lastStats;
    },
    // 지금 화면을 한 번 그리기 (offscreen 이면 2D 캔버스로 복사까지)
    async draw() { renderer.draw(camera); await renderer.present(); await device.queue.onSubmittedWorkDone(); },
    destroy() {
      alive = false; cancelAnimationFrame(raf); abort.abort();
      for (const b of Object.values(solver.B)) b.destroy();
      if (!givenDevice) device.destroy();
    },
    _internal: { solver, renderer, device },
  };
}
