// 몸 충돌 격자 만들기 (C++ native/src/collider_build.cpp 와 같은 방법)
//   칸마다 margin 안의 삼각형 목록(CSR), 칸 가운데에서 +x 광선의 들어감/나감 세기로 몸 안쪽 표시
//   결과 grid = [칸 시작(ncell+1), 칸별 삼각형, 안쪽 표시(ncell)], btri = 삼각형마다 a b c 법선 (12 float)
/** Vbounds: 포즈 블렌드 시 격자 칸 크기만 넓히기 (같은 nv, 정점 i 대응) */
export function buildGrid(V, F, cell, margin, thickness, Vbounds = null) {
  const nf = F.length / 3, nv = V.length / 3;
  const btri = new Float32Array(12 * nf);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) {
    lo[k] = Math.min(lo[k], V[3 * i + k]);
    hi[k] = Math.max(hi[k], V[3 * i + k]);
    if (Vbounds) {
      lo[k] = Math.min(lo[k], Vbounds[3 * i + k]);
      hi[k] = Math.max(hi[k], Vbounds[3 * i + k]);
    }
  }
  const pad = margin + thickness + cell;
  const origin = [0, 0, 0], dims = [0, 0, 0];
  for (let k = 0; k < 3; k++) { origin[k] = Math.fround(lo[k] - pad); dims[k] = Math.ceil((hi[k] - lo[k] + 2 * pad) / cell); }
  const [dx, dy, dz] = dims, ncell = dx * dy * dz;
  const tb = new Int32Array(6 * nf);
  const count = new Uint32Array(ncell + 1);
  for (let t = 0; t < nf; t++) {
    const ia = F[3 * t], ib = F[3 * t + 1], ic = F[3 * t + 2];
    const a = [V[3 * ia], V[3 * ia + 1], V[3 * ia + 2]], b = [V[3 * ib], V[3 * ib + 1], V[3 * ib + 2]], c = [V[3 * ic], V[3 * ic + 1], V[3 * ic + 2]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const ln = Math.hypot(...n);
    n = ln > 0 ? n.map(x => x / ln) : [0, 1, 0];
    btri.set([...a, ...b, ...c, ...n], 12 * t);
    for (let k = 0; k < 3; k++) {
      const tl = Math.min(a[k], b[k], c[k]), th = Math.max(a[k], b[k], c[k]);
      tb[6 * t + k] = Math.max(0, Math.floor((tl - margin - origin[k]) / cell));
      tb[6 * t + 3 + k] = Math.min(dims[k] - 1, Math.floor((th + margin - origin[k]) / cell));
    }
    for (let z = tb[6 * t + 2]; z <= tb[6 * t + 5]; z++)
      for (let y = tb[6 * t + 1]; y <= tb[6 * t + 4]; y++)
        for (let x = tb[6 * t]; x <= tb[6 * t + 3]; x++) count[(z * dy + y) * dx + x + 1]++;
  }
  for (let i = 0; i < ncell; i++) count[i + 1] += count[i];
  const total = count[ncell];
  const grid = new Uint32Array(ncell + 1 + total + ncell);
  grid.set(count, 0);
  const T0 = ncell + 1, I0 = T0 + total;
  const fill = count.slice(0, ncell);
  for (let t = 0; t < nf; t++)
    for (let z = tb[6 * t + 2]; z <= tb[6 * t + 5]; z++)
      for (let y = tb[6 * t + 1]; y <= tb[6 * t + 4]; y++)
        for (let x = tb[6 * t]; x <= tb[6 * t + 3]; x++) grid[T0 + fill[(z * dy + y) * dx + x]++] = t;

  // 안쪽 표시: (y, z) 줄마다 그 줄에 걸친 삼각형만 광선 교차 검사
  const rs = new Uint32Array(dy * dz + 1);
  for (let t = 0; t < nf; t++)
    for (let z = tb[6 * t + 2]; z <= tb[6 * t + 5]; z++)
      for (let y = tb[6 * t + 1]; y <= tb[6 * t + 4]; y++) rs[z * dy + y + 1]++;
  for (let i = 0; i < dy * dz; i++) rs[i + 1] += rs[i];
  const rl = new Uint32Array(rs[dy * dz]), rf = rs.slice(0, dy * dz);
  for (let t = 0; t < nf; t++)
    for (let z = tb[6 * t + 2]; z <= tb[6 * t + 5]; z++)
      for (let y = tb[6 * t + 1]; y <= tb[6 * t + 4]; y++) rl[rf[z * dy + y]++] = t;
  const hits = [];
  for (let z = 0; z < dz; z++)
    for (let y = 0; y < dy; y++) {
      const py = origin[1] + (y + 0.5) * cell, pz = origin[2] + (z + 0.5) * cell;
      hits.length = 0;
      for (let k = rs[z * dy + y]; k < rs[z * dy + y + 1]; k++) {
        const o = 12 * rl[k];
        const ay = btri[o + 1], az = btri[o + 2], by = btri[o + 4], bz = btri[o + 5], cy = btri[o + 7], cz = btri[o + 8];
        const d = (by - ay) * (cz - az) - (cy - ay) * (bz - az);
        if (Math.abs(d) < 1e-12) continue;
        const u = ((py - ay) * (cz - az) - (cy - ay) * (pz - az)) / d;
        const v = ((by - ay) * (pz - az) - (py - ay) * (bz - az)) / d;
        if (u < 0 || v < 0 || u + v > 1) continue;
        const hx = btri[o] + u * (btri[o + 3] - btri[o]) + v * (btri[o + 6] - btri[o]);
        hits.push([hx, btri[o + 9] > 0 ? 1 : -1]);
      }
      hits.sort((p, q) => p[0] - q[0]);
      let depth = 0, h = 0;
      for (let x = 0; x < dx; x++) {
        const px = origin[0] + (x + 0.5) * cell;
        while (h < hits.length && hits[h][0] < px) { depth -= hits[h][1]; h++; }
        grid[I0 + (z * dy + y) * dx + x] = depth > 0 ? 1 : 0;
      }
    }
  return { btri, grid, origin, dims, off: { start: 0, tris: T0, inside: I0 }, ntri: nf };
}

/** 포즈만 바뀔 때 삼각형 btri 위치·법선만 갱신 (격자 CSR 은 그대로) */
export function updateBtri(V, F, btri) {
  const nf = F.length / 3;
  for (let t = 0; t < nf; t++) {
    const ia = F[3 * t], ib = F[3 * t + 1], ic = F[3 * t + 2];
    const a = [V[3 * ia], V[3 * ia + 1], V[3 * ia + 2]], b = [V[3 * ib], V[3 * ib + 1], V[3 * ib + 2]], c = [V[3 * ic], V[3 * ic + 1], V[3 * ic + 2]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const ln = Math.hypot(...n);
    n = ln > 0 ? n.map(x => x / ln) : [0, 1, 0];
    btri.set([...a, ...b, ...c, ...n], 12 * t);
  }
}
