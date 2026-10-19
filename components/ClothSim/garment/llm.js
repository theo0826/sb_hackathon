// LLM 연결 (브라우저 fetch). 기본은 Ollama (내 컴퓨터 http://localhost:11434), 아니면 OpenAI 형식 API.
// C++ 엔진이 내주는 질문을 그대로 보내고, 받은 것을 가공 없이 돌려준다 (확률 계산은 C++ 에서).
//   질문 {kind:"choose", prompt}            -> {tops:[{token, logprob}], content?}
//   질문 {kind:"generate", prompt, system?, schema?} -> {text} (실패하면 {error})
//
// 주의
//  - Ollama 를 다른 주소(배포한 사이트)에서 부르려면 Ollama 쪽에 OLLAMA_ORIGINS 설정이 필요 (README)
//  - API 키를 프론트에 넣으면 사용자에게 보인다. 테스트용으로만 (실서비스는 키를 숨기는 중계가 필요)
//  - 실패는 console.error 와 onLog 로 남긴다 (Python 의 logs/llm.log 대신)

export const LLM_DEFAULTS = {
  backend: 'ollama',                         // 'ollama' | 'api'
  host: 'http://localhost:11434',            // Ollama 주소
  model: 'qwen3-vl:8b-instruct',             // Ollama 모델
  numCtx: 8192,
  keepAlive: '10m',
  timeoutMs: 600000,
  // API (OpenAI 형식 /chat/completions). 비워 두고 나중에 채움 (Cursor 방식)
  baseUrl: '',
  apiModel: '',
  apiKey: '',
};

function logFail(cfg, what, err) {
  const line = `${new Date().toISOString()} [${cfg.backend}] ${cfg.backend === 'api' ? cfg.baseUrl : cfg.host} ` +
    `${cfg.backend === 'api' ? cfg.apiModel : cfg.model} ${what} 실패: ${err && err.message || err}`;
  console.error(line);
  if (cfg.onLog) cfg.onLog(line);
}

async function post(cfg, url, payload, headers, signal) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new Error('시간 초과')), cfg.timeoutMs);
  const onAbort = () => ctl.abort(signal.reason);
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  try {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      body: JSON.stringify(payload), signal: ctl.signal,
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 300)}`);
    const d = JSON.parse(text);
    if (d && d.error) throw new Error(typeof d.error === 'string' ? d.error : JSON.stringify(d.error));
    return d;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

export function makeLLM(options) {
  const cfg = { ...LLM_DEFAULTS, ...(options || {}) };
  const name = cfg.backend === 'api' ? cfg.apiModel : cfg.model;

  async function ollamaChat(prompt, system, extra, signal) {
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });
    const { options: o, ...rest } = extra || {};
    return post(cfg, cfg.host.replace(/\/+$/, '') + '/api/chat', {
      model: cfg.model, messages, stream: false, keep_alive: cfg.keepAlive,
      options: { num_ctx: cfg.numCtx, temperature: 0, ...(o || {}) }, ...rest,
    }, null, signal);
  }

  async function apiChat(prompt, system, extra, signal) {
    if (!cfg.baseUrl || !cfg.apiModel) throw new Error('API 설정이 비어 있음: baseUrl, apiModel (키는 apiKey) 를 채워 주세요');
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });
    return post(cfg, cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions',
      { model: cfg.apiModel, messages, temperature: 0, ...(extra || {}) },
      cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : null, signal);
  }

  async function choose(q, signal) {
    try {
      if (cfg.backend === 'api') {
        const d = await apiChat(q.prompt, null, { logprobs: true, top_logprobs: 20, max_tokens: 1 }, signal);
        const ch = (d.choices || [])[0] || {};
        const lp = ((ch.logprobs || {}).content || [])[0] || {};
        return { tops: lp.top_logprobs || [], content: (ch.message || {}).content || '' };
      }
      const d = await ollamaChat(q.prompt, null, { logprobs: true, top_logprobs: 20, options: { num_predict: 1 } }, signal);
      const lp = (d.logprobs || [])[0] || {};
      return { tops: lp.top_logprobs || [{ token: lp.token || '', logprob: lp.logprob || 0 }] };
    } catch (e) {
      logFail(cfg, '보기 고르기', e);
      throw e;   // Python 과 같이 멈춘다
    }
  }

  async function generate(q, signal) {
    try {
      if (cfg.backend === 'api') {
        let d;
        if (q.schema) {
          try {
            d = await apiChat(q.prompt, q.system, { response_format: { type: 'json_schema', json_schema: { name: 'answer', schema: q.schema, strict: false } } }, signal);
          } catch (e) {
            if (signal && signal.aborted) throw e;
            d = await apiChat(q.prompt + '\n\nAnswer with JSON only.', q.system, null, signal);   // json_schema 를 모르는 서비스
          }
        } else d = await apiChat(q.prompt, q.system, null, signal);
        return { text: (((d.choices || [])[0] || {}).message || {}).content || '' };
      }
      const d = await ollamaChat(q.prompt, q.system, q.schema ? { format: q.schema } : null, signal);
      return { text: (d.message || {}).content || '' };
    } catch (e) {
      if (signal && signal.aborted) throw e;
      logFail(cfg, q.purpose === 'translate' ? '번역' : '수치 생성', e);
      return { error: String(e && e.message || e) };   // 수치는 기본값으로, 번역은 C++ 가 오류로 알림
    }
  }

  return { name, config: cfg, choose, generate };
}
