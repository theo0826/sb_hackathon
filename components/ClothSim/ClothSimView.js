// React 컴포넌트: <ClothSim scene="/cloth" />. canvas 를 스스로 만들고, 사라질 때 GPU 를 정리한다.
// JSX 없이 써서 JS, TS 프로젝트 어디서나 설정 없이 동작.
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createClothSim, DEFAULT_OPTIONS } from './drape/create.js';
import { clothError, clothLog } from './garment/clothLog.js';
import { loadLogoBitmap } from './pattern/logo.js';

const ClothSim = forwardRef(function ClothSim(props, ref) {
  const { scene, options, autoplay = true, onStats, onError, onReady, style, className, look, clothRepresentText = '', logo = null } = props;
  const canvasRef = useRef(null);
  const simRef = useRef(null);
  const [error, setError] = useState(null);
  const [simReady, setSimReady] = useState(0);
  const cb = useRef({});
  cb.current = { onStats, onError, onReady };

  useImperativeHandle(ref, () => ({
    play: () => simRef.current && simRef.current.play(),
    pause: () => simRef.current && simRef.current.pause(),
    reset: () => simRef.current && simRef.current.reset(),
    set: (k, v) => simRef.current && simRef.current.set(k, v),
    stats: () => (simRef.current ? simRef.current.stats() : Promise.resolve(null)),
    captureImages: o => (simRef.current ? simRef.current.capture(o) : Promise.reject(new Error('시뮬레이션이 아직 준비되지 않았어요'))),
    get sim() { return simRef.current; },
  }), []);

  // 장면이 바뀌면 새로 만듦
  useEffect(() => {
    let alive = true;
    const ac = new AbortController();
    setError(null);
    const fail = e => {
      if (!alive) return;
      if (e?.name === 'AbortError') return;
      clothError('시뮬 오류', e);
      setError(String(e && e.message || e));
      if (cb.current.onError) cb.current.onError(e);
    };
    clothLog('ClothSimView 장면 마운트', scene ? 'scene 있음' : 'scene 없음');
    const simPromise = createClothSim(canvasRef.current, {
      scene, autoplay, look, clothRepresentText, abortSignal: ac.signal, ...(options || {}),
      onStats: s => cb.current.onStats && cb.current.onStats(s),
      onError: fail,
    }).then(sim => {
      if (!alive) { sim.destroy(); return null; }
      simRef.current = sim;
      sim.setClothRepresentText(clothRepresentText);
      clothLog('ClothSimView 시뮬 준비 완료');
      setSimReady(v => v + 1);
      if (cb.current.onReady) cb.current.onReady(sim);
      return sim;
    }).catch(fail);
    return () => {
      alive = false;
      ac.abort();
      const sim = simRef.current;
      simRef.current = null;
      if (sim) sim.destroy();
      else simPromise.then(s => s && s.destroy()).catch(() => {});
    };
  }, [scene]);

  // 설정이 바뀌면 그 값만 적용 (다시 만들지 않음)
  useEffect(() => {
    const sim = simRef.current;
    if (!sim || !options) return;
    for (const k of Object.keys(DEFAULT_OPTIONS)) if (k in options) sim.set(k, options[k]);
  }, [options]);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.setClothRepresentText(clothRepresentText);
  }, [clothRepresentText]);

  // 로고: 이미지가 바뀌면 불러오고, 위치만 바뀌면 값만 넘김 (3D 에 바로 반영)
  useEffect(() => {
    let alive = true;
    const sim = simRef.current;
    if (!sim || !sim.setLogo) return undefined;
    if (!logo || !logo.src) { sim.setLogo(null); return undefined; }
    loadLogoBitmap(logo.src).then(bitmap => { if (alive && simRef.current === sim) sim.setLogo({ ...logo, bitmap }); })
      .catch(e => clothError('로고 불러오기 실패', e));
    return () => { alive = false; };
  }, [logo, simReady]);

  return createElement('div', { className, style: { position: 'relative', width: '100%', height: '100%', ...(style || {}) } },
    createElement('canvas', { ref: canvasRef, style: { width: '100%', height: '100%', display: 'block', touchAction: 'none' } }),
    error && createElement('div', {
      style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 16, textAlign: 'center', fontSize: 14 },
    }, error));
});

export default ClothSim;
