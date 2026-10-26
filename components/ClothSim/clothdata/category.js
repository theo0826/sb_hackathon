// 큰 카테고리 이름 (팀 가격표 lib/garment-pricing.ts 의 id 에 맞춤, 셔츠는 새로 추가)
// 엔진 트리에는 후드, 셔츠 같은 칸이 없어서 고른 값(목, 소매 길이, 여밈, 원단)으로 정한다. 위에서부터 먼저 맞는 것
//   목 hood                                         -> 후드 (hoodie)
//   원단 nylon_taslan + 앞 지퍼(full_zip, half_zip)  -> 바람막이 (windbreaker)
//   목 shirt_collar + 단추 여밈(button_front)        -> 셔츠 (shirt)
//   목 crew + 긴팔 + 원단 french_terry, brushed_fleece -> 맨투맨 (sweatshirt)
//   긴팔 (long)                                     -> 긴팔 (long-sleeve)
//   그 밖                                           -> 반팔 (tee)
// 과잠은 아직 구분하지 않음
export const CATEGORY_LABELS = { hoodie: '후드', windbreaker: '바람막이', shirt: '셔츠', sweatshirt: '맨투맨', 'long-sleeve': '긴팔', tee: '반팔' };

// spec.tokens ({ '경로': { value, label, ... } }) -> { 마지막 이름: 값 }. 같은 이름이 여러 번 나오면 처음 것
export function tokensFromSpec(spec) {
  const out = {};
  const t = spec && spec.tokens;
  if (!t || typeof t !== 'object') return out;
  for (const [path, tok] of Object.entries(t)) {
    const name = String(path).split('/').pop();
    if (!name || name in out) continue;
    const v = tok && typeof tok === 'object' && 'value' in tok ? tok.value : tok;
    if (v === undefined || v === null || typeof v === 'object') continue;
    out[name] = v;
  }
  return out;
}

export function categoryFromTokens(tk) {
  if (!tk) return null;
  const neck = tk.neck, closure = tk.closure, len = tk.sleeve_length;
  const material = tk.material || tk.upper_material;
  let id;
  if (neck === 'hood') id = 'hoodie';
  else if (material === 'nylon_taslan' && (closure === 'full_zip' || closure === 'half_zip')) id = 'windbreaker';
  else if (neck === 'shirt_collar' && closure === 'button_front') id = 'shirt';
  else if (neck === 'crew' && len === 'long' && (material === 'french_terry' || material === 'brushed_fleece')) id = 'sweatshirt';
  else if (len === 'long') id = 'long-sleeve';
  else id = 'tee';
  return { id, label: CATEGORY_LABELS[id] };
}
