// <ClothSim />: 글자 입력칸 + 옷 시뮬레이션 화면. 서버 없이 브라우저 안에서 모두 처리한다.
//   입력 -> (LLM 에 묻기: Ollama 또는 API) -> C++ 엔진(wasm): 선택, 도면, 3D 배치, 장면 -> WebGPU 시뮬레이션
// scene 을 직접 주면 그 장면을 보여 준다 (입력칸으로 새로 만들면 바뀜).
// 입력칸을 밖(페이지)에 둘 때: showInput={false} clothRepresentText={글자} submit={누른 횟수}
// 로고: logo={이미지 주소 | File | { src, panel, x, y, width, rotation }} (주소나 파일만 주면 앞판 가슴에 놓음)
//   ref.current.setLogo(같은 값) 도 됨. 재단 도면 편집: 화면 오른쪽 위 '도면 편집' 버튼 (patternEditor="none" 이면 숨김)
//   view="pattern" 이면 3D 대신 재단 도면을 보여 줌 (3D 계산은 숨긴 채 유지). 밖의 버튼으로 바꿀 때 씀
//   도면에서 옮기면 onLogoChange(로고 값) 으로 알려 줌
//   submit 값이 바뀔 때마다 clothRepresentText 로 새로 만든다 (버튼 onClick 에서 +1). ref.current.generate(글자) 도 됨
// 옷 정보 보관함 clothData (clothdata/store.js): 만들기를 시작하면 completed=0, 옷이 다 내려앉으면 앞면, 뒷면을 찍어 completed=1.
//   로고를 옮기면 다시 찍음. 다른 페이지에서 getClothData() 또는 useClothData() 로 꺼냄. ref.current.capture() 로 직접 찍을 수도 있음
import { createElement as h, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import ClothSimView from './ClothSimView.js';
import ClothPatternEditor from './pattern/PatternEditor.js';
import { defaultLogoPlacement } from './pattern/logo.js';
import { makeLLM, textToScene } from './garment/index.js';
import { clothError, clothLog } from './garment/clothLog.js';
import { clearClothData, setClothData, getClothData, updateClothData } from './clothdata/store.js';
import { categoryFromTokens, tokensFromSpec } from './clothdata/category.js';
import { imageDataToDataURL } from './clothdata/image.js';
import { estimatePrice } from './clothdata/price.js';

const STAGE = { translate: '번역', choose: '보기 고르기', number: '치수 정하기', build: '옷 만드는 중', done: '' };

function sizeFromSpec(spec) {
  if (!spec?.tokens) return 'm';
  for (const [path, tok] of Object.entries(spec.tokens)) {
    if (path.endsWith('/size') || path === 'size') {
      const v = tok?.value ?? tok;
      if (typeof v === 'string') return v;
    }
  }
  return 'm';
}

const ClothSim = forwardRef(function ClothSim(props, ref) {
  const {
    scene: sceneProp, llm, showInput = true, defaultText = '', placeholder = '만들 옷을 적어 주세요 (예: 오버핏 후드티, 캥거루 주머니)',
    preprocess, fixed, onSpec, onScene, onLog, onProgress, onError,
    clothRepresentText, submit,
    logo: logoProp, onLogoChange, patternEditor = 'button', view = '3d', patternFocus = 'all',
    style, className, ...viewProps
  } = props;
  const viewRef = useRef(null);
  const abortRef = useRef(null);
  const [text, setText] = useState(defaultText);
  const [scene, setScene] = useState(sceneProp || null);
  const [garmentSize, setGarmentSize] = useState('m');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [dressReveal, setDressReveal] = useState(false);
  const [logo, setLogoState] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const logoChangeRef = useRef(onLogoChange);
  logoChangeRef.current = onLogoChange;
  // 로고 값 정리: 주소나 파일만 오면 장면의 앞판 가슴에 기본 위치로
  const normLogo = (v, sc) => {
    if (!v) return null;
    const isObj = typeof v === 'object' && !(typeof Blob !== 'undefined' && v instanceof Blob) && !(typeof ImageBitmap !== 'undefined' && v instanceof ImageBitmap) && !(typeof HTMLImageElement !== 'undefined' && v instanceof HTMLImageElement);
    const base = isObj ? v : { src: v };
    if (base.panel && sc && sc.meta && sc.meta.meshes.some(m => m.name === base.panel)) return base;
    const d = sc && sc.meta ? defaultLogoPlacement(sc, base.src) : null;
    return d ? { ...d, ...(isObj ? Object.fromEntries(Object.entries(base).filter(([k]) => k !== 'panel' && k !== 'x' && k !== 'y')) : {}) } : base;
  };
  const applyLogo = (v, notify) => {
    const sc = sceneRef.current;
    // 새로고침 후 장면 없이 저장한 이미지만 표시할 때는 완료된 캡처를 보존한다.
    if (sc) {
      captureSeq.current++;
      if (getClothData().completed) updateClothData({ completed: 0 });
    }
    const nl = normLogo(v, sc && sc.meta ? sc : null);
    setLogoState(nl);
    if (notify && sc && logoChangeRef.current) logoChangeRef.current(nl);
    return nl;
  };
  const sceneRef = useRef(null);
  sceneRef.current = scene;
  // 밖에서 주는 로고: 이미지나 위치가 실제로 바뀔 때만 반영 (부모가 매번 새 객체를 줘도 끌던 위치를 덮지 않게)
  const logoKey = v => {
    if (!v) return 'none';
    if (typeof v !== 'object' || (typeof Blob !== 'undefined' && v instanceof Blob)) return `src:${typeof v === 'string' ? v.length + v.slice(-32) : 'obj'}`;
    const sk = typeof v.src === 'string' ? v.src.length + v.src.slice(-32) : 'obj';
    return `src:${sk}|${v.panel}|${v.x}|${v.y}|${v.width}|${v.rotation}`;
  };
  const lastPropKey = useRef(null);
  useEffect(() => {
    if (logoProp === undefined) return;
    const k = logoKey(logoProp);
    if (k === lastPropKey.current) return;
    lastPropKey.current = k;
    if (k === logoKey(logo)) return;
    applyLogo(logoProp, true);
  }, [logoProp]);
  // 도면에서 끄는 동안은 화면만 바꾸고, 멈추면(0.25초) 밖에 알림 (부모가 매번 다시 그리지 않게)
  const notifyTimer = useRef(null);
  const editorChange = nl => {
    captureSeq.current++;
    if (getClothData().completed) updateClothData({ completed: 0 });
    setLogoState(nl);
    if (notifyTimer.current) clearTimeout(notifyTimer.current);
    notifyTimer.current = setTimeout(() => {
      notifyTimer.current = null;
      lastPropKey.current = logoKey(nl);
      if (logoChangeRef.current) logoChangeRef.current(nl);
    }, 250);
  };
  useEffect(() => () => notifyTimer.current && clearTimeout(notifyTimer.current), []);
  // 장면이 바뀌어 붙인 패널이 없어지면 기본 위치로 다시 놓음
  useEffect(() => { if (logo && scene && scene.meta && !scene.meta.meshes.some(m => m.name === logo.panel)) applyLogo({ ...logo, panel: undefined }, true); }, [scene]);
  const cb = useRef({});
  cb.current = { onSpec, onScene, onLog, onProgress, onError, llm, preprocess, fixed };

  // 옷이 다 내려앉으면 앞면, 뒷면을 찍어 clothData 에 넣음 (completed 0 -> 1)
  const specRef = useRef(null);
  const reqTextRef = useRef(sceneProp ? getClothData().text : '');
  const logoRef = useRef(null);
  logoRef.current = logo;
  const priceRef = useRef(null);       // 가격대 질문 (옷 사양이 나오자마자 시작, 캡처 때 기다림)
  const captureSeq = useRef(0);
  async function doCapture(reason) {
    const v = viewRef.current;
    if (!v || !v.captureImages || !v.sim?.settled || abortRef.current) return null;
    const seq = ++captureSeq.current;
    try {
      const shot = await v.captureImages({ views: ['front', 'back'], size: 1024 });
      if (seq !== captureSeq.current) return null;   // 그 사이 더 새 캡처가 시작됨
      const [front, back] = await Promise.all([imageDataToDataURL(shot.front), imageDataToDataURL(shot.back)]);
      if (seq !== captureSeq.current) return null;
      const previous = getClothData();
      const tokens = specRef.current ? tokensFromSpec(specRef.current) : previous.tokens;
      // Captures unlock the order form independently of the optional price API.
      const price = previous.price;
      const lg = logoRef.current;
      const rec = setClothData({
        completed: 1, front, back,
        category: tokens ? categoryFromTokens(tokens) : null,
        tokens,
        logo: lg && lg.panel ? { panel: lg.panel, x: lg.x ?? 0, y: lg.y ?? 0, width: lg.width ?? 10, rotation: lg.rotation ?? 0 } : null,
        price,
        text: reqTextRef.current,
        updatedAt: new Date().toISOString(),
      });
      clothLog('캡처 저장', { reason, category: rec.category && rec.category.id, kb: Math.round((front.length + back.length) / 1024) });
      return rec;
    } catch (e) {
      clothError('캡처 실패', e);
      return null;
    }
  }
  const onSettledRef = useRef(null);
  onSettledRef.current = () => { doCapture('settled'); };
  // 로고를 옮긴 뒤 0.8초 멈추면 내려앉은 장면을 다시 찍음.
  useEffect(() => {
    if (!viewRef.current?.sim?.settled) return undefined;
    const t = setTimeout(() => doCapture('logo'), 800);
    return () => clearTimeout(t);
  }, [logo && logo.panel, logo && logo.x, logo && logo.y, logo && logo.width, logo && logo.rotation, logo && logo.src]);

  useEffect(() => { if (sceneProp) setScene(sceneProp); }, [sceneProp]);
  useEffect(() => () => { captureSeq.current++; abortRef.current?.abort(); }, []);
  // 밖의 전달 버튼: submit 이 바뀌면 그때의 clothRepresentText 로 만들기
  const lastSubmit = useRef(submit);
  useEffect(() => {
    if (submit === undefined || submit === lastSubmit.current) return;
    lastSubmit.current = submit;
    setDressReveal(false);
    generate(String(clothRepresentText ?? ''));
  }, [submit]);

  async function generate(t) {
    const req = (t ?? text).trim();
    if (!req) return null;
    if (abortRef.current) abortRef.current.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    // 수정 요청 중에는 기존 3D를 유지하고 새 장면이 완성되면 교체합니다.
    setBusy(true); setError(null); setStatus('준비');
    captureSeq.current++; specRef.current = null; reqTextRef.current = req; priceRef.current = null;
    clearClothData({ text: req });
    const c = cb.current;
    clothLog('generate 시작', req);
    const introOpt = props.options && props.options.bodyPoseIntro;
    // 옷 입히기 빌드 포즈: buildPose > from > arms_up (attention 은 intro 끝 목표일 때만 to)
    const bodyPose = introOpt
      ? (typeof introOpt === 'object' && (introOpt.buildPose || introOpt.from)) || 'arms_up'
      : undefined;
    try {
      const { spec, scene: sc } = await textToScene(req, {
        bodyPose,
        llm: makeLLM({
          ...(c.llm || {}),
          onLog: line => {
            console.log('[ClothSim][LLM]', line);
            if (c.onLog) c.onLog(line);
          },
        }),
        preprocess: c.preprocess, fixed: c.fixed, signal: ctl.signal,
        onTokenLog: c.onLog ? line => c.onLog(`[tokens] ${line}`) : undefined,
        onStep: s => {
          if (ctl.signal.aborted) return;
          setStatus(STAGE[s.stage] !== undefined ? `${STAGE[s.stage]}${s.count ? ` (${s.count})` : ''}` : s.stage);
          if (c.onProgress) c.onProgress(s);
        },
      });
      if (ctl.signal.aborted) return null;
      specRef.current = spec;
      {
        // 가격대 질문은 옷이 내려앉는 동안 미리 보냄 (배포 사이트: Worker, 내 컴퓨터: Ollama)
        const tk = tokensFromSpec(spec);
        const priceLLM = makeLLM({ ...(c.llm || {}), onLog: line => { if (c.onLog) c.onLog(line); } });
        priceRef.current = estimatePrice(priceLLM, tk, categoryFromTokens(tk), req, ctl.signal)
          .then(r => {
            // A late price must never overwrite a newer design or its captures.
            if (!ctl.signal.aborted && specRef.current === spec && getClothData().text === req) updateClothData({ price: r });
            clothLog('가격대', r); return r;
          })
          .catch(e => { if (!ctl.signal.aborted) clothError('가격대 질문 실패', e); return null; });
      }
      setScene(sc); setStatus('');
      setGarmentSize(sizeFromSpec(spec));
      if (c.onSpec) c.onSpec(spec);
      if (c.onScene) c.onScene(sc);
      clothLog('generate 완료');
      return { spec, scene: sc };
    } catch (e) {
      if (ctl.signal.aborted) { setStatus('취소됨'); clothLog('generate 취소'); return null; }
      clothError('generate 실패', e);
      setError(String(e && e.message || e)); setStatus('');
      if (c.onError) c.onError(e);
      return null;
    } finally {
      if (abortRef.current === ctl) { abortRef.current = null; setBusy(false); }
    }
  }

  useImperativeHandle(ref, () => ({
    generate,
    cancel: () => abortRef.current && abortRef.current.abort(),
    play: () => viewRef.current && viewRef.current.play(),
    pause: () => viewRef.current && viewRef.current.pause(),
    reset: () => viewRef.current && viewRef.current.reset(),
    set: (k, v) => viewRef.current && viewRef.current.set(k, v),
    stats: () => (viewRef.current ? viewRef.current.stats() : Promise.resolve(null)),
    get sim() { return viewRef.current && viewRef.current.sim; },
    setLogo: v => applyLogo(v, true),
    getLogo: () => logo,
    // 내려앉은 3D 장면을 앞면, 뒷면으로 찍어 보관함에 넣음. 준비 전에는 null.
    capture: () => doCapture('manual'),
    getClothData,
    openPatternEditor: (open = true) => setEditorOpen(!!open),
  }));

  const bar = showInput && h('form', {
    onSubmit: e => { e.preventDefault(); generate(); },
    style: { display: 'flex', gap: 8, padding: 8, alignItems: 'center', flex: '0 0 auto' },
  },
    h('input', {
      type: 'text', value: text, placeholder, disabled: busy,
      onChange: e => setText(e.target.value),
      style: { flex: 1, minWidth: 0, padding: '8px 10px', fontSize: 14, border: '1px solid #8886', borderRadius: 6, background: 'transparent', color: 'inherit' },
    }),
    busy
      ? h('button', { type: 'button', onClick: () => abortRef.current && abortRef.current.abort(), style: btn }, '취소')
      : h('button', { type: 'submit', disabled: !text.trim(), style: btn }, '만들기'),
    (status || error) && h('span', { style: { fontSize: 13, opacity: 0.8, color: error ? '#d33' : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '40%' }, title: error || status }, error || status));

  const userOpts = viewProps.options || {};
  const intro = userOpts.bodyPoseIntro;
  const showDressReveal = !!(intro && intro.showDressReveal);
  const viewOptions = {
    ...userOpts,
    onSettled: info => {
      if (onSettledRef.current) onSettledRef.current(info);
      if (typeof userOpts.onSettled === 'function') userOpts.onSettled(info);
    },
    ...(intro
      ? {
        bodyPoseIntro: { ...intro, size: garmentSize },
        onBodyPoseIntroComplete: () => {
          if (showDressReveal) setDressReveal(true);
          if (typeof userOpts.onBodyPoseIntroComplete === 'function') userOpts.onBodyPoseIntroComplete();
        },
      }
      : userOpts.bodyPoseCycle
        ? { bodyPoseCycle: { ...userOpts.bodyPoseCycle, size: userOpts.bodyPoseCycle.size || garmentSize } }
        : {}),
  };
  const revealLabel = String(clothRepresentText ?? text).trim().slice(0, 48) || '입기 완료';

  return h('div', { className, style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', ...(style || {}) } },
    bar,
    h('div', { style: { position: 'relative', flex: '1 1 auto', minHeight: 0 } },
      scene
        ? h(ClothSimView, { ref: viewRef, scene, clothRepresentText, ...viewProps, options: viewOptions, logo })
        : h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 14, opacity: 0.6 } },
          busy ? status : (showInput ? '옷을 적고 만들기를 누르세요' : '')),
      dressReveal && showDressReveal && h('div', {
        role: 'status', 'aria-live': 'polite',
        style: { position: 'absolute', inset: 0, zIndex: 3, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(23,35,47,.42)', pointerEvents: 'none' },
      }, h('div', {
        style: { width: 'min(92%, 220px)', padding: '14px 16px', borderRadius: 20, background: '#fff', boxShadow: '0 18px 48px rgba(23,35,47,.18)', textAlign: 'center' },
      }, h('p', { style: { margin: '0 0 8px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#56616d' } }, '입기 완료'),
        h('p', { style: { margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: '#17232f' } }, revealLabel))),
      // 재단 도면 편집 (로고 옮기기, 크기, 회전)
      scene && scene.meta && patternEditor !== 'none' && !editorOpen && view !== 'pattern' && h('button', {
        type: 'button', onClick: () => setEditorOpen(true),
        style: { position: 'absolute', right: 10, top: 10, zIndex: 4, padding: '6px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #0002', background: '#fffd', color: '#17232f', cursor: 'pointer' },
      }, '도면 편집'),
      scene && scene.meta && (editorOpen || view === 'pattern') && h('div', {
        className: 'cloth-pattern-workspace', style: { position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', background: '#f3f5f8' },
      },
        h('div', { className: 'cloth-pattern-instructions', style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 12, color: '#17232f', borderBottom: '1px solid #0001' } },
          h('span', { style: { flex: 1 } }, logo ? '로고를 끌어 옮기고, 로고 위에서 휠로 크기, Shift+휠로 회전. 빈 곳은 끌기로 이동, 휠로 확대' : '로고 이미지를 먼저 넣어 주세요'),
          view !== 'pattern' && h('button', { type: 'button', onClick: () => setEditorOpen(false), style: { ...btn, padding: '4px 10px', fontSize: 12 } }, '3D 보기')),
        h('div', { style: { position: 'relative', flex: '1 1 auto', minHeight: 0 } },
          h(ClothPatternEditor, { scene, logo, onChange: editorChange, focus: patternFocus }))),
      // 입력칸이 밖에 있을 때 진행 상태와 오류는 화면 위에 작게
      !showInput && (status || error) && h('div', {
        style: { position: 'absolute', left: 8, top: 8, padding: '4px 8px', fontSize: 12, borderRadius: 4, background: '#0008', color: error ? '#f88' : '#fff', maxWidth: 'calc(100% - 16px)' },
      }, error || status)));
});

const btn = { padding: '8px 14px', fontSize: 14, borderRadius: 6, border: '1px solid #8886', cursor: 'pointer' };

export default ClothSim;
