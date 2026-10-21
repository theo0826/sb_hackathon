import {
  CLOSURE_PHRASES, COLOR_PHRASES, DECORATION_PHRASES, FIT_PHRASES, MATERIAL_PHRASES, NECK_PHRASES, SURFACE_PHRASES,
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
  };
}
