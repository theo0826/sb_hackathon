// <ClothSim />: 글자 입력칸 + 옷 시뮬레이션 화면. 서버 없이 브라우저 안에서 모두 처리한다.
//   입력 -> (LLM 에 묻기: Ollama 또는 API) -> C++ 엔진(wasm): 선택, 도면, 3D 배치, 장면 -> WebGPU 시뮬레이션
// scene 을 직접 주면 그 장면을 보여 준다 (입력칸으로 새로 만들면 바뀜).
// 입력칸을 밖(페이지)에 둘 때: showInput={false} clothRepresentText={글자} submit={누른 횟수}
//   submit 값이 바뀔 때마다 clothRepresentText 로 새로 만든다 (버튼 onClick 에서 +1). ref.current.generate(글자) 도 됨
import { createElement as h, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import ClothSimView from './ClothSimView.js';
import { makeLLM, textToScene } from './garment/index.js';
import { clothError, clothLog } from './garment/clothLog.js';

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
  const cb = useRef({});
  cb.current = { onSpec, onScene, onLog, onProgress, onError, llm, preprocess, fixed };

  useEffect(() => { if (sceneProp) setScene(sceneProp); }, [sceneProp]);
  useEffect(() => () => abortRef.current && abortRef.current.abort(), []);
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
    setBusy(true); setError(null); setStatus('준비');
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
        onStep: s => {
          if (ctl.signal.aborted) return;
          setStatus(STAGE[s.stage] !== undefined ? `${STAGE[s.stage]}${s.count ? ` (${s.count})` : ''}` : s.stage);
          if (c.onProgress) c.onProgress(s);
        },
      });
      if (ctl.signal.aborted) return null;
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
        ? h(ClothSimView, { ref: viewRef, scene, clothRepresentText, ...viewProps, options: viewOptions })
        : h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 14, opacity: 0.6 } },
          busy ? status : (showInput ? '옷을 적고 만들기를 누르세요' : '')),
      dressReveal && showDressReveal && h('div', {
        role: 'status', 'aria-live': 'polite',
        style: { position: 'absolute', inset: 0, zIndex: 3, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(23,35,47,.42)', pointerEvents: 'none' },
      }, h('div', {
        style: { width: 'min(92%, 220px)', padding: '14px 16px', borderRadius: 20, background: '#fff', boxShadow: '0 18px 48px rgba(23,35,47,.18)', textAlign: 'center' },
      }, h('p', { style: { margin: '0 0 8px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#56616d' } }, '입기 완료'),
        h('p', { style: { margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: '#17232f' } }, revealLabel))),
      // 입력칸이 밖에 있을 때 진행 상태와 오류는 화면 위에 작게
      !showInput && (status || error) && h('div', {
        style: { position: 'absolute', left: 8, top: 8, padding: '4px 8px', fontSize: 12, borderRadius: 4, background: '#0008', color: error ? '#f88' : '#fff', maxWidth: 'calc(100% - 16px)' },
      }, error || status)));
});

const btn = { padding: '8px 14px', fontSize: 14, borderRadius: 6, border: '1px solid #8886', cursor: 'pointer' };

export default ClothSim;
