/** anny_*.js meta + 바이너리 -> 정점 배열 (C++ body_from_asset 포맷) */

export function b64ToBytes(b64) {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}

export function unpackBodyVertices(meta, bytes) {
  const nv = meta.nv;
  const nf = meta.nf;
  const need = nv * 12 + nf * 6;
  const buf = bytes instanceof ArrayBuffer ? bytes : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  if (buf.byteLength < need) throw new Error('body asset 바이너리 길이 부족');
  const view = new DataView(buf);
  const V = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) {
    const o = i * 12;
    V[3 * i] = view.getFloat32(o, true);
    V[3 * i + 1] = view.getFloat32(o + 4, true);
    V[3 * i + 2] = view.getFloat32(o + 8, true);
  }
  return V;
}

export function assetFromModule(mod) {
  const { meta, data } = mod.default;
  return { meta, bytes: b64ToBytes(data) };
}

/** export default { meta, data } JS 파일 (fetch 텍스트). CSP 에서 blob: import 불가 */
export function bytesToUint8Array(bytes) {
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export function parseBodyAssetText(src) {
  const metaKey = src.indexOf('meta:');
  const dataKey = src.indexOf('data:', metaKey);
  if (metaKey < 0 || dataKey < 0) {
    const hint = src.length < 200 ? src.trim() : `${src.slice(0, 80).trim()}…`;
    throw new Error(`몸 파일 형식 오류 (JS asset 아님, ${src.length}자). 127.0.0.1:3000 으로 열었는지, public/cloth-bodies 동기화를 확인하세요. (${hint})`);
  }
  const meta = JSON.parse(src.slice(metaKey + 5, src.lastIndexOf(',', dataKey)).trim());
  const q1 = src.indexOf('"', dataKey);
  const q2 = src.lastIndexOf('"');
  if (q1 < 0 || q2 <= q1) throw new Error('몸 파일 data 파싱 실패');
  return { meta, bytes: b64ToBytes(src.slice(q1 + 1, q2)) };
}
