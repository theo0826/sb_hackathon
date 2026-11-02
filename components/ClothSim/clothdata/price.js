// 1벌당 제작 단가(인쇄 포함) 가격대.
// 2026-10-31 (Set 결정): 카테고리, 원단별 가격표로 기본 가격대를 정하고, LLM 은 기본 가격대 앞뒤 두 단계 안에서만 고르게 한다.
//   전에는 기준 없이 7개 중 하나를 고르게 해서 가죽, 패딩 아우터도 티셔츠 가격대(1~2만원)로 몰렸음 (시험 round_02)
//   질문은 정순, 역순 두 번 묻고 평균 (앞 보기 쏠림 상쇄), 기본 가격대 쪽으로 약하게 끌어당김
// 배포 사이트는 Worker(/decide, Decision-1), 내 컴퓨터는 Ollama 가 같은 질문을 받는다 (garment/llm.js 의 choose).
// 결과: { label: '1~1.5만원', min: 10000, max: 15000, probability: 0.62, base: '1~1.5만원' } 또는 실패 시 null
//   LLM 이 실패하면 기본 가격대를 그대로 (probability null)
export const PRICE_BANDS = [
  { label: '1만원 미만', min: 0, max: 10000, text: 'Under 10,000 KRW' },
  { label: '1~1.5만원', min: 10000, max: 15000, text: '10,000 to 15,000 KRW' },
  { label: '1.5~2만원', min: 15000, max: 20000, text: '15,000 to 20,000 KRW' },
  { label: '2~3만원', min: 20000, max: 30000, text: '20,000 to 30,000 KRW' },
  { label: '3~4만원', min: 30000, max: 40000, text: '30,000 to 40,000 KRW' },
  { label: '4~6만원', min: 40000, max: 60000, text: '40,000 to 60,000 KRW' },
  { label: '6만원 이상', min: 60000, max: null, text: '60,000 KRW or more' },
];
// ---- 가격표 (추정값, 2026-10-31. 국내 단체 주문 제작 단가 인쇄 포함 기준을 어림한 값) ----
// 카테고리별 기본 가격대 번호 (PRICE_BANDS 의 순서: 0 1만원 미만 ... 6 6만원 이상)
export const BASE_BAND = {
  tee: 1, sleeveless: 1,                       // 면 반팔, 민소매: 1~1.5만원
  'long-sleeve': 2, polo: 2,                    // 긴팔 티, 피케 폴로: 1.5~2만원
  sweatshirt: 3, shirt: 3, vest: 3,             // 맨투맨, 셔츠, 조끼: 2~3만원
  hoodie: 4, knit: 4, cardigan: 4, windbreaker: 4,   // 후드, 니트, 가디건, 바람막이: 3~4만원
  jacket: 5,                                    // 자켓: 4~6만원
  coat: 6,                                      // 코트: 6만원 이상
};
// 원단별 가산 (단계). 표에 없는 원단은 0
export const MATERIAL_STEP = {
  leather: 2, suede: 2, faux_leather: 1, wool_tweed: 1, velvet: 1, silk_satin: 1, heavy_sweat_fleece: 1, wool_knit: 0,
};
// 패딩, 안감 가산
const INSULATION_STEP = { light_padding: 1, channel_quilt: 1, diamond_quilt: 1, heavy_down: 2 };
const LINING_STEP = { full: 1, sherpa: 1, quilted: 1, fleece: 1, half: 0, mesh: 0 };
// LLM 결과에 곱하는 끌어당김 (기본 가격대에서 -2 ... +2 단계)
const PULL = [0.1, 0.25, 0.3, 0.25, 0.1];

export function baseBand(tokens, category) {
  const tk = tokens || {};
  let b = BASE_BAND[category && category.id] ?? 2;
  const material = tk.material || tk.upper_material;
  const outer = ['jacket', 'coat', 'windbreaker', 'vest'].includes(category && category.id);
  // 니트 카테고리는 이미 울 니트 기준이라 원단 가산을 중복하지 않음
  if (!(category && (category.id === 'knit' || category.id === 'cardigan'))) b += MATERIAL_STEP[material] || 0;
  b += INSULATION_STEP[tk.insulation] || 0;
  if (outer) b += LINING_STEP[tk.lining] || 0;
  return Math.max(0, Math.min(PRICE_BANDS.length - 1, b));
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SKIP = new Set(['category', 'size', 'thread_color', 'neck_label', 'seam_type', 'topstitch']);

// 가격대 보기 idx (PRICE_BANDS 번호 목록) 로 결정 질문 하나. reverse 면 보기 순서를 뒤집음
export function priceQuestion(tokens, category, text, idx = PRICE_BANDS.map((_, i) => i), reverse = false) {
  const KEY = ['material', 'upper_material', 'insulation', 'lining', 'closure', 'neck', 'sleeve', 'sleeve_length', 'fit', 'surface_pattern', 'finish', 'decoration', 'pocket', 'hood_lining'];
  const tk = tokens || {};
  // 가격에 영향이 큰 값만 (전에는 고른 값 수십 개를 모두 나열해 중요한 값이 묻혔음)
  const props = KEY.filter(k => tk[k] !== undefined && tk[k] !== 'none').map(k => `${k}=${tk[k]}`).join(', ');
  const context = `Customer request: "${String(text || '').slice(0, 200)}"\n` +
    `Garment type: ${category ? category.id : 'top'}\n` +
    `Garment specification: ${props}`;
  const question = 'Estimated production cost per garment in South Korea for a custom group order, including printing (KRW)';
  const order = reverse ? [...idx].reverse() : idx;
  const options = order.map(i => PRICE_BANDS[i].text);
  let prompt = `${context}\n\n${question}\n\n`;
  options.forEach((o, i) => { prompt += `${LETTERS[i]}) ${o}\n`; });
  prompt += '\nAnswer with a single letter.';
  return { kind: 'choose', path: 'price', n: options.length, prompt, context, question, options, order };
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
  if (!tokens) return null;
  const base = baseBand(tokens, category);
  const pack = (bi, p) => { const b = PRICE_BANDS[bi]; return { label: b.label, min: b.min, max: b.max, probability: p, base: PRICE_BANDS[base].label }; };
  // 2026-10-31 (Set 위임): 창을 기본 가격대 기준 대칭으로 (끝 가격대 가까이에서는 좁힘).
  //   전에는 기본이 '6만원 이상' 이면 보기가 아래쪽(2~3, 3~4, 4~6만원)뿐이라 LLM 이 내리는 쪽으로만 움직일 수 있었고,
  //   코트, 인조가죽, 패딩 자켓이 모두 4~6만원으로 내려갔음 (시험 round_03). 대칭이면 내릴 수 있는 만큼 올릴 수도 있음.
  //   '6만원 이상', '1만원 미만' 은 끝이 열린 구간이라 그 자체가 표의 결론 -> LLM 보정 없음
  const k = Math.min(2, base, PRICE_BANDS.length - 1 - base);
  const idx = [];
  for (let d = -k; d <= k; d++) idx.push(base + d);
  if (idx.length === 1) return pack(base, null);
  if (!llm || !llm.choose) return pack(base, null);
  const acc = new Map(idx.map(i => [i, 0]));
  let ok = 0;
  for (const reverse of [false, true]) {
    const q = priceQuestion(tokens, category, text, idx, reverse);
    let a;
    try { a = await llm.choose(q, signal); } catch (e) { if (signal && signal.aborted) throw e; continue; }
    const probs = probsFromAnswer(a, q.n);
    if (!probs) continue;
    q.order.forEach((band, j) => acc.set(band, acc.get(band) + probs[j]));
    ok++;
  }
  if (!ok) return pack(base, null);
  let best = base, bestV = -1, sum = 0;
  for (const [band, v] of acc) {
    const w = (v / ok) * PULL[band - base + 2];
    acc.set(band, w); sum += w;
  }
  for (const [band, w] of acc) if (w > bestV) { bestV = w; best = band; }
  return pack(best, sum > 0 ? Math.round(bestV / sum * 1000) / 1000 : null);
}
