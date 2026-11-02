import {
  CLOSURE_PHRASES, COLOR_PHRASES, OUTER_PHRASES, SLEEVE_PHRASES, EXTRA_PHRASES, DECORATION_PHRASES, FIT_PHRASES, MATERIAL_PHRASES, NECK_PHRASES, SURFACE_PHRASES,
  P_CLOSURE, P_DECORATION, P_NONE_COL, P_NONE_MAT, P_SURFACE, firstMatch, colorSpans,
} from './explicitMap.js';

/**
 * 사용자 문장 → wasm select 옵션 (fixed, explicit_slots).
 * @param {string} text
 * @param {Record<string, string|number>} [userFixed]
 */
export function parseIntent(text, userFixed = {}) {
  const fixed = {};
  const explicit_slots = {};

  const mat = firstMatch(text, MATERIAL_PHRASES);
  if (mat) {
    fixed[P_NONE_MAT] = mat;
    explicit_slots.material = true;
  }

  const col = firstMatch(text, COLOR_PHRASES);
  if (col) {
    fixed[P_NONE_COL] = col;
    explicit_slots.color = true;
  }

  const neck = firstMatch(text, NECK_PHRASES);
  if (neck) fixed['category/top/neck'] = neck;

  const fit = firstMatch(text, FIT_PHRASES);
  if (fit) fixed['category/top/fit'] = fit;

  const clo = firstMatch(text, CLOSURE_PHRASES);
  if (clo) fixed[P_CLOSURE] = clo;
  const sur = firstMatch(text, SURFACE_PHRASES);
  if (sur) fixed[P_SURFACE] = sur;
  // 2026-10-31: 줄무늬, 체크 문장에 색이 둘 이상이면 바탕색과 무늬 색으로 나눔.
  //   'X 바탕' (흰색 바탕, 빨간 바탕) 의 X 가 바탕, 없으면 앞의 색이 바탕. 무늬 색은 바탕과 다른 다음 색
  //   (전에는 색 규칙 목록 순서로 하나만 골라 "흰색 바탕 크림색 줄무늬" 가 바탕 크림, 줄도 크림이 됐음)
  if (sur === 'stripe' || sur === 'check') {
    const cs = colorSpans(text);
    if (cs.length >= 2) {
      let bi = cs.findIndex(s => /^[가-힣]{0,2}\s*(?:바탕|베이스|base|background|ground)/i.test(text.slice(s.end)));
      if (bi < 0) bi = 0;
      const other = cs.find((s, i) => i !== bi && s.id !== cs[bi].id);
      fixed[P_NONE_COL] = cs[bi].id;
      explicit_slots.color = true;
      if (other) fixed[`category/top/surface_pattern/${sur}/${sur}_color`] = other.id;
    }
  }
  const dec = firstMatch(text, DECORATION_PHRASES);
  if (dec) fixed[P_DECORATION] = dec;

  if (/후드|hoodie|hood/i.test(text)) fixed['category/top/neck'] ??= 'hood';
  for (const [re, path, val] of OUTER_PHRASES) if (!(path in fixed) && re.test(text)) fixed[path] = val;
  // 2026-10-31 (Set 위임): 바람막이는 앞 지퍼 끝까지(full_zip), 아노락은 머리로 입는 반집업(half_zip) 이 실제 옷의 기본. 문장에 여밈이 없을 때만
  if (!fixed[P_CLOSURE]) {
    if (/아노락|anorak/i.test(text)) fixed[P_CLOSURE] = 'half_zip';
    else if (/바람막이|윈드\s*브레이커|windbreaker/i.test(text)) fixed[P_CLOSURE] = 'full_zip';
  }
  // 2026-10-31: 자켓, 코트, 점퍼 같은 아우터는 긴소매 (문장에 반팔, 칠부, 민소매 같은 말이 없을 때만). "갈색 코트" 가 칠부로 나왔던 것
  if (/자켓|재킷|jacket|점퍼|잠바|블루종|blouson|코트|coat|트렌치|trench|블레이저|blazer|파카|parka|바람막이|windbreaker|아노락|anorak/i.test(text)
      && !/반팔|반소매|short\s*sleeve|칠부|7부|three[- ]quarter|팔꿈치|elbow|민소매|나시|sleeveless|조끼|베스트|vest|캡\s*소매|cap\s*sleeve/i.test(text)) {
    for (const s of ['set_in', 'raglan', 'drop_shoulder', 'dolman', 'puff_sleeve', 'bishop_sleeve', 'bell_sleeve', 'kimono_sleeve', 'flutter_sleeve', 'cold_shoulder']) {
      const path = `category/top/sleeve/${s}/sleeve_length`;
      if (!(path in fixed)) fixed[path] = 'long';
    }
  }
  // 2026-10-31: 셔츠 문장(티셔츠, 폴로 셔츠, 스웻셔츠 제외)은 패딩 말이 없으면 패딩 없음 ("똑딱이 단추 셔츠" 가 경량 패딩으로 나왔던 것)
  if (/(?<!티\s*|폴로\s*|스웻\s*|스웨트\s*)셔츠|남방|dress\s*shirt|button[- ]?(?:up|down)\s*shirt/i.test(text)
      && !/패딩|푸퍼|퀼팅|퀼티드|구스\s*다운|덕\s*다운|다운\s*(?:자켓|재킷|점퍼|패딩)|padded|puffer|quilt|insulat|down\s*jacket/i.test(text) && !('category/top/insulation' in fixed)) {
    fixed['category/top/insulation'] = 'none';
  }
  // 2026-10-31: 가디건은 뜨개 옷이라 원단을 말하지 않으면 울 니트, 반팔 같은 말이 없으면 긴소매
  if (/가디건|cardigan/i.test(text)) {
    if (!fixed[P_NONE_MAT]) { fixed[P_NONE_MAT] = 'wool_knit'; }
    if (!/반팔|반소매|short\s*sleeve|칠부|7부|three[- ]quarter|팔꿈치|elbow|민소매|나시|sleeveless|조끼|베스트|vest/i.test(text)) {
      for (const s of ['set_in', 'raglan', 'drop_shoulder', 'dolman', 'puff_sleeve', 'bishop_sleeve', 'bell_sleeve', 'kimono_sleeve', 'flutter_sleeve', 'cold_shoulder']) {
        const path = `category/top/sleeve/${s}/sleeve_length`;
        if (!(path in fixed)) fixed[path] = 'long';
      }
    }
  }
  const slv = firstMatch(text, SLEEVE_PHRASES);
  if (slv) fixed['category/top/sleeve'] = slv;
  for (const [re, paths, val] of EXTRA_PHRASES) if (re.test(text)) for (const path of paths) if (!(path in fixed)) fixed[path] = val;
  // 2026-10-30 추가: 자켓, 점퍼는 셔츠로 가지 않게. 목과 여밈이 문장에 없을 때만 (스탠드 칼라 + 지퍼)
  // 가죽 계열 자켓은 목과 여밈을 고정하지 않고 prior_patch 로 넘김 (라이더가 가장 흔함, 확정은 LLM 과 prior 가 함께)
  let prior_patch = null;
  const isJacket = /자켓|재킷|jacket|점퍼|블루종|blouson/i.test(text);
  if (isJacket && ['leather', 'faux_leather', 'suede'].includes(mat) && !fixed['category/top/neck'] && !fixed[P_CLOSURE]) {
    prior_patch = leatherJacketPrior(mat);
  } else if (isJacket) {
    fixed['category/top/neck'] ??= 'mandarin';
    if (fixed['category/top/neck'] !== 'shirt_collar') fixed[P_CLOSURE] ??= 'full_zip';
  }
  // 목이나 여밈이 문장으로 정해진 가죽 계열 자켓도 커프, 밑단 prior 는 적용 (예: 라이더 자켓)
  if (isJacket && ['leather', 'faux_leather', 'suede'].includes(mat) && !prior_patch) {
    prior_patch = { node_rules: leatherTrimRules(mat) };
  }
  // 2026-11-01 (Set 결정, 값은 위임): 가디건 여밈 prior. 문장에 여밈 말이 없을 때만
  //   시판 가디건은 대부분 앞단추, 일부가 여밈 없이 걸쳐 입는 오픈 가디건, 지퍼와 스냅은 드묾 (추정값)
  if (/가디건|cardigan/i.test(text) && !fixed[P_CLOSURE]) {
    prior_patch = mergePatch(prior_patch, { node_rules: { closure: {
      default: { button_front: 0.75, none: 0.12, full_zip: 0.08, snap_front: 0.05 }, rules: [], replaceRules: true } } });
  }
  // 2026-10-31 (Set 결정, 값은 위임): 코트, 자켓 문장의 원단, 여밈, (코트) 목 prior
  const outer = outerwearPrior(text, mat, fixed);
  if (outer) prior_patch = mergePatch(prior_patch, outer);
  if (/맨투맨|sweatshirt|스웻/i.test(text)) {
    fixed['category/top/neck'] ??= 'crew';
    if (!fixed[P_NONE_MAT]) fixed[P_NONE_MAT] = 'french_terry';
  }

  // 재질·색 fixed 는 split/none/... 경로용. LLM 이 chest/waist 를 고르면 그 fixed 가 안 쓰임.
  const wantsSplit = /배색|컬러블록|color\s*block|이색|상하\s*분할|chest\s*band|밴드/i.test(text);
  if ((mat || col) && !wantsSplit) fixed['category/top/split'] = 'none';

  fixed.category = 'top';

  return {
    fixed: { ...fixed, ...userFixed },
    explicit_slots,
    prior_patch,
  };
}

// 2026-10-30 추가: 가죽 자켓 prior (실제 시장 비율을 추정한 값. 라이더 0.5 는 0.55 미만이라 LLM 이 문장을 보고 함께 정함)
//   neck 은 원래 prior 가 없는 항목이라 이 경우에만 넣음. closure 규칙은 기존 규칙보다 앞에 둬서 우선
function leatherJacketPrior(mat) {
  const neck = mat === 'suede'
    ? { shirt_collar: 0.35, rider_collar: 0.25, mandarin: 0.2, notched_lapel: 0.1, shawl_collar: 0.05, hood: 0.05 }
    : { rider_collar: 0.5, mandarin: 0.2, shirt_collar: 0.12, notched_lapel: 0.08, hood: 0.05, shawl_collar: 0.03, funnel_neck: 0.02 };
  const N = 'category/top/neck';
  return {
    nodes: { neck: { default: neck } },
    closure_rules: [
      { match: { [N]: 'rider_collar' }, weights: { asymmetric_zip: 0.8, full_zip: 0.15, snap_front: 0.05 } },
      { match: { [N]: 'mandarin' }, weights: { full_zip: 0.85, snap_front: 0.1, button_front: 0.05 } },
      { match: { [N]: 'shirt_collar' }, weights: { snap_front: 0.45, button_front: 0.4, full_zip: 0.15 } },
      { match: { [N]: 'notched_lapel' }, weights: { button_front: 0.7, none: 0.2, double_breasted: 0.1 } },
      { match: { [N]: 'hood' }, weights: { full_zip: 0.85, none: 0.1, half_zip: 0.05 } },
      { match: { [N]: 'funnel_neck' }, weights: { full_zip: 0.8, asymmetric_zip: 0.15, half_zip: 0.05 } },
    ],
    node_rules: leatherTrimRules(mat),
  };
}

// 2026-10-30 추가: 가죽 계열 자켓의 커프, 밑단 prior (목이나 여밈이 문장으로 고정돼도 적용)
function leatherTrimRules(mat) {
  const N = 'category/top/neck';
  // 2026-10-30 추가 (Set 위임, 추정값): 가죽 계열 자켓의 소매 끝과 밑단. 리브보다 몸판 원단 마감(지퍼 커프, 접어 박은 밑단)이 흔함
  //   default 는 바꾸고, rules 는 기존 규칙보다 앞에 둠 (같은 match 키 수면 앞 규칙이 이김)
  return {
    cuff: {
      default: mat === 'suede'
        ? { open: 0.45, snap_cuff: 0.2, zip_cuff: 0.2, barrel: 0.1, rib: 0.05 }
        : { zip_cuff: 0.5, open: 0.3, snap_cuff: 0.1, rib: 0.05, adjustable_tab: 0.05 },
      rules: [
        { match: { [N]: 'rider_collar' }, weights: { zip_cuff: 0.65, open: 0.2, snap_cuff: 0.1, rib: 0.05 } },
        { match: { [N]: 'mandarin' }, weights: { open: 0.4, zip_cuff: 0.3, rib: 0.15, snap_cuff: 0.15 } },
        { match: { [N]: 'shirt_collar' }, weights: { snap_cuff: 0.45, barrel: 0.35, open: 0.2 } },
        { match: { [N]: 'notched_lapel' }, weights: { open: 0.9, rib: 0.02, zip_cuff: 0.08 } },
        { match: { [N]: 'hood' }, weights: { open: 0.4, zip_cuff: 0.3, rib: 0.3 } },
        { match: { [N]: 'funnel_neck' }, weights: { zip_cuff: 0.5, open: 0.4, rib: 0.1 } },
      ],
    },
    hem: {
      default: { straight: 0.75, rib: 0.1, drawcord_hem: 0.1, curved: 0.05 },
      rules: [
        { match: { [N]: 'rider_collar' }, weights: { straight: 0.85, rib: 0.05, drawcord_hem: 0.05, asymmetric_hem: 0.05 } },
        { match: { [N]: 'mandarin' }, weights: { straight: 0.65, rib: 0.15, elastic_hem: 0.1, drawcord_hem: 0.1 } },
        { match: { [N]: 'shirt_collar' }, weights: { straight: 0.7, curved: 0.25, rib: 0.05 } },
        { match: { [N]: 'notched_lapel' }, weights: { straight: 0.9, curved: 0.1 } },
        { match: { [N]: 'hood' }, weights: { straight: 0.5, rib: 0.3, drawcord_hem: 0.2 } },
      ],
    },
  };
}

// 2026-10-31: 코트, 자켓 prior (추정값). 원단은 문장에 원단 말이 없을 때만, 목과 여밈은 문장에 없을 때만
//   원단 prior 는 그 옷에서만 원단 규칙(목에 따른 규칙 등)을 대신함 (예: 자켓이 목 규칙 때문에 니트 원단으로 가지 않게)
function outerwearPrior(text, mat, fixed) {
  const trench = /트렌치|trench/i.test(text);
  const coat = trench || /코트|coat/i.test(text);
  const blazer = /블레이저|blazer|테일러드/i.test(text);
  const jacket = /자켓|재킷|jacket|점퍼|잠바|블루종|blouson|파카|parka/i.test(text);
  if (!coat && !blazer && !jacket) return null;
  const N = 'category/top/neck';
  const out = { nodes: {}, node_rules: {}, slots: {} };
  if (!mat) {
    const m = trench ? { gabardine: 0.6, cotton_canvas: 0.12, nylon_taslan: 0.1, cotton_poplin: 0.1, wool_melton: 0.05, faux_leather: 0.03 }
      : coat ? { wool_melton: 0.45, gabardine: 0.2, wool_tweed: 0.12, nylon_taslan: 0.08, cotton_canvas: 0.05, corduroy: 0.03, faux_leather: 0.03, suede: 0.02, velvet: 0.02 }
      : blazer ? { wool_tweed: 0.3, wool_melton: 0.15, gabardine: 0.15, linen: 0.1, corduroy: 0.1, cotton_canvas: 0.05, velvet: 0.05, cotton_poplin: 0.05, denim: 0.03, silk_satin: 0.02 }
      : { nylon_taslan: 0.3, cotton_canvas: 0.15, denim: 0.12, softshell_knit: 0.08, polyester_fleece: 0.07, corduroy: 0.06, wool_melton: 0.05,
          wool_tweed: 0.04, french_terry: 0.04, faux_leather: 0.04, suede: 0.02, velvet: 0.02, gabardine: 0.01 };
    out.slots.material = { default: m, rules: [], replaceRules: true };
  }
  if (coat) {
    if (!fixed[N]) out.nodes.neck = { default: trench
      ? { notched_lapel: 0.75, shirt_collar: 0.2, mandarin: 0.05 }
      : { notched_lapel: 0.5, shirt_collar: 0.15, hood: 0.1, mandarin: 0.08, shawl_collar: 0.07, funnel_neck: 0.05, crew: 0.05 } };
    if (!fixed[P_CLOSURE]) out.node_rules.closure = { default: trench
      ? { double_breasted: 0.65, button_front: 0.25, wrap_tie: 0.1 }
      : { button_front: 0.45, double_breasted: 0.3, toggle_front: 0.07, wrap_tie: 0.07, full_zip: 0.06, snap_front: 0.05 }, rules: [], replaceRules: true };
  }
  return out;
}

function mergePatch(a, b) {
  if (!a) return b;
  return {
    nodes: { ...(a.nodes || {}), ...(b.nodes || {}) },
    node_rules: { ...(a.node_rules || {}), ...(b.node_rules || {}) },
    slots: { ...(a.slots || {}), ...(b.slots || {}) },
    closure_rules: [...(a.closure_rules || []), ...(b.closure_rules || [])],
  };
}

/** prior 객체에 prior_patch 를 덧붙인 새 객체 (원본은 그대로) */
export function applyPriorPatch(priors, patch) {
  if (!patch || !priors) return priors;
  const p = JSON.parse(JSON.stringify(priors));
  p.nodes = p.nodes || {};
  for (const [k, v] of Object.entries(patch.nodes || {})) p.nodes[k] = v;
  if (patch.closure_rules) {
    const c = p.nodes.closure || { default: {} };
    c.rules = [...patch.closure_rules, ...(c.rules || [])];
    p.nodes.closure = c;
  }
  // node_rules: 항목별로 default 를 바꾸고 rules 는 기존 규칙 앞에 붙임
  for (const [k, v] of Object.entries(patch.node_rules || {})) {
    const c = p.nodes[k] || { default: {} };
    if (v.default) c.default = v.default;
    if (v.rules) c.rules = v.replaceRules ? [...v.rules] : [...v.rules, ...(c.rules || [])];
    p.nodes[k] = c;
  }
  // slots (원단, 색): 기본값을 바꾸고, replaceRules 면 규칙을 대신함
  for (const [k, v] of Object.entries(patch.slots || {})) {
    p.slots = p.slots || {};
    const c = p.slots[k] ? { ...p.slots[k] } : { default: {} };
    if (v.default) c.default = v.default;
    if (v.rules) c.rules = v.replaceRules ? [...v.rules] : [...v.rules, ...(c.rules || [])];
    p.slots[k] = c;
  }
  return p;
}
