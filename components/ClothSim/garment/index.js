/**
 * 옷 생성: LLM 선택 + wasm gm_build (도면·3D 배치·장면 bin)
 */
import WASM_B64 from './wasm.js';
import TREE from './assets/trees/v0_seed.js';
import PRIORS from './assets/priors/top_v0.js';
import { makeLLM } from './llm.js';
import { parseIntent } from './intent.js';
import { loadBody } from '../anny/index.js';
import { bytesToUint8Array } from '../anny/bodyAsset.js';
import { clothError, clothLog } from './clothLog.js';
import { logFinalSpecTokens } from './specLog.js';

export { makeLLM, LLM_DEFAULTS } from './llm.js';
export { parseIntent } from './intent.js';
export { logFinalSpecTokens, specTokenRows } from './specLog.js';

function b64bytes(s) {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

let enginePromise = null;

export function loadEngine() {
  if (!enginePromise) {
    clothLog('wasm 엔진 로드 시작');
    enginePromise = instantiate().then(eng => {
      clothLog('wasm 엔진 로드 완료');
      return eng;
    }).catch(e => {
      enginePromise = null;
      clothError('wasm 엔진 로드 실패', e);
      throw e;
    });
  }
  return enginePromise;
}

async function instantiate() {
  let mem = null;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const lineBuf = { 1: '', 2: '' };
  const wasi = {
    fd_write(fd, iovs, n, nwritten) {
      const v = new DataView(mem.buffer);
      let total = 0, s = '';
      for (let i = 0; i < n; i++) {
        const p = v.getUint32(iovs + i * 8, true), l = v.getUint32(iovs + i * 8 + 4, true);
        s += dec.decode(new Uint8Array(mem.buffer, p, l));
        total += l;
      }
      const all = (lineBuf[fd] || '') + s, lines = all.split('\n');
      lineBuf[fd] = lines.pop();
      for (const ln of lines) (fd === 2 ? console.warn : console.log)('[garment engine]', ln);
      v.setUint32(nwritten, total, true);
      return 0;
    },
    fd_close() { return 0; },
    fd_seek() { return 70; },
  };
  const { instance } = await WebAssembly.instantiate(b64bytes(WASM_B64), { wasi_snapshot_preview1: wasi });
  const x = instance.exports;
  mem = x.memory;
  if (x._initialize) x._initialize();

  const put = bytes => {
    const u8 = bytesToUint8Array(bytes);
    const p = x.gm_alloc(u8.length);
    new Uint8Array(mem.buffer, p, u8.length).set(u8);
    return [p, u8.length];
  };
  const out = () => dec.decode(new Uint8Array(mem.buffer, x.gm_out_ptr(), x.gm_out_len()).slice());
  const call = (fn, ...bufs) => {
    const ptrs = bufs.map(b => put(typeof b === 'string' ? enc.encode(b) : b));
    try { return fn(...ptrs.flat()); } finally { for (const [p] of ptrs) x.gm_free(p); }
  };

  return {
    async select(text, ask, opts = {}) {
      const h = call(x.gm_select_begin, TREE, text, JSON.stringify(opts));
      if (!h) throw new Error('트리를 읽지 못함');
      try {
        for (;;) {
          x.gm_select_step(h);
          const r = JSON.parse(out());
          if (r.error) throw new Error(r.error);
          if (r.done) return r.done;
          const a = await ask(r.need);
          call((p, l) => x.gm_select_answer(h, p, l), JSON.stringify(a));
        }
      } finally {
        x.gm_select_end(h);
      }
    },
    bodySize(spec) {
      if (!call(x.gm_body_size, JSON.stringify(spec))) throw new Error(JSON.parse(out()).error);
      return out();
    },
    build(spec, body) {
      const ok = call(x.gm_build, JSON.stringify(spec), JSON.stringify(body.meta), body.bytes);
      if (!ok) throw new Error(JSON.parse(out()).error);
      const meta = JSON.parse(out());
      const bin = new Uint8Array(mem.buffer, x.gm_bin_ptr(), x.gm_bin_len()).slice().buffer;
      return { meta, bin };
    },
  };
}

/** spec 의 표면 무늬, 가공 토큰 -> 그리기용 (drape/renderer.js 가 읽음). 도면 경로와 상관없이 마지막 이름으로 찾음 */
function surfaceFromSpec(spec) {
  const tok = {};
  for (const [p, t] of Object.entries(spec?.tokens || {})) tok[p.split('/').pop()] = t;
  const v = k => tok[k]?.value;
  const hexOf = k => tok[k]?.meta?.hex;
  const pattern = v('surface_pattern') || 'solid';
  const out = { pattern, finish: v('finish') || 'none' };
  if (pattern === 'stripe') {
    out.direction = v('stripe_direction') || 'horizontal';
    out.width = Number(v('stripe_width')) || 1;
    out.color2 = hexOf('stripe_color') || '#f2f1ec';
  } else if (pattern === 'check') {
    out.check_type = v('check_type') || 'gingham';
    out.width = { small: 1, medium: 2.5, large: 5 }[v('check_scale')] || 2.5;
    if (out.check_type === 'buffalo') out.width = Math.max(out.width, 3);
    out.color2 = hexOf('check_color') || '#f2f1ec';
  }
  return out;
}

export async function textToScene(text, o = {}) {
  clothLog('textToScene 시작', text.slice(0, 80));
  const eng = await loadEngine();
  const llm = o.llm || makeLLM();
  const step = s => {
    clothLog('textToScene 단계', s.stage, s.path || '', s.count ? `(${s.count})` : '');
    if (o.onStep) o.onStep(s);
  };
  let spec = o.spec;
  if (!spec) {
    const intent = parseIntent(text, o.fixed);
    if (Object.keys(intent.fixed).length) clothLog('intent fixed', intent.fixed);
    let count = 0;
    const t0 = performance.now();
    const priors = o.priors !== undefined ? o.priors : JSON.parse(PRIORS);
    spec = await eng.select(text, async q => {
      if (o.signal && o.signal.aborted) throw o.signal.reason || new Error('취소됨');
      count++;
      step({ stage: q.kind === 'choose' ? 'choose' : q.purpose, path: q.path, count });
      return q.kind === 'choose' ? llm.choose(q, o.signal) : llm.generate(q, o.signal);
    }, {
      preprocess: o.preprocess || 'v1_translate_en',
      model: llm.name,
      fixed: intent.fixed,
      priors,
      explicit_slots: intent.explicit_slots,
    });
    spec.info.select_seconds = Math.round((performance.now() - t0) / 100) / 10;
  }
  logFinalSpecTokens(spec, o.onTokenLog);
  step({ stage: 'build' });
  const size = eng.bodySize(spec);
  clothLog('체형 사이즈', size);
  const bodyPose = o.bodyPose || 'relax';
  const body = await loadBody(size, bodyPose);
  clothLog('gm_build 시작', { size, bodyPose });
  let scene;
  try {
    scene = eng.build(spec, body);
  } catch (e) {
    clothError('gm_build 실패', e);
    throw e;
  }
  scene.meta.garment_size = size;
  scene.meta.surface = surfaceFromSpec(spec);
  scene.meta.body_pose = bodyPose;
  clothLog('textToScene 완료', { size, bodyPose, verts: scene.meta?.sim?.n });
  step({ stage: 'done' });
  return { spec, scene };
}
