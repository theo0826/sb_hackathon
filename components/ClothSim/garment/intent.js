import {
  CLOSURE_PHRASES, COLOR_PHRASES, OUTER_PHRASES, DECORATION_PHRASES, FIT_PHRASES, MATERIAL_PHRASES, NECK_PHRASES, SURFACE_PHRASES,
  P_CLOSURE, P_DECORATION, P_NONE_COL, P_NONE_MAT, P_SURFACE, firstMatch,
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
  const dec = firstMatch(text, DECORATION_PHRASES);
  if (dec) fixed[P_DECORATION] = dec;

  if (/후드|hoodie|hood/i.test(text)) fixed['category/top/neck'] ??= 'hood';
  for (const [re, path, val] of OUTER_PHRASES) if (!(path in fixed) && re.test(text)) fixed[path] = val;
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
  return p;
}
