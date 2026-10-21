const fs = require('fs');
const s = fs.readFileSync('components/ClothSim/garment/assets/trees/v0_seed.js', 'utf8');
const start = s.indexOf('export default ');
const tree = JSON.parse(JSON.parse(s.slice(start + 'export default '.length).trim().replace(/;$/, '')));

function find(n, id, acc = []) {
  if (n.id === id) acc.push(n);
  for (const c of n.children || []) find(c, id, acc);
  for (const o of n.options || []) find(o, id, acc);
  return acc;
}

function brief(n, depth = 0) {
  const pad = '  '.repeat(depth);
  const extra = [];
  if (n.type) extra.push(n.type);
  if (n.default != null) extra.push('default=' + n.default);
  if (n.min != null) extra.push(`range=${n.min}..${n.max} ${n.unit || ''}`);
  if (n.origin) extra.push('origin=' + n.origin);
  const keys = Object.keys(n).filter(k => !['children', 'options', 'desc', 'id', 'label', 'type', 'origin'].includes(k));
  console.log(`${pad}${n.id || '?'} [${extra.join(' ')}] keys=${keys.join(',')} ${(n.options||[]).length}opts ${(n.children||[]).length}ch`);
  if (n.desc && depth < 2) console.log(`${pad}  desc: ${String(n.desc).slice(0, 140)}`);
}

const top = find(tree.root, 'top')[0];
console.log('=== top children ===');
for (const c of top.children) {
  brief(c, 0);
  for (const o of (c.options || []).slice(0, 2)) {
    brief(o, 1);
    for (const ch of o.children || []) brief(ch, 2);
  }
}

console.log('\n=== hood full subtree ids ===');
const hood = find(tree.root, 'hood')[0];
function ids(n, d=0) {
  console.log('  '.repeat(d) + (n.type||'opt') + ' ' + n.id + (n.label? ' / '+n.label : '') + (n.default!=null?' default='+n.default:''));
  for (const c of n.children||[]) ids(c, d+1);
  for (const o of n.options||[]) ids(o, d+1);
}
ids(hood);

console.log('\n=== split none / chest first level ===');
for (const id of ['none', 'chest']) {
  const n = find(tree.root, id).find(x => (x.children||[]).some(c => /material|color/.test(c.id||'')) || id==='none' || id==='chest');
}
const split = find(tree.root, 'split')[0];
for (const o of split.options) {
  console.log('--', o.id);
  for (const c of o.children || []) {
    console.log('  ', c.type, c.id, 'opts', (c.options||[]).length, 'default', c.default);
    const first = (c.options||[])[0];
    if (first) console.log('    first opt keys', Object.keys(first).join(','));
  }
}

console.log('\n=== one material option sample ===');
function findMat(n) {
  if (n.id === 'material' || (n.id||'').endsWith('_material')) return n;
  for (const c of [...(n.children||[]), ...(n.options||[])]) {
    const f = findMat(c);
    if (f) return f;
  }
  return null;
}
const mat = findMat(tree.root);
console.log('mat id', mat && mat.id, 'nopts', mat && mat.options.length);
if (mat) {
  console.log('choice keys', Object.keys(mat));
  console.log('opt0', JSON.stringify(mat.options[0], null, 0).slice(0, 500));
  console.log('default', mat.default);
}
