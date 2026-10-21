const fs = require('fs');
const s = fs.readFileSync('components/ClothSim/garment/wasm.js', 'utf8');
const start = s.indexOf('export default ');
const b64 = JSON.parse(s.slice(start + 'export default '.length).trim().replace(/;$/, ''));
const buf = Buffer.from(b64, 'base64');
const text = buf.toString('latin1');
const re = /[\x20-\x7e]{6,}/g;
const hits = new Set();
const keys = ['prior', 'logprob', 'predict', 'choose', 'fixed', 'explicit', 'softmax', 'weight', 'prob', 'source', 'select'];
for (const m of text.match(re) || []) {
  const low = m.toLowerCase();
  if (keys.some(k => low.includes(k))) hits.add(m);
}
const arr = [...hits].sort();
console.log('hits', arr.length);
for (const h of arr) console.log(h);
