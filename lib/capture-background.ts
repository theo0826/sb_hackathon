/** Normalize only known legacy renderer grounds, never a colour sampled from a model. */
export function normalizeCapturePixels(pixels: Uint8ClampedArray, width: number, height: number): boolean {
  const matches = (rgb: number[]) => rgb.every((value, i) => Math.abs(pixels[i] - value) <= 3);
  const beige = matches([247, 246, 243]);
  if (!beige && !matches([241, 243, 246])) return false;
  // This is the original renderer's smoothstep gradient. Edge pixels may be arms,
  // sleeves or logos; sampling them as the ground would erase parts of the subject.
  const ground = Array.from({ length: height }, (_, y) => {
    const t = (y + 0.5) / height, k = t * t * (3 - 2 * t);
    const expected = beige ? [247 - 19 * k, 246 - 21 * k, 243 - 24 * k] : [241, 243, 246];
    const left = y * width * 4, right = (y * width + width - 1) * 4;
    // Account for JPEG quantization only when both edges agree with the known
    // ground. An edge occupied by the subject must never define a whole row.
    const sampled = expected.every((channel, i) => Math.abs(pixels[left + i] - channel) <= 5 && Math.abs(pixels[left + i] - pixels[right + i]) <= 2)
      ? expected.map((_, i) => pixels[left + i]) : expected;
    return [expected, sampled];
  });
  const count = width * height;
  const seen = new Uint8Array(count), queue = new Uint32Array(count);
  let head = 0, tail = 0;
  const visit = (index: number) => {
    if (seen[index]) return;
    seen[index] = 1;
    const offset = index * 4;
    if (!ground[Math.floor(index / width)].some(rgb => rgb.every((channel, i) => Math.abs(pixels[offset + i] - channel) <= 4))) return;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { visit(x); visit(count - width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit((y + 1) * width - 1); }
  while (head < tail) {
    const index = queue[head++], offset = index * 4, x = index % width;
    pixels[offset] = 247; pixels[offset + 1] = 248; pixels[offset + 2] = 250;
    if (x > 0) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < count - width) visit(index + width);
  }
  return true;
}
