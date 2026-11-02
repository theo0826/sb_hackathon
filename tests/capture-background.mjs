import assert from 'node:assert/strict';
import { loadTS } from './helpers/load-ts.mjs';
const { normalizeCapturePixels } = await loadTS('lib/capture-background.ts');
const width = 128, height = 128;
const pixel = (data, x, y) => [...data.slice((y * width + x) * 4, (y * width + x) * 4 + 4)];
const paint = (data, x, y, rgb) => data.set([...rgb, 255], (y * width + x) * 4);
for (const gradient of [false, true]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const t = (y + .5) / height, k = t * t * (3 - 2 * t);
    for (let x = 0; x < width; x++) paint(data, x, y, gradient ? [247 - 19*k, 246 - 21*k, 243 - 24*k] : [241,243,246]);
  }
  // A dark garment encloses a logo with exactly the old background colour.
  for (let y = 15; y < 110; y++) for (let x = 40; x < 88; x++) paint(data, x, y, [4,30,65]);
  for (let y = 30; y < 40; y++) for (let x = 50; x < 60; x++) paint(data, x, y, [241,243,246]);
  // Arms touch both edges. The old row-sampling algorithm erased these pixels.
  for (let y = 55; y < 70; y++) for (let x = 0; x < width; x++) if (x < 40 || x >= 88) paint(data, x, y, [210,206,198]);
  const before = data.slice();
  assert(normalizeCapturePixels(data, width, height));
  for (const [x,y] of [[0,0],[20,45],[20,90],[127,127]]) assert.deepEqual(pixel(data,x,y),[247,248,250,255]);
  for (const [x,y] of [[0,60],[127,60],[20,60],[60,80],[55,35]]) assert.deepEqual(pixel(data,x,y),pixel(before,x,y));
}
for (const colour of [[247,248,250],[255,255,255],[4,30,65]]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y=0;y<height;y++) for(let x=0;x<width;x++) paint(data,x,y,colour);
  const before=data.slice(); assert.equal(normalizeCapturePixels(data,width,height),false); assert.deepEqual(data,before);
}
console.log('PASS legacy backgrounds normalize while edge-touching subjects, enclosed logos and unrelated colours remain intact.');
