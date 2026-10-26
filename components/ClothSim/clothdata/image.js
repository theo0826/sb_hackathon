// ImageData -> 'data:image/jpeg;base64,...'
export async function imageDataToDataURL(img, type = 'image/jpeg', quality = 0.85) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(img.width, img.height);
    c.getContext('2d').putImageData(img, 0, 0);
    const blob = await c.convertToBlob({ type, quality });
    return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  }
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  c.getContext('2d').putImageData(img, 0, 0);
  return c.toDataURL(type, quality);
}
