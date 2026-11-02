// 2026-10-31 (Set 승인): 무늬 색, 배색 색이 바탕색과 같거나 너무 비슷하면 대비되는 색으로 바꾼다.
//   예: "가로 줄무늬 티셔츠" 가 흰 바탕에 흰 줄, "가슴 배색 바람막이" 가 위아래 같은 회색 (시험 round_03)
//   문장에서 색을 두 번 이상 말했거나 (같은 색을 두 번 말한 것도 포함), 그 칸을 사용자가 고정(fixed)했으면 바꾸지 않는다
// 대비 색 고르는 방법: 그 칸의 prior 순서(무늬 색은 그 항목의 prior, 배색 색은 색 prior)대로 보면서
//   바탕색과 "충분히 다른" 첫 색 (밝기 L* 차 30 이상, 또는 두 색 모두 채도 20 이상이고 색상각 차 60도 이상).
//   prior 에서 못 찾으면 흰색, 네이비, 검정 순, 그래도 없으면 전체 색 중 밝기 차가 가장 큰 색
import { COLOR_PHRASES } from './explicitMap.js';

// sRGB hex -> CIE Lab (D65)
function lab(hex) {
  const s = String(hex || '#888888').replace('#', '');
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = [0, 2, 4].map(i => lin(parseInt(s.slice(i, i + 2), 16)));
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = v => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
// 2026-10-31 (Set 결정): 밝기나 색상 중 하나라도 충분히 다르면 "다름"
//   밝기: L* 차이 30 이상 / 색상: 두 색 모두 채도(C*) 20 이상이고 색상각 차이 60도 이상
export const CONTRAST = { dL: 30, chroma: 20, hue: 60 };
function different(h1, h2) {
  const [L1, a1, b1] = lab(h1), [L2, a2, b2] = lab(h2);
  if (Math.abs(L1 - L2) >= CONTRAST.dL) return true;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  if (C1 < CONTRAST.chroma || C2 < CONTRAST.chroma) return false;
  let dh = Math.abs(Math.atan2(b1, a1) - Math.atan2(b2, a2)) * 180 / Math.PI;
  if (dh > 180) dh = 360 - dh;
  return dh >= CONTRAST.hue;
}
const lstar = hex => lab(hex)[0];

// 문장에서 색을 말한 횟수. "빨간 상의 빨간 하의" 는 2, "네이비 블루" 처럼 붙어 있는 색 말은 1 로 셈
//   (맞은 부분을 같은 길이의 공백으로 지워 가며 위치를 모으고, 공백만 사이에 둔 이웃 위치는 하나로 합침)
export function colorMentions(text) {
  let t = String(text || '');
  const spans = [];
  for (const [re] of COLOR_PHRASES) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    t = t.replace(g, (m, ...rest) => { const off = rest[rest.length - 2]; spans.push([off, off + m.length]); return ' '.repeat(m.length); });
  }
  spans.sort((a, b) => a[0] - b[0]);
  let n = 0, end = -1;
  for (const [s, e] of spans) {
    if (end >= 0 && /^\s*$/.test(String(text).slice(end, s))) { end = e; continue; }
    n++; end = e;
  }
  return n;
}

function colorTable(tree) {
  const m = {};
  const walk = n => {
    if (!n || typeof n !== 'object') return;
    for (const o of n.options || []) { if (o.meta && o.meta.hex && !m[o.id]) m[o.id] = o; (o.children || []).forEach(walk); }
    (n.children || []).forEach(walk);
  };
  walk(tree.root || tree);
  return m;
}

const PAIRS = [
  // [바꿀 칸, 바탕 칸 후보, prior 위치]
  ['stripe_color', ['color', 'upper_color'], p => p?.nodes?.stripe_color?.default],
  ['check_color', ['color', 'upper_color'], p => p?.nodes?.check_color?.default],
  ['lower_color', ['upper_color'], p => p?.slots?.color?.default],
  ['band_color', ['upper_color'], p => p?.slots?.color?.default],
];

export function applyContrast(spec, text, tree, priors) {
  const toks = spec && spec.tokens;
  if (!toks) return [];
  if (colorMentions(text) >= 2) return [];
  const table = colorTable(tree);
  const byLeaf = leaf => Object.keys(toks).find(p => p.split('/').pop() === leaf);
  const changed = [];
  for (const [leaf, bases, priorOf] of PAIRS) {
    const tp = byLeaf(leaf);
    if (!tp || toks[tp].source === 'user') continue;
    const bp = bases.map(byLeaf).find(Boolean);
    if (!bp) continue;
    const baseHex = toks[bp].meta && toks[bp].meta.hex, curHex = toks[tp].meta && toks[tp].meta.hex;
    if (!baseHex || !curHex) continue;
    const Lb = lstar(baseHex);
    if (different(curHex, baseHex)) continue;   // 이미 충분히 다름 (밝기 또는 색상)
    const w = priorOf(priors) || {};
    const ranked = Object.entries(w).sort((a, b) => b[1] - a[1]).map(([id]) => id).concat(['white', 'navy', 'black']);
    let pick = ranked.find(id => table[id] && different(table[id].meta.hex, baseHex));
    if (!pick) pick = Object.keys(table).sort((a, b) => Math.abs(lstar(table[b].meta.hex) - Lb) - Math.abs(lstar(table[a].meta.hex) - Lb))[0];
    if (!pick) continue;
    const o = table[pick];
    changed.push(`${leaf}: ${toks[tp].value} -> ${pick} (바탕 ${toks[bp].value} 과 대비)`);
    toks[tp] = { ...toks[tp], value: pick, label: o.label, meta: o.meta, source: 'contrast' };
  }
  return changed;
}
