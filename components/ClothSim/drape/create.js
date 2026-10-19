// createClothSim: canvas 하나에 천 시뮬레이션을 붙이는 함수 (React 없이도 씀). React 컴포넌트는 ClothSimView.js
//
//   import { createClothSim } from './ClothSim';
//   const sim = await createClothSim(canvasElement, { scene: '/결과폴더/cloth' });
//   sim.set('tear', false);   sim.pause();   sim.destroy();
//
// scene: scene.json, scene.bin 이 있는 폴더 주소, 또는 { meta, bin } (이미 받은 JSON 과 ArrayBuffer)
// 장면 파일은 Python 쪽 (garment/export/webgpu_scene.py, design 또는 render 결과의 cloth/ 폴더) 이 만든다.
import { initGPU, releaseGPU } from './gpu.js';
import { loadScene, derive } from './scene.js';
import { loadBody, unpackBodyVertices } from '../anny/index.js';
import { clothError, clothLog } from '../garment/clothLog.js';
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

/** Strict Mode 이중 마운트 시 WebGPU 시뮬이 겹치면 HUNG — 생성은 한 번에 하나 */
let createQueue = Promise.resolve();

export function createClothSim(canvas, options = {}) {
  const run = () => createClothSimImpl(canvas, options);
  const out = createQueue.then(run, run);
  createQueue = out.then(() => {}, () => {});
  return out;
}

/** intro: 포즈 한 단계 갱신 → 그 프레임들 동안 물리 (단계마다 격자 포함 갱신) */
const INTRO_POSE_STEPS = 16;

async function createClothSimImpl(canvas, options = {}) {
  const {
    scene: source, device: givenDevice, autoplay = true, look = {}, offscreen = false,
    onStats = null, statsEvery = 10, onError = null, abortSignal = null,
  } = options;
  const aborted = () => abortSignal?.aborted;
  if (!canvas) throw new Error('createClothSim: canvas 가 필요합니다');
  if (!source) throw new Error('createClothSim: scene (장면 폴더 주소 또는 { meta, bin }) 이 필요합니다');
  clothLog('createClothSim 시작', { bodyPoseIntro: !!options.bodyPoseIntro, bodyPoseCycle: !!options.bodyPoseCycle });
  let clothRepresentText = String(options.clothRepresentText ?? '');
  const ownsGpu = !givenDevice;
  const device = givenDevice || (await initGPU()).device;
  if (aborted()) throw new DOMException('ClothSim aborted', 'AbortError');
  const scene = await loadScene(source);
  if (aborted()) throw new DOMException('ClothSim aborted', 'AbortError');
  const derived = derive(scene);
  const solver = await Solver.create(device, scene, derived);
  if (aborted()) {
    for (const b of Object.values(solver.B)) b.destroy();
    throw new DOMException('ClothSim aborted', 'AbortError');
  }
  const renderer = await Renderer.create(device, canvas, solver, derived, offscreen, look);
  if (aborted()) {
    renderer.destroy();
    for (const b of Object.values(solver.B)) b.destroy();
    throw new DOMException('ClothSim aborted', 'AbortError');
  }
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
  let poseAnim = null;
  const introOpt = options.bodyPoseIntro;
  const cycleOpt = options.bodyPoseCycle;
  const onIntroDone = options.onBodyPoseIntroComplete;
  if (scene.meta?.body?.type === 'mesh') {
    if (introOpt) {
      const size = (typeof introOpt === 'object' && introOpt.size) || scene.meta.garment_size || 'm';
      const fromPose = (typeof introOpt === 'object' && introOpt.from) || 'arms_up';
      const toPose = (typeof introOpt === 'object' && introOpt.to) || 'attention';
      const durationSec = typeof introOpt === 'object' && introOpt.durationSec != null ? introOpt.durationSec : 4;
      const durationMs = durationSec * 1000;
      const snapOnly = !!(typeof introOpt === 'object' && (introOpt.snapOnly || durationSec <= 0));
      const settleFrames = Math.max(
        0,
        Math.round(((typeof introOpt === 'object' && introOpt.settleSec) ?? 4) * 60),
      );
      if (snapOnly) {
        poseAnim = {
          mode: 'intro', snapOnly: true, settleFramesLeft: settleFrames,
          ready: true, done: true, t0: null, lastGridStep: -1,
        };
        solver.poseDrape = settleFrames > 0;
        clothLog('포즈 intro 없음: 장면 빌드 포즈 유지, 물리 안정화만', { toPose, settleFrames });
        if (settleFrames <= 0) {
          solver.poseDrape = false;
          if (onIntroDone) onIntroDone();
        }
      } else {
        poseAnim = {
          mode: 'intro', size, fromPose, toPose, durationMs, snapOnly: false, settleFramesLeft: 0,
          t0: null, Va: null, Vb: null, scratch: null, ready: false, done: false, lastGridStep: -1,
        };
        solver.poseDrape = true;
        clothLog('포즈 intro 블렌드', { size, fromPose, toPose, durationMs });
        Promise.all([loadBody(size, fromPose), loadBody(size, toPose)]).then(([a, b]) => {
          if (!alive) return;
          poseAnim.Va = unpackBodyVertices(a.meta, a.bytes);
          poseAnim.Vb = unpackBodyVertices(b.meta, b.bytes);
          poseAnim.scratch = new Float32Array(poseAnim.Va.length);
          requestAnimationFrame(() => {
            if (!alive) return;
            solver.reservePoseGrid(poseAnim.Va, poseAnim.Vb);
            solver.applyBodyVertices(poseAnim.Va, renderer);
            poseAnim.ready = true;
            clothLog('포즈 intro 준비 완료');
          });
        }).catch(e => {
          clothError('포즈 intro 로드 실패', e);
          if (onError) onError(e);
        });
      }
    } else if (cycleOpt) {
      const size = (typeof cycleOpt === 'object' && cycleOpt.size) || scene.meta.garment_size || 'm';
      const period = (typeof cycleOpt === 'object' && cycleOpt.periodSec) || 5;
      poseAnim = { mode: 'cycle', size, period, t0: performance.now(), Va: null, Vb: null, scratch: null, ready: false };
      clothLog('포즈 cycle 로드', { size, period });
      Promise.all([loadBody(size, 'relax'), loadBody(size, 'attention')]).then(([a, b]) => {
        if (!alive) return;
        poseAnim.Va = unpackBodyVertices(a.meta, a.bytes);
        poseAnim.Vb = unpackBodyVertices(b.meta, b.bytes);
        poseAnim.scratch = new Float32Array(poseAnim.Va.length);
        poseAnim.ready = true;
        clothLog('포즈 cycle 준비 완료');
        solver.reservePoseGrid(poseAnim.Va, poseAnim.Vb);
      }).catch(e => {
        clothError('포즈 cycle 로드 실패', e);
        if (onError) onError(e);
      });
    }
  }
  device.lost.then(info => {
    alive = false;
    pending = false;
    cancelAnimationFrame(raf);
    if (onError) onError(new Error('WebGPU 장치 끊김: ' + info.message));
  });

  async function stats() {
    const s = await solver.readStats();
    delete s.X;
    lastStats = { ...s, msPerFrame, vertices: solver.n, ramp: solver.sim.ramp };
    return lastStats;
  }
  function refresh() {
    if (!alive || pending || !onStats) return;
    pending = true;
    stats().then(s => { if (alive) onStats(s); }).catch(e => { if (alive && onError) onError(e); }).finally(() => { pending = false; });
  }
  function finishIntroSettle() {
    if (!poseAnim || poseAnim.mode !== 'intro') return;
    poseAnim.settleFramesLeft = 0;
    solver.poseDrape = false;
    poseAnim.phase = 'done';
    if (onIntroDone) onIntroDone();
  }

  function loop() {
    if (!alive || aborted()) return;
    const introBlend = poseAnim?.ready && poseAnim.mode === 'intro' && !poseAnim.done && !poseAnim.snapOnly;
    const introSettle = poseAnim?.ready && poseAnim.mode === 'intro' && poseAnim.done && poseAnim.settleFramesLeft > 0;
    if (introBlend) {
      if (poseAnim.t0 == null) poseAnim.t0 = performance.now();
      const raw = Math.min(1, (performance.now() - poseAnim.t0) / poseAnim.durationMs);
      const u = raw * raw * (3 - 2 * raw);
      const poseStep = Math.min(INTRO_POSE_STEPS, Math.floor(u * INTRO_POSE_STEPS));
      if (poseStep !== poseAnim.lastGridStep) {
        poseAnim.lastGridStep = poseStep;
        const tu = poseStep / INTRO_POSE_STEPS;
        const a = poseAnim.Va;
        const b = poseAnim.Vb;
        const s = poseAnim.scratch;
        for (let i = 0; i < s.length; i++) s[i] = a[i] + (b[i] - a[i]) * tu;
        solver.applyBodyVertices(s, renderer);
      }
      if (raw >= 1) {
        poseAnim.done = true;
        solver.applyBodyVertices(poseAnim.Vb, renderer);
        const settleFrames = Math.max(
          0,
          Math.round(((typeof introOpt === 'object' && introOpt.settleSec) ?? 4) * 60),
        );
        poseAnim.settleFramesLeft = settleFrames;
        if (settleFrames <= 0) finishIntroSettle();
      }
    } else if (introSettle) {
      poseAnim.settleFramesLeft--;
      if (poseAnim.settleFramesLeft <= 0) finishIntroSettle();
    } else if (poseAnim?.ready && poseAnim.mode === 'cycle') {
      const ph = ((performance.now() - poseAnim.t0) / 1000 / poseAnim.period) % 1;
      const u = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph);
      const a = poseAnim.Va;
      const b = poseAnim.Vb;
      const s = poseAnim.scratch;
      for (let i = 0; i < s.length; i++) s[i] = a[i] + (b[i] - a[i]) * u;
      if ((solver.frame & 3) === 0) solver.applyBodyVerticesLight(s, renderer);
    }
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
      clothRepresentText = String(value ?? '');
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
      alive = false;
      solver.poseDrape = false;
      cancelAnimationFrame(raf);
      abort.abort();
      try { renderer.destroy(); } catch (_) { /* device lost */ }
      try {
        for (const b of Object.values(solver.B)) b.destroy();
      } catch (_) { /* device lost */ }
      if (ownsGpu) releaseGPU();
    },
    _internal: { solver, renderer, device },
  };
}
