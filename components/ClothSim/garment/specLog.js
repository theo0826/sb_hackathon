/** 선택이 끝난 spec.tokens 를 콘솔에서 한눈에 보기 (재질·색 확인용) */
import { clothLog } from './clothLog.js';

const TAG = '[ClothSim]';

function isMaterialPath(path) {
  return /(?:^|\/)material$/.test(path) || /_material$/.test(path);
}

function isColorPath(path) {
  return /(?:^|\/)color$/.test(path) || /_color$/.test(path);
}

/**
 * @param {import('../index.d.ts').Spec | { tokens?: Record<string, unknown> }} spec
 * @returns {Record<string, string|number|undefined>[]}
 */
export function specTokenRows(spec) {
  const tokens = spec?.tokens || {};
  return Object.keys(tokens).sort().map(path => {
    const t = tokens[path] || {};
    const meta = t.meta && typeof t.meta === 'object' ? t.meta : {};
    const row = {
      path,
      value: t.value,
      label: t.label,
      source: t.source,
      prob: t.prob,
    };
    if (isMaterialPath(path)) {
      row.family = meta.family;
      row.gsm = meta.gsm;
      row.thickness = meta.thickness;
    }
    if (isColorPath(path)) {
      row.hex = meta.hex;
    }
    return row;
  });
}

/**
 * 디버그 플래그와 무관하게 한 번 출력 (전달 후 spec 검증용).
 * @param {import('../index.d.ts').Spec | { tokens?: Record<string, unknown> }} spec
 * @param {(line: string) => void} [onLine]
 */
export function logFinalSpecTokens(spec, onLine) {
  const rows = specTokenRows(spec);
  const textUsed = spec?.info?.preprocess?.text_used;
  console.info(TAG, `최종 트리 토큰 ${rows.length}개`, textUsed ? `(번역·사용 문장: ${textUsed})` : '');
  console.table(rows);

  const mat = rows.filter(r => isMaterialPath(r.path));
  const col = rows.filter(r => isColorPath(r.path));
  if (mat.length) {
    console.info(TAG, '재질 요약', mat.map(r => `${r.path} → ${r.value} [${r.source}] gsm=${r.gsm ?? '?'}`).join(' | '));
  } else {
    console.warn(TAG, '재질 토큰 없음 (split 경로·선택 실패 확인)');
  }
  if (col.length) {
    console.info(TAG, '색 요약', col.map(r => `${r.path} → ${r.value} ${r.hex || ''} [${r.source}]`).join(' | '));
  }

  clothLog('spec 토큰 dump 완료', rows.length);
  if (onLine) {
    onLine(`── 트리 토큰 ${rows.length}개 ──`);
    for (const r of rows) {
      onLine(`${r.path} = ${r.value} (${r.source})`);
    }
  }
  return rows;
}
