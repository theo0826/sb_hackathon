// 1벌당 제작 단가(인쇄 포함) 가격대: 옷 정보(카테고리, 고른 값)를 결정 질문 하나로 보내 가장 확률 높은 가격대를 고른다.
// 배포 사이트는 Worker(/decide, Decision-1), 내 컴퓨터는 Ollama 가 같은 질문을 받는다 (garment/llm.js 의 choose).
// 기준 가격(앵커)은 주지 않음. 결과: { label: '1~1.5만원', min: 10000, max: 15000, probability: 0.62 } 또는 실패 시 null
export const PRICE_BANDS = [
  { label: '1만원 미만', min: 0, max: 10000, text: 'Under 10,000 KRW' },
  { label: '1~1.5만원', min: 10000, max: 15000, text: '10,000 to 15,000 KRW' },
  { label: '1.5~2만원', min: 15000, max: 20000, text: '15,000 to 20,000 KRW' },
  { label: '2~3만원', min: 20000, max: 30000, text: '20,000 to 30,000 KRW' },
  { label: '3~4만원', min: 30000, max: 40000, text: '30,000 to 40,000 KRW' },
  { label: '4~6만원', min: 40000, max: 60000, text: '40,000 to 60,000 KRW' },
  { label: '6만원 이상', min: 60000, max: null, text: '60,000 KRW or more' },
];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SKIP = new Set(['category', 'size', 'thread_color', 'neck_label', 'seam_type', 'topstitch']);

export function priceQuestion(tokens, category, text) {
  const props = Object.entries(tokens || {}).filter(([k]) => !SKIP.has(k)).map(([k, v]) => `${k}=${v}`).join(', ');
  const context = `Customer request: "${String(text || '').slice(0, 200)}"\n` +
    `Garment type: ${category ? category.id : 'top'}\n` +
    `Garment specification: ${props}`;
  const question = 'Estimated production cost per garment in South Korea for a custom group order, including printing (KRW)';
  const options = PRICE_BANDS.map(b => b.text);
  let prompt = `${context}\n\n${question}\n\n`;
  options.forEach((o, i) => { prompt += `${LETTERS[i]}) ${o}\n`; });
  prompt += '\nAnswer with a single letter.';
  return { kind: 'choose', path: 'price', n: options.length, prompt, context, question, options };
}

// 엔진(select.cpp probs_from_answer)과 같은 규칙: 상위 후보의 글자별 확률을 모아 정규화, 없으면 답한 글자
function probsFromAnswer(a, n) {
  const p = new Array(n).fill(0);
  for (const t of (a && a.tops) || []) {
    const tok = String(t.token || '').trim().replace(/[).]+$/, '').toUpperCase();
    const k = tok.length === 1 ? LETTERS.indexOf(tok) : -1;
    if (k >= 0 && k < n) p[k] += Math.exp(Number.isFinite(t.logprob) ? t.logprob : -50);
  }
  const s = p.reduce((x, y) => x + y, 0);
  if (s > 0) return p.map(v => v / s);
  const c = String((a && a.content) || '').trim().charAt(0).toUpperCase();
  const k = LETTERS.indexOf(c);
  if (c && k >= 0 && k < n) return p.map((_, i) => (i === k ? 1 : 0));
  return null;
}

export async function estimatePrice(llm, tokens, category, text, signal) {
  if (!llm || !llm.choose || !tokens) return null;
  const q = priceQuestion(tokens, category, text);
  const a = await llm.choose(q, signal);
  const probs = probsFromAnswer(a, q.n);
  if (!probs) return null;
  let k = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[k]) k = i;
  const b = PRICE_BANDS[k];
  return { label: b.label, min: b.min, max: b.max, probability: Math.round(probs[k] * 1000) / 1000 };
}
