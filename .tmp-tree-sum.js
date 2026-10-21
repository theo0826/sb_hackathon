const fs = require('fs');
const s = fs.readFileSync('components/ClothSim/garment/assets/trees/v0_seed.js', 'utf8');
const start = s.indexOf('export default ');
const json = JSON.parse(s.slice(start + 'export default '.length).trim().replace(/;$/, ''));
const tree = JSON.parse(json);
function walk(n, path, acc) {
  const id = n.id || '';
  const here = path ? (id ? path + '/' + id : path) : id;
  acc.push({
    path: here,
    type: n.type || '(option)',
    label: n.label || '',
    nopt: (n.options || []).length,
    nchild: (n.children || []).length,
    keys: Object.keys(n).filter(k => !['children', 'options', 'desc'].includes(k)).join(','),
  });
  for (const c of n.children || []) walk(c, here, acc);
  for (const o of n.options || []) walk(o, here, acc);
}
const acc = [];
walk(tree.root || tree, '', acc);
const types = {};
acc.forEach(a => { types[a.type] = (types[a.type] || 0) + 1; });
console.log('name', tree.name, 'builder', tree.builder, 'topKeys', Object.keys(tree).join(','));
console.log('types', JSON.stringify(types), 'nodes', acc.length);
console.log('--- shallow ---');
for (const a of acc.filter(x => x.path.split('/').length <= 5)) {
  console.log(`${a.type}\t${a.path}\topts=${a.nopt}\tchildren=${a.nchild}\t${a.label}`);
}
console.log('--- sample node keys by type ---');
const seen = new Set();
for (const a of acc) {
  if (seen.has(a.type)) continue;
  seen.add(a.type);
  console.log(a.type, a.keys);
}
