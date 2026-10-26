// createClothSim: canvas 하나에 천 시뮬레이션을 붙이는 함수 (React 없이도 씀). React 컴포넌트는 ClothSimView.js
//
//   import { createClothSim } from './ClothSim';
//   const sim = await createClothSim(canvasElement, { scene: '/결과폴더/cloth' });
//   sim.set('tear', false);   sim.pause();   sim.destroy();
//
// scene: scene.json, scene.bin 이 있는 폴더 주소, 또는 { meta, bin } (이미 받은 JSON 과 ArrayBuffer)
//
// 두 단계로 입힘
//   1단계 (dressing): 중력 없이 위치만 풀어서, 처음 배치에서 몸 안에 들어가거나 최소 간격(clearance, 기본 0.2cm)보다
//     가까운 천을 밖으로 밀어냄. 늘어남, 굽힘, 봉제는 켠 채라 이상적인 옷 모양은 유지. 움직임이 멈추면 끝
//   2단계: 중력으로 늘어뜨림
//   showDressing: false 면 1단계를 화면에 그리지 않고 빨리 계산한 뒤 2단계부터 보여 줌
//   bendScale: 굽힘 강성 배수 (scene.js 의 원단 대표값에 곱함)
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
  push: true,        // 몸 점 -> 천 삼각형 충돌 (점 사이 면을 몸이 뚫고 나오지 않게, 손가락 등). 계산량 늘어남
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

/** 다 내려앉음 판정: 입히기가 끝난 뒤 settleCheckEvery 프레임마다 위치를 읽어 상위 1% 이동량이 settleTol(cm/프레임) 아래면 끝.
 *  settleMinFrames 전에는 판정하지 않고, settleMaxFrames 가 지나면 움직여도 끝으로 봄 (계속 미세하게 흔들려 끝나지 않는 것 방지) */
const SETTLE_DEFAULTS = { settleMinFrames: 60, settleMaxFrames: 600, settleTol: 0.004, settleCheckEvery: 30 };

/** 1단계 기본값 */
const DRESS_DEFAULTS = { clearance: 0.2, dressMaxFrames: 300, dressTol: 0.01, dressCheckEvery: 10, hiddenFramesPerTick: 8 };

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
  const dressOpt = {
    dressing: options.dressing !== false,
    showDressing: options.showDressing !== false,
    clearance: options.clearance ?? DRESS_DEFAULTS.clearance,
    maxFrames: options.dressMaxFrames ?? DRESS_DEFAULTS.dressMaxFrames,
    tol: options.dressTol ?? DRESS_DEFAULTS.dressTol,
  };
  const derived = derive(scene, { bendScale: options.bendScale ?? 1 });
  clothLog('굽힘 (이면각)', derived.bendInfo);
  const solver = await Solver.create(device, scene, derived, { clearance: dressOpt.clearance, dressing: dressOpt.dressing, shellMin: options.shellMin });
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
  // 1단계 수렴 확인: dressCheckEvery 프레임마다 위치를 읽어, 점들의 프레임당 이동량 상위 1% 값이 dressTol 아래면 끝
  // (가장 많이 움직인 점 하나로 보면, 겹침과 관계없이 천천히 자리 잡는 넓은 판 때문에 끝나지 않음)
  let dressPrevX = null, dressPrevFrame = 0, dressChecking = false, dressLastMove = null;
  function endDressing(reason) {
    if (!solver.dress) return;
    solver.dress = false;
    solver.writeParams();
    clothLog('1단계(입히기) 끝', { reason, frames: solver.frame, maxMovePerFrame: dressLastMove });
    if (options.onDressingDone) options.onDressingDone({ reason, frames: solver.frame, maxMovePerFrame: dressLastMove, movePerFrameP99: dressLastMove });
  }
  async function dressCheck() {
    if (!solver.dress || dressChecking) return;
    if (solver.frame >= dressOpt.maxFrames) { endDressing('max_frames'); return; }
    if (solver.frame - dressPrevFrame < DRESS_DEFAULTS.dressCheckEvery && dressPrevX) return;
    dressChecking = true;
    try {
      const frame = solver.frame;
      const X = await solver.readX();
      if (dressPrevX && frame > dressPrevFrame) {
        const att = scene.A.attach, moves = [];
        for (let i = 0; i < solver.n; i++) {
          if (att[i] === 1) continue;
          const dx = X[3 * i] - dressPrevX[3 * i], dy = X[3 * i + 1] - dressPrevX[3 * i + 1], dz = X[3 * i + 2] - dressPrevX[3 * i + 2];
          moves.push(dx * dx + dy * dy + dz * dz);
        }
        moves.sort((a, b) => a - b);
        const p99 = moves.length ? moves[Math.min(moves.length - 1, Math.floor(moves.length * 0.99))] : 0;
        dressLastMove = Math.sqrt(p99) / (frame - dressPrevFrame);
        // 봉제가 끝나고(ramp) 합친 점이 자리 잡을 때까지는 기다림
        if (frame >= solver.sim.ramp + 10 && dressLastMove < dressOpt.tol) endDressing('converged');
      }
      dressPrevX = X; dressPrevFrame = frame;
    } finally { dressChecking = false; }
  }

  // 2단계(중력) 뒤 다 내려앉았는지 확인. 한 번 끝나면 onSettled({ reason, frames }) 를 한 번 부름
  let settled = false, settleStart = -1, settlePrevX = null, settlePrevFrame = 0, settleChecking = false;
  async function settleCheck() {
    if (settled || settleChecking || solver.dress || solver.poseDrape) return;
    if (settleStart < 0) { settleStart = solver.frame; return; }
    const since = solver.frame - settleStart;
    const finish = reason => {
      settled = true;
      clothLog('다 내려앉음', { reason, frames: solver.frame });
      if (options.onSettled) {
        try { options.onSettled({ reason, frames: solver.frame }); } catch (e) { clothError('onSettled 오류', e); }
      }
    };
    if (since >= SETTLE_DEFAULTS.settleMaxFrames) { finish('max_frames'); return; }
    if (since < SETTLE_DEFAULTS.settleMinFrames) return;
    if (settlePrevX && solver.frame - settlePrevFrame < SETTLE_DEFAULTS.settleCheckEvery) return;
    settleChecking = true;
    try {
      const frame = solver.frame;
      const X = await solver.readX();
      if (!alive) return;
      if (settlePrevX && frame > settlePrevFrame) {
        const att = scene.A.attach, moves = [];
        for (let i = 0; i < solver.n; i++) {
          if (att[i] === 1) continue;
          const dx = X[3 * i] - settlePrevX[3 * i], dy = X[3 * i + 1] - settlePrevX[3 * i + 1], dz = X[3 * i + 2] - settlePrevX[3 * i + 2];
          moves.push(dx * dx + dy * dy + dz * dz);
        }
        moves.sort((a, b) => a - b);
        const p99 = moves.length ? moves[Math.min(moves.length - 1, Math.floor(moves.length * 0.99))] : 0;
        if (Math.sqrt(p99) / (frame - settlePrevFrame) < SETTLE_DEFAULTS.settleTol) finish('converged');
      }
      settlePrevX = X; settlePrevFrame = frame;
    } catch (e) { clothError('내려앉음 확인 실패', e); } finally { settleChecking = false; }
  }

  // 캡처용 카메라 (화면 카메라와 따로, 마우스 이벤트 없음). 옷 전체가 정사각 화면에 들어오게 거리 계산
  async function captureCameras(views) {
    const X = await solver.readX();
    const n = scene.meta.shell && scene.meta.shell.n_outer ? scene.meta.shell.n_outer : solver.n;
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const v = X[3 * i + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
    const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    const fit = Math.max(hi[1] - lo[1], hi[0] - lo[0]) * 1.12;
    const fov = 32 * Math.PI / 180;
    const dist = fit / 2 / Math.tan(fov / 2) + (hi[2] - lo[2]) / 2;
    const YAW = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
    return views.map(v => {
      const cam = Object.create(OrbitCamera.prototype);
      cam.target = c; cam.dist = dist; cam.yaw = YAW[v] ?? 0; cam.pitch = 0.04; cam.fov = fov;
      return cam;
    });
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
    const dressing = solver.dress;
    const introBlend = !dressing && poseAnim?.ready && poseAnim.mode === 'intro' && !poseAnim.done && !poseAnim.snapOnly;
    const introSettle = !dressing && poseAnim?.ready && poseAnim.mode === 'intro' && poseAnim.done && poseAnim.settleFramesLeft > 0;
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
    } else if (!dressing && poseAnim?.ready && poseAnim.mode === 'cycle') {
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
      // 1단계를 안 보여 주면 한 번에 여러 프레임 계산
      const nf = dressing && !dressOpt.showDressing ? DRESS_DEFAULTS.hiddenFramesPerTick : opts.speed;
      for (let k = 0; k < nf; k++) solver.stepFrame();
      msPerFrame = 0.9 * msPerFrame + 0.1 * (performance.now() - t0) / nf;
      if (solver.frame % statsEvery === 0) refresh();
      if (dressing) dressCheck();
      else if (!settled && solver.frame % 10 === 0) settleCheck();
    }
    if (!offscreen && (!dressing || dressOpt.showDressing)) renderer.draw(camera);
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
    // 로고 붙이기: { bitmap (ImageBitmap), panel (메쉬 이름, 예 'front'), x, y (도면 cm), width (cm), rotation (도), visible }
    // null 이면 지움. 값만 바뀌면 다음 화면에 바로 반영 (다시 계산하지 않음)
    setLogo(lg) {
      if (!lg || !lg.bitmap) { renderer.setLogo(null); return; }
      const mesh = scene.meta.meshes.findIndex(m => m.name === lg.panel);
      renderer.setLogo({ ...lg, mesh });
    },
    play() { playing = true; },
    pause() { playing = false; },
    reset() {
      solver.dress = dressOpt.dressing; dressPrevX = null; dressPrevFrame = 0; dressLastMove = null;
      settled = false; settleStart = -1; settlePrevX = null; settlePrevFrame = 0;
      solver.reset(); refresh();
    },
    /** 다 내려앉았는지 (onSettled 가 불린 뒤 true) */
    get settled() { return settled; },
    // 앞면, 뒷면 캡처: { views: ['front','back'], size: 1024 } -> { front: ImageData, back: ImageData, settled }
    // 화면 카메라와 늘어남 색은 건드리지 않음. 다 내려앉기 전에 부르면 그 순간 모양
    async capture({ views = ['front', 'back'], size = 1024 } = {}) {
      const w = Math.max(64, Math.min(2048, Math.round(size)));
      const cams = await captureCameras(views);
      const out = { settled };
      for (let i = 0; i < views.length; i++) out[views[i]] = await renderer.capture(cams[i], w, w);
      return out;
    },
    /** 1단계(입히기) 중인지 */
    get dressing() { return solver.dress; },
    // 진단용 (콘솔에서 위치, 장면 배열 확인). 화면 동작에는 쓰지 않음
    get _debug() { return { solver, scene, derived }; },
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
      for (let i = 0; i < k; i++) {
        solver.stepFrame();
        // 1단계 확인은 반복 횟수가 아니라 프레임 번호로 (step(5) 처럼 작게 나눠 부르면 전에는 확인이 한 번도 안 돌아 1단계가 끝나지 않았음)
        if (solver.frame % 10 === 0 || i === k - 1) { await device.queue.onSubmittedWorkDone(); if (solver.dress) await dressCheck(); }
      }
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
