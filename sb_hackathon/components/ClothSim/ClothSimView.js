// React 컴포넌트: <ClothSim scene="/cloth" />. canvas 를 스스로 만들고, 사라질 때 GPU 를 정리한다.
// JSX 없이 써서 JS, TS 프로젝트 어디서나 설정 없이 동작.
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createClothSim, DEFAULT_OPTIONS } from './create.js';

const ClothSim = forwardRef(function ClothSim(props, ref) {
  const { scene, options, autoplay = true, onStats, onError, onReady, style, className, look, clothRepresentText = '' } = props;
  const canvasRef = useRef(null);
  const simRef = useRef(null);
  const [error, setError] = useState(null);
  const cb = useRef({});
  cb.current = { onStats, onError, onReady };

  useImperativeHandle(ref, () => ({
    play: () => simRef.current && simRef.current.play(),
    pause: () => simRef.current && simRef.current.pause(),
    reset: () => simRef.current && simRef.current.reset(),
    set: (k, v) => simRef.current && simRef.current.set(k, v),
    stats: () => (simRef.current ? simRef.current.stats() : Promise.resolve(null)),
    get sim() { return simRef.current; },
  }), []);

  // 장면이 바뀌면 새로 만듦
  useEffect(() => {
    let alive = true;
    setError(null);
    const fail = e => { if (!alive) return; setError(String(e && e.message || e)); if (cb.current.onError) cb.current.onError(e); };
    createClothSim(canvasRef.current, {
      scene, autoplay, look, clothRepresentText, ...(options || {}),
      onStats: s => cb.current.onStats && cb.current.onStats(s),
      onError: fail,
    }).then(sim => {
      if (!alive) { sim.destroy(); return; }
      simRef.current = sim;
      sim.setClothRepresentText(clothRepresentText);
      if (cb.current.onReady) cb.current.onReady(sim);
    }).catch(fail);
    return () => { alive = false; if (simRef.current) simRef.current.destroy(); simRef.current = null; };
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

  return createElement('div', { className, style: { position: 'relative', width: '100%', height: '100%', ...(style || {}) } },
    createElement('canvas', { ref: canvasRef, style: { width: '100%', height: '100%', display: 'block', touchAction: 'none' } }),
    error && createElement('div', {
      style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 16, textAlign: 'center', fontSize: 14 },
    }, error));
});

export default ClothSim;
