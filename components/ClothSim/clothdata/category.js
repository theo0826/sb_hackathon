// 큰 카테고리 이름 (팀 가격표 lib/garment-pricing.ts 의 id 에 맞춤, 셔츠는 새로 추가)
// 엔진 트리에는 후드, 셔츠 같은 칸이 없어서 고른 값(목, 소매, 여밈, 원단)으로 정한다. 위에서부터 먼저 맞는 것
// 2026-10-31 칸 추가 (Set: "칸은 맘껏 추가해도 된다", 기존 칸은 그대로): 가디건, 자켓, 폴로, 니트, 조끼, 민소매
//   목 hood                                              -> 후드 (hoodie)
//   니트 원단(wool_knit) + 앞 여밈                          -> 가디건 (cardigan)            [추가]
//   자켓 (소매 있음 + 앞 여밈 + 아래 중 하나)                 -> 자켓 (jacket)                [추가]
//     라이더, 노치드 라펠, 숄 칼라 / 가죽, 인조가죽, 스웨이드, 울 트위드 원단 / 패딩(insulation) / 더블, 토글 여밈
//   원단 nylon_taslan + 앞 지퍼(full_zip, half_zip)        -> 바람막이 (windbreaker)
//   목 shirt_collar + 앞이 끝까지 열리는 여밈              -> 셔츠 (shirt)   [2026-10-31: 단추만 -> 앞여밈 전체]
//   목 polo                                              -> 폴로 (polo)                  [추가]
//   목 crew + 긴팔 + 스웨트 원단 (french_terry, brushed_fleece, polyester_fleece, heavy_sweat_fleece) -> 맨투맨 (sweatshirt)  [원단 2개 추가]
//   니트 원단(wool_knit) + 소매 있음                        -> 니트 (knit)                  [추가]
//   민소매 + 앞 여밈                                       -> 조끼 (vest)                  [추가]
//   민소매                                                -> 민소매 (sleeveless)          [추가]
//   긴팔(long) 또는 칠부(three_quarter)                     -> 긴팔 (long-sleeve)           [칠부 추가]
//   그 밖                                                 -> 반팔 (tee)
// 2026-10-31 추가: 요청 문장(text)을 함께 주면, 문장이 옷 종류를 직접 말할 때 그것을 먼저 따름 (후드 다음)
//   바람막이, 아노락 -> 바람막이 / 조끼, 베스트 -> 조끼 / 코트, 트렌치 -> 코트 (새 칸) / 자켓, 재킷, 점퍼, 블루종, 블레이저, 파카, 패딩 -> 자켓 / 가디건 -> 가디건
//   맨투맨, 스웻셔츠 -> 맨투맨 / 니트, 스웨터 -> 니트 (2026-10-31)
//   (round_02: 소프트쉘 자켓, 트렌치 코트처럼 원단이나 목이 자켓 조건에 안 맞으면 긴팔로 나왔음)
// 과잠은 아직 구분하지 않음
export const CATEGORY_LABELS = { hoodie: '후드', cardigan: '가디건', coat: '코트', jacket: '자켓', windbreaker: '바람막이', shirt: '셔츠', polo: '폴로',
  sweatshirt: '맨투맨', knit: '니트', vest: '조끼', sleeveless: '민소매', 'long-sleeve': '긴팔', tee: '반팔' };

// 앞이 끝까지 열리는 여밈 (반집업, 쿼터집, 반단추는 풀오버로 봄)
const OPEN_FRONT = new Set(['full_zip', 'button_front', 'snap_front', 'asymmetric_zip', 'hidden_zip', 'diagonal_zip', 'side_zip',
  'toggle_front', 'hook_front', 'wrap_tie', 'double_breasted', 'velcro_front']);
const JACKET_NECK = new Set(['rider_collar', 'notched_lapel', 'shawl_collar']);
const JACKET_MATERIAL = new Set(['leather', 'faux_leather', 'suede', 'wool_tweed']);
const TEXT_KIND = [
  [/바람막이|윈드\s*브레이커|windbreaker|아노락|anorak/i, 'windbreaker'],
  [/조끼|베스트|(?<!har)vest|gilet|질레/i, 'vest'],
  [/코트|coat|트렌치|trench/i, 'coat'],
  [/자켓|재킷|jacket|점퍼|잠바|블루종|blouson|블레이저|blazer|파카|parka|패딩|puffer/i, 'jacket'],
  [/가디건|cardigan/i, 'cardigan'],
  // 2026-10-31 추가: 맨투맨, 스웻셔츠 (쿼터집 맨투맨, 반집업 스웻셔츠가 원단 때문에 긴팔로 나왔음), 니트, 스웨터
  [/맨투맨|스웻\s*셔츠|스웨트\s*셔츠|sweat\s*shirt/i, 'sweatshirt'],
  [/니트|스웨터|sweater/i, 'knit'],
  // 2026-10-31: 셔츠 (티셔츠, 폴로 셔츠, 스웻셔츠는 제외. 셔츠 자켓은 위의 자켓이 먼저)
  [/(?<!티\s*|폴로\s*|스웻\s*|스웨트\s*)셔츠|남방|dress\s*shirt/i, 'shirt'],
];
const SWEAT_MATERIAL = new Set(['french_terry', 'brushed_fleece', 'polyester_fleece', 'heavy_sweat_fleece']);

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

export function categoryFromTokens(tk, text = '') {
  if (!tk) return null;
  const neck = tk.neck, closure = tk.closure, len = tk.sleeve_length;
  const material = tk.material || tk.upper_material;
  const sleeveless = tk.sleeve === 'sleeveless';
  const open = OPEN_FRONT.has(closure);
  const padded = tk.insulation && tk.insulation !== 'none';
  let id;
  const said = text ? (TEXT_KIND.find(([re]) => re.test(text)) || [])[1] : undefined;
  if (neck === 'hood') id = 'hoodie';
  else if (said) id = said;
  else if (material === 'wool_knit' && open && !sleeveless) id = 'cardigan';
  else if (!sleeveless && open && (JACKET_NECK.has(neck) || JACKET_MATERIAL.has(material) || padded
    || closure === 'double_breasted' || closure === 'toggle_front')) id = 'jacket';
  else if (material === 'nylon_taslan' && (closure === 'full_zip' || closure === 'half_zip')) id = 'windbreaker';
  else if (neck === 'shirt_collar' && open) id = 'shirt';   // 2026-10-31: 단추만이 아니라 지퍼, 스냅 등 앞이 열리면 셔츠
  else if (neck === 'polo') id = 'polo';
  else if (neck === 'crew' && len === 'long' && SWEAT_MATERIAL.has(material)) id = 'sweatshirt';
  else if (material === 'wool_knit' && !sleeveless) id = 'knit';
  else if (sleeveless && open) id = 'vest';
  else if (sleeveless) id = 'sleeveless';
  else if (len === 'long' || len === 'three_quarter') id = 'long-sleeve';
  else id = 'tee';
  return { id, label: CATEGORY_LABELS[id] };
}
