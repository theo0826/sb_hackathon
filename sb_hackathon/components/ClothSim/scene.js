// scene.json + scene.bin 읽기, 그리고 계산에 필요한 이웃 목록 만들기
// source: 폴더 주소 문자열 ('/api/result/123/cloth' -> scene.json, scene.bin 을 읽음) 또는 { meta, bin } (이미 받은 것)
export async function loadScene(source = '.') {
  let meta, bin;
  if (typeof source === 'string') {
    const base = source.replace(/\/$/, '');
    const r1 = await fetch(`${base}/scene.json`), r2 = await fetch(`${base}/scene.bin`);
    if (!r1.ok || !r2.ok) throw new Error(`장면 파일을 못 읽음: ${base}/scene.json, scene.bin`);
    meta = await r1.json();
    bin = await r2.arrayBuffer();
  } else {
    meta = source.meta;
    bin = source.bin instanceof ArrayBuffer ? source.bin : source.bin.buffer.slice(source.bin.byteOffset, source.bin.byteOffset + source.bin.byteLength);
  }
  const A = {};
  for (const [name, t] of Object.entries(meta.arrays)) {
    const C = { f32: Float32Array, u32: Uint32Array, i32: Int32Array }[t.type];
    A[name] = new C(bin, t.offset, t.count);
  }
  return { meta, A };
}

// 정점 -> 제약 목록 (CSR). 부호: 변의 a 쪽 +, b 쪽 -  (C++ adjacency.cpp 와 같음)
function csr(n, pairs, stride) {
  const m = pairs.length / stride;
  const start = new Int32Array(n + 1);
  for (let e = 0; e < m; e++) { start[pairs[stride * e] + 1]++; start[pairs[stride * e + 1] + 1]++; }
  for (let i = 0; i < n; i++) start[i + 1] += start[i];
  const fill = start.slice(0, n), list = new Int32Array(2 * m);
  for (let e = 0; e < m; e++) {
    list[fill[pairs[stride * e]]++] = e + 1;
    list[fill[pairs[stride * e + 1]]++] = -(e + 1);
  }
  return { start, list };
}

export function derive(scene) {
  const { meta, A } = scene;
  const n = meta.n, ntri = meta.n_tris;
  const E = csr(n, A.edges, 8), S = csr(n, A.seams, 4);
  const adj = new Int32Array(E.start.length + E.list.length + S.start.length + S.list.length);
  const off = { e_start: 0, e_list: E.start.length };
  off.s_start = off.e_list + E.list.length;
  off.s_list = off.s_start + S.start.length;
  adj.set(E.start, off.e_start); adj.set(E.list, off.e_list); adj.set(S.start, off.s_start); adj.set(S.list, off.s_list);

  // 삼각형 -> 늘어남 변 번호 (찢어진 삼각형 숨김용)
  const key = new Map();
  for (let e = 0; e < meta.n_stretch; e++) key.set(A.edges[8 * e] * n + A.edges[8 * e + 1], e);
  const triEdges = new Int32Array(3 * ntri).fill(-1);
  const T = A.tris;
  for (let t = 0; t < ntri; t++) {
    for (let k = 0; k < 3; k++) {
      const a = T[4 * t + k], b = T[4 * t + (k + 1) % 3];
      const e = key.get(Math.min(a, b) * n + Math.max(a, b));
      if (e !== undefined) triEdges[3 * t + k] = e;
    }
  }
  // 정점 -> 삼각형 (법선용)
  const vt = new Uint32Array(n + 1 + 3 * ntri);
  for (let t = 0; t < ntri; t++) for (let k = 0; k < 3; k++) vt[T[4 * t + k] + 1]++;
  for (let i = 0; i < n; i++) vt[i + 1] += vt[i];
  const fill = vt.slice(0, n);
  for (let t = 0; t < ntri; t++) for (let k = 0; k < 3; k++) vt[n + 1 + fill[T[4 * t + k]]++] = t;

  // 몸 그리기: 매끈한 법선
  const BV = A.body_V, BF = A.body_F, nv = BV.length / 3;
  const nrm = new Float32Array(3 * nv);
  for (let f = 0; f < BF.length / 3; f++) {
    const a = BF[3 * f], b = BF[3 * f + 1], c = BF[3 * f + 2];
    const ux = BV[3 * b] - BV[3 * a], uy = BV[3 * b + 1] - BV[3 * a + 1], uz = BV[3 * b + 2] - BV[3 * a + 2];
    const vx = BV[3 * c] - BV[3 * a], vy = BV[3 * c + 1] - BV[3 * a + 1], vz = BV[3 * c + 2] - BV[3 * a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) { nrm[3 * i] += nx; nrm[3 * i + 1] += ny; nrm[3 * i + 2] += nz; }
  }
  const bodyVerts = new Float32Array(6 * nv);
  for (let i = 0; i < nv; i++) {
    const l = Math.hypot(nrm[3 * i], nrm[3 * i + 1], nrm[3 * i + 2]) || 1;
    for (let k = 0; k < 3; k++) { bodyVerts[6 * i + k] = BV[3 * i + k]; bodyVerts[6 * i + 3 + k] = nrm[3 * i + k] / l; }
  }
  const { cons, clist, colors } = colorConstraints(meta, A);
  return { adj, off, triEdges, vtadj: vt, bodyVerts, bodyIdx: BF, cons, clist, colors };
}

// 제약 배열 = [변(늘어남, 굽힘) ne 개, 봉제 ns 개] (각 u32 x 8, common.wgsl Edge)
// 그리고 색칠: 같은 색 제약끼리는 점을 공유하지 않게 (탐욕법). 색마다 한 번에 병렬로 풀 수 있음
function colorConstraints(meta, A) {
  const ne = meta.n_edges, ns = meta.n_seams, nc = ne + ns, n = meta.n;
  const cons = new Uint32Array(8 * nc);
  cons.set(A.edges, 0);
  const f = new Float32Array(cons.buffer), i32 = new Int32Array(cons.buffer);
  for (let s = 0; s < ns; s++) {
    const o = 8 * (ne + s);
    cons[o] = A.seams[4 * s]; cons[o + 1] = A.seams[4 * s + 1];
    f[o + 2] = new Float32Array(A.seams.buffer, A.seams.byteOffset, A.seams.length)[4 * s + 2];
    f[o + 3] = 0; i32[o + 4] = -1; f[o + 5] = 0; f[o + 6] = 0; cons[o + 7] = 2;
  }
  const lo = new Uint32Array(n), hi = new Uint32Array(n);   // 점마다 쓴 색 (64 색까지)
  const color = new Uint8Array(nc);
  let ncolor = 0;
  for (let c = 0; c < nc; c++) {
    const a = cons[8 * c], b = cons[8 * c + 1];
    const ml = lo[a] | lo[b], mh = hi[a] | hi[b];
    let k = 0;
    while (k < 64 && ((k < 32 ? (ml >>> k) : (mh >>> (k - 32))) & 1)) k++;
    if (k >= 64) throw new Error('제약 색칠 실패 (색 64개 초과)');
    color[c] = k; ncolor = Math.max(ncolor, k + 1);
    if (k < 32) { lo[a] |= 1 << k; lo[b] |= 1 << k; } else { hi[a] |= 1 << (k - 32); hi[b] |= 1 << (k - 32); }
  }
  const counts = new Uint32Array(ncolor);
  for (let c = 0; c < nc; c++) counts[color[c]]++;
  const colors = [], fill = new Uint32Array(ncolor);
  let off = 0;
  for (let k = 0; k < ncolor; k++) { colors.push({ off, cnt: counts[k] }); fill[k] = off; off += counts[k]; }
  const clist = new Uint32Array(nc);
  for (let c = 0; c < nc; c++) clist[fill[color[c]]++] = c;
  return { cons, clist, colors };
}
