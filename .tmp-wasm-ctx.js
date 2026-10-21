const fs = require('fs');
const s = fs.readFileSync('components/ClothSim/garment/wasm.js', 'utf8');
const start = s.indexOf('export default ');
const b64 = JSON.parse(s.slice(start + 'export default '.length).trim().replace(/;$/, ''));
const buf = Buffer.from(b64, 'base64');
const text = buf.toString('latin1');
const needles = ['logprob', 'priors', 'explicit_slots', 'weights', 'gm_select', 'best-fitting', 'source', 'alts', 'softmax', 'fixed'];
for (const n of needles) {
  let i = 0, c = 0;
  while ((i = text.indexOf(n, i)) !== -1 && c < 3) {
    const a = Math.max(0, i - 80);
    const b = Math.min(text.length, i + n.length + 120);
    const slice = text.slice(a, b).replace(/[^\x20-\x7e]/g, '.');
    console.log('\n[' + n + ' @' + i + ']');
    console.log(slice);
    i += n.length;
    c++;
  }
}
