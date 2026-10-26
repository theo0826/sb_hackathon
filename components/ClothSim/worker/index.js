// Cloudflare Worker: clothsim-api (https://clothsim-api.set35230.workers.dev)
// 이 파일 내용을 Cloudflare 대시보드의 Worker 'Edit code' 에 그대로 붙여 넣고 Deploy.
// 비밀값 (Settings -> Variables and Secrets, 종류 Secret):
//   OPENROUTER_API_KEY : 결정 모델 (OpenRouter, Microsoft-Decision-1)
//   OPENAI_API_KEY     : 생성 모델 (OpenAI, gpt-5-nano)
// 주소
//   POST /decide   { context, question, options: ['라벨: 설명', ...] } -> { probabilities: { A: 0.7, B: 0.3 }, choice, keys }
//   POST /generate { prompt, system?, schema? }                       -> { text }
// 막는 장치: 허용한 출처(Origin)만, 모델 고정, 요청 크기와 출력 길이 상한.
// 출처 확인은 브라우저 요청만 막으므로, OpenRouter 와 OpenAI 쪽에 월 사용 한도를 낮게 걸어 둘 것.

const ALLOWED_ORIGINS = ['https://theo0826.github.io', 'http://localhost:3000', 'http://127.0.0.1:3000'];
const DECIDE_MODEL = 'microsoft/microsoft-decision-1';
const GENERATE_MODEL = 'gpt-5-nano';
const MAX_BODY = 32000;        // 요청 글자 수 상한
const MAX_OUTPUT = 2000;       // 생성 출력 토큰 상한 (추론 토큰 포함)
const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = ALLOWED_ORIGINS.includes(origin) ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    } : null;
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...(cors || {}) } });
    if (request.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    if (!cors) return json({ error: 'origin not allowed' }, 403);
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: 'request too large' }, 413);
    let body;
    try { body = JSON.parse(text); } catch (_) { return json({ error: 'bad json' }, 400); }
    const path = new URL(request.url).pathname;
    try {
      if (path === '/decide') return json(await decide(body, env));
      if (path === '/generate') return json(await generate(body, env));
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 502);
    }
  },
};

async function decide(b, env) {
  const options = Array.isArray(b.options) ? b.options.slice(0, KEYS.length) : [];
  if (options.length < 2) throw new Error('options must have 2 or more items');
  const criteria = {};
  options.forEach((o, i) => { criteria[KEYS[i]] = String(o).slice(0, 600); });
  const r = await fetch('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: DECIDE_MODEL,
      state: { context: String(b.context || '').slice(0, 12000) },
      questions: { q: { type: 'choice', instructions: String(b.question || 'Choose the best option.').slice(0, 1000), criteria } },
    }),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d) throw new Error(`decide ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
  const a = (d.answers && d.answers.q) || {};
  return { probabilities: a.probabilities || null, choice: a.choice || null, keys: KEYS.slice(0, options.length).split(''), usage: d.usage || null };
}

async function generate(b, env) {
  const messages = [];
  if (b.system) messages.push({ role: 'system', content: String(b.system).slice(0, 8000) });
  messages.push({ role: 'user', content: String(b.prompt || '').slice(0, 16000) });
  // gpt-5-nano 는 temperature 를 바꿀 수 없어서 보내지 않음. 추론은 가장 짧게
  const payload = { model: GENERATE_MODEL, messages, reasoning_effort: 'minimal', max_completion_tokens: MAX_OUTPUT };
  if (b.schema && typeof b.schema === 'object') payload.response_format = { type: 'json_schema', json_schema: { name: 'answer', schema: b.schema, strict: false } };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d) throw new Error(`generate ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
  const msg = (d.choices && d.choices[0] && d.choices[0].message) || {};
  return { text: msg.content || '', usage: d.usage || null };
}
