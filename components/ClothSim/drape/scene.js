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

/** 몸 메쉬 정점 -> 렌더용 pos+normal (6 floats / vert) */
export function bodyVertsFromMesh(BV, BF) {
  const nv = BV.length / 3;
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
  return bodyVerts;
}

export function derive(scene, opts = {}) {
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
  const BV = A.body_V, BF = A.body_F;
  const bodyVerts = bodyVertsFromMesh(BV, BF);
  const { cons, clist, colors, bendInfo } = colorConstraints(meta, A, opts);
  const shellPairs = buildShellPairs(meta, A, vt);
  if (shellPairs) bendInfo.shellPairs = shellPairs.length / 4;
  return { adj, off, triEdges, vtadj: vt, bodyVerts, bodyIdx: BF, cons, clist, colors, bendInfo, shellPairs };
}

// ---------- 이중막 짝 ----------
// 장면 meta.shell = {n_outer, n_inner}. 속막 점 = n_outer 이후 (붙은 패널 빼고 겉 점마다 하나)
// 겉막과 속막을 잇는 늘어남 변(겉 o < n_outer <= 속 i)은 같은 점의 겉, 속 짝만 이음 (C++ shell_layer.cpp)
// 짝마다 [겉, 속, n_outer, 부호 x 처음 간격] (u32, u32, u32, f32). 부호: 겉막 삼각형 감김 법선이 몸 바깥을 보면 +
// "바깥"은 가장 가까운 몸 점에서 겉막 점으로 가는 방향으로 정함. C++ 은 옷 전체 중심 기준으로 속막 방향을 정해서
// 소매, 밴드처럼 중심에서 먼 곳은 속막이 바깥에 놓이는 일이 있음 (후드티에서 17%). 여기서 몸 기준으로 다시 정하면
// 제약이 그 속막을 안쪽으로 되돌림
function nearestBody(BV) {
  const C = 3, key = (x, y, z) => `${Math.floor(x / C)},${Math.floor(y / C)},${Math.floor(z / C)}`;
  const grid = new Map();
  for (let i = 0; i < BV.length / 3; i++) {
    const k = key(BV[3 * i], BV[3 * i + 1], BV[3 * i + 2]);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }
  return (x, y, z) => {
    const cx = Math.floor(x / C), cy = Math.floor(y / C), cz = Math.floor(z / C);
    let best = -1, bd = Infinity;
    for (let r = 0; r <= 6 && (best < 0 || (r - 1) * C < Math.sqrt(bd)); r++) {
      for (let i = cx - r; i <= cx + r; i++) for (let j = cy - r; j <= cy + r; j++) for (let k = cz - r; k <= cz + r; k++) {
        if (Math.max(Math.abs(i - cx), Math.abs(j - cy), Math.abs(k - cz)) !== r) continue;
        const list = grid.get(`${i},${j},${k}`);
        if (!list) continue;
        for (const v of list) {
          const dx = BV[3 * v] - x, dy = BV[3 * v + 1] - y, dz = BV[3 * v + 2] - z, d = dx * dx + dy * dy + dz * dz;
          if (d < bd) { bd = d; best = v; }
        }
      }
    }
    return best;
  };
}
function buildShellPairs(meta, A, vt) {
  const sh = meta.shell;
  if (!sh || !sh.n_inner) return null;
  const no = sh.n_outer, n = meta.n, ne = meta.n_edges;
  const E = A.edges, X = A.X, T = A.tris;
  const outerOf = new Int32Array(n).fill(-1);
  for (let e = 0; e < ne; e++) {
    if (E[8 * e + 7] !== 0) continue;
    let a = E[8 * e], b = E[8 * e + 1];
    if (a > b) [a, b] = [b, a];
    if (a < no && b >= no) outerOf[b] = a;
  }
  const near = A.body_V && A.body_V.length ? nearestBody(A.body_V) : null;
  const BV = A.body_V;
  let flipped = 0;
  const pairs = [], pmesh = [];
  const meshOf = new Int32Array(n).fill(-1);
  for (let t = 0; t < meta.n_tris; t++) { const a = T[4 * t], b = T[4 * t + 1], c = T[4 * t + 2]; if (a < no && b < no && c < no) meshOf[a] = meshOf[b] = meshOf[c] = T[4 * t + 3]; }
  for (let i = no; i < n; i++) {
    const o = outerOf[i];
    if (o < 0) continue;
    let sx = 0, sy = 0, sz = 0;
    for (let k = vt[o]; k < vt[o + 1]; k++) {
      const t = vt[n + 1 + k];
      const a = T[4 * t], b = T[4 * t + 1], c = T[4 * t + 2];
      if (a >= no || b >= no || c >= no) continue;   // 겉막 삼각형만
      const ux = X[3 * b] - X[3 * a], uy = X[3 * b + 1] - X[3 * a + 1], uz = X[3 * b + 2] - X[3 * a + 2];
      const vx = X[3 * c] - X[3 * a], vy = X[3 * c + 1] - X[3 * a + 1], vz = X[3 * c + 2] - X[3 * a + 2];
      sx += uy * vz - uz * vy; sy += uz * vx - ux * vz; sz += ux * vy - uy * vx;
    }
    const dx = X[3 * o] - X[3 * i], dy = X[3 * o + 1] - X[3 * i + 1], dz = X[3 * o + 2] - X[3 * i + 2];
    const gap = Math.hypot(dx, dy, dz);
    if (gap < 1e-6) continue;
    // 바깥 방향: 몸 기준 (몸이 없으면 처음 겉-속 방향)
    let ox = dx, oy = dy, oz = dz;
    if (near) {
      const b = near(X[3 * o], X[3 * o + 1], X[3 * o + 2]);
      if (b >= 0) { ox = X[3 * o] - BV[3 * b]; oy = X[3 * o + 1] - BV[3 * b + 1]; oz = X[3 * o + 2] - BV[3 * b + 2]; }
    }
    if (ox * dx + oy * dy + oz * dz < 0) flipped++;
    const sgn = sx * ox + sy * oy + sz * oz >= 0 ? 1 : -1;
    pairs.push(o, i, no, sgn * gap);
    pmesh.push(meshOf[o]);
  }
  // 부호는 패널(메쉬)마다 다수결로 하나로: 소맷부리처럼 손, 몸통이 섞여 가장 가까운 몸 점이 엉뚱한 곳이면
  // 점마다 부호가 갈려 속막을 바깥으로 미는 짝이 생김. 감김 법선은 패널 안에서 일정하므로 패널 부호 하나면 됨
  const vote = new Map();
  for (let k = 0; k < pmesh.length; k++) vote.set(pmesh[k], (vote.get(pmesh[k]) || 0) + Math.sign(pairs[4 * k + 3]));
  let fixedSign = 0;
  for (let k = 0; k < pmesh.length; k++) {
    const s = (vote.get(pmesh[k]) || 0) >= 0 ? 1 : -1;
    if (Math.sign(pairs[4 * k + 3]) !== s) { pairs[4 * k + 3] = -pairs[4 * k + 3]; fixedSign++; }
  }
  if (fixedSign) console.info('[ClothSim] 이중막: 패널 다수결로 부호를 바꾼 짝', fixedSign);
  if (flipped) console.info('[ClothSim] 이중막: 처음 배치에서 속막이 몸 바깥쪽에 놓인 점', flipped, '/', pairs.length / 4, '(1단계에서 안쪽으로 되돌림)');
  if (pairs.length / 4 !== sh.n_inner) console.warn('[ClothSim] 이중막 짝 수가 속막 점 수와 다름', { pairs: pairs.length / 4, n_inner: sh.n_inner });
  const out = new Uint32Array(pairs.length), f = new Float32Array(out.buffer);
  for (let k = 0; k < pairs.length; k += 4) { out[k] = pairs[k]; out[k + 1] = pairs[k + 1]; out[k + 2] = pairs[k + 2]; f[k + 3] = pairs[k + 3]; }
  return out;
}

// ---------- 굽힘 (이면각) ----------
// 원단 굽힘 강성 대표값 B (gf cm²/cm, Kawabata 계측 범위에 맞춘 추정): B = c x 두께² (두께 cm)
//   니트 c = 15 (코튼 저지 0.05, 프렌치테리 0.15, 헤비 스웻 0.38), 우븐 c = 31 (포플린 0.05, 데님 0.45)
// 1 gf cm²/cm = 980.665 dyne cm. 접는 변 하나의 강성 k = 3 B |e|² / (A1 + A2) (이산 껍질 모델), 유연도 = 1 / k
// 두께와 신축률은 장면에 있는 값(늘어남, 굽힘 유연도)에서 되돌려 구함 (C++ scene.cpp 와 같은 식)
const STRETCH_E0 = 500, BEND_RATIO = 0.02;
const GF = 980.665;
function bendRigidity(stretch, thickness, scale) {
  const c = stretch < 0.05 ? 31 : 15;
  return c * thickness * thickness * GF * scale;
}
function heron(a, b, c) {
  const s = (a + b + c) / 2;
  return Math.sqrt(Math.max(1e-12, s * (s - a) * (s - b) * (s - c)));
}

// 제약 배열 = [변(늘어남, 굽힘) ne 개, 봉제 ns 개, 봉제선 굽힘 nx 개] (각 u32 x 8, common.wgsl Edge)
// 그리고 색칠: 같은 색 제약끼리는 점을 공유하지 않게 (탐욕법). 색마다 한 번에 병렬로 풀 수 있음
// 굽힘은 날개 두 점과 접는 변 두 점, 네 점을 같이 봐야 함
function colorConstraints(meta, A, opts = {}) {
  const ne = meta.n_edges, ns = meta.n_seams, n = meta.n, nst = meta.n_stretch;
  const bendScale = opts.bendScale ?? 1;
  const E = A.edges, Ef = new Float32Array(E.buffer, E.byteOffset, E.length), Ei = new Int32Array(E.buffer, E.byteOffset, E.length);
  const T = A.tris, ntri = meta.n_tris;
  // 정점 -> 메쉬, 메쉬별 두께
  const meshOf = new Int32Array(n).fill(-1);
  for (let t = 0; t < ntri; t++) for (let k = 0; k < 3; k++) meshOf[T[4 * t + k]] = T[4 * t + 3];
  const nm = meta.meshes.length;
  const bendComp = new Float64Array(nm).fill(0);
  // 굽힘(kind 1)만 봄 (이중막 장면은 n_stretch 뒤에 속 레이어 늘어남 변도 있음)
  for (let e = nst; e < ne; e++) { if (E[8 * e + 7] !== 1) continue; const m = meshOf[E[8 * e]]; if (m >= 0 && !bendComp[m]) bendComp[m] = Ef[8 * e + 6]; }
  const meshB = new Float64Array(nm);
  const info = [];
  for (let m = 0; m < nm; m++) {
    const st = meta.meshes[m].stretch ?? 0.1;
    const Em = STRETCH_E0 / Math.max(st, 0.02) * 1000;
    const th = bendComp[m] > 0 ? 0.1 / (bendComp[m] * Em * BEND_RATIO) : 0.1;
    meshB[m] = bendRigidity(st, th, bendScale);
    info.push({ name: meta.meshes[m].name, stretch: st, thickness: +th.toFixed(3), B_gfcm: +(meshB[m] / GF).toFixed(3) });
  }
  // 정지 길이 (늘어남 변)
  const restOf = new Map();
  const ekey = (a, b) => (a < b ? a * n + b : b * n + a);
  // 늘어남 변 전부 (이중막 장면은 속막 늘어남 변이 n_stretch 뒤에 있음)
  for (let e = 0; e < ne; e++) if (E[8 * e + 7] === 0) restOf.set(ekey(E[8 * e], E[8 * e + 1]), e);
  const R = e => Ef[8 * e + 2];
  const len = (a, b) => { const e = restOf.get(ekey(a, b)); return e === undefined ? null : R(e); };
  const hingeK = (h0, h1, w1, w2, B) => {
    const le = len(h0, h1), a1 = len(h0, w1), b1 = len(h1, w1), a2 = len(h0, w2), b2 = len(h1, w2);
    if (le == null || a1 == null || b1 == null || a2 == null || b2 == null) return 0;
    const A1 = heron(le, a1, b1), A2 = heron(le, a2, b2);
    return 3 * B * le * le / (A1 + A2);
  };

  // 봉제선을 가로지르는 굽힘: 경계 변 (u, v) 와 봉제 짝 (pu, pv) 가 이루는 경계 변을 찾아 양쪽 날개를 잇는다
  const third = new Map(), cnt = new Map();
  for (let t = 0; t < ntri; t++) {
    const m = T[4 * t + 3];
    if (meta.meshes[m].kind === 'attach') continue;
    const v = [T[4 * t], T[4 * t + 1], T[4 * t + 2]];
    for (let k = 0; k < 3; k++) {
      const key = ekey(v[k], v[(k + 1) % 3]);
      cnt.set(key, (cnt.get(key) || 0) + 1);
      third.set(key, v[(k + 2) % 3]);
    }
  }
  const partner = new Map();
  for (let s = 0; s < ns; s++) {
    const a = A.seams[4 * s], b = A.seams[4 * s + 1];
    if (!partner.has(a)) partner.set(a, []);
    if (!partner.has(b)) partner.set(b, []);
    partner.get(a).push(b); partner.get(b).push(a);
  }
  const cross = [], seen = new Set();
  for (const [key, c] of cnt) {
    if (c !== 1) continue;
    const u = Math.floor(key / n), v = key % n;
    const pu = partner.get(u), pv = partner.get(v);
    if (!pu || !pv) continue;
    for (const a of pu) for (const b of pv) {
      const k2 = ekey(a, b);
      if (k2 === key || cnt.get(k2) !== 1) continue;
      const pk = key < k2 ? `${key}:${k2}` : `${k2}:${key}`;
      if (seen.has(pk)) continue;
      seen.add(pk);
      const hingeE = restOf.get(key);
      if (hingeE === undefined) continue;
      const w1 = third.get(key), w2 = third.get(k2);
      const m1 = meshOf[w1], m2 = meshOf[w2];
      const B = 0.5 * (meshB[m1] + meshB[m2]);
      // 접는 변은 (u, v) 쪽, 짝 (a, b) 는 합친 뒤 같은 자리. 넓이는 각자 삼각형으로
      const le = 0.5 * (R(hingeE) + (len(a, b) ?? R(hingeE)));
      const A1 = heron(le, len(u, w1) ?? le, len(v, w1) ?? le), A2 = heron(le, len(a, w2) ?? le, len(b, w2) ?? le);
      const k = 3 * B * le * le / (A1 + A2);
      if (k > 0) cross.push([w1, w2, hingeE, 1 / k]);
    }
  }

  const nx = cross.length, nc = ne + ns + nx;
  const cons = new Uint32Array(8 * nc);
  cons.set(E, 0);
  const f = new Float32Array(cons.buffer), i32 = new Int32Array(cons.buffer);
  // 처음 모양을 정지 각으로 유지하는 메쉬: 셔츠 칼라 (심지 넣고 다려 접힌 모양). 나머지는 평평(0)이 정지
  const X0 = A.X;
  const keepShape = new Uint8Array(meta.meshes.length);
  meta.meshes.forEach((mm, i) => { if (/^collar_(leaf|stand)/.test(mm.name)) keepShape[i] = 1; });
  const dihedral0 = (i1, i2, i3, i4) => {   // xpbd.js solve_bend 와 같은 식
    const p = i => [X0[3 * i], X0[3 * i + 1], X0[3 * i + 2]];
    const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
    const crs = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    const x1 = p(i1), x2 = p(i2), x3 = p(i3), x4 = p(i4);
    const e = sub(x4, x3), le = Math.sqrt(dot(e, e));
    const n1 = crs(sub(x1, x3), sub(x1, x4)), n2 = crs(sub(x2, x4), sub(x2, x3));
    const q1 = dot(n1, n1), q2 = dot(n2, n2);
    if (le < 1e-6 || q1 < 1e-12 || q2 < 1e-12) return 0;
    const a = n1.map(v => v / Math.sqrt(q1)), b = n2.map(v => v / Math.sqrt(q2));
    return Math.atan2(dot(crs(a, b), e) / le, dot(a, b));
  };
  // 패널 안 굽힘: 거리 방식 -> 이면각 (정지 각 0 = 평평, 유연도 = 1 / k)
  let nb = 0;
  for (let e = nst; e < ne; e++) {
    const o = 8 * e, link = Ei[o + 4];
    if (link < 0 || E[o + 7] !== 1) continue;
    const w1 = E[o], w2 = E[o + 1], h0 = E[8 * link], h1 = E[8 * link + 1];
    const k = hingeK(h0, h1, w1, w2, meshB[meshOf[w1]]);
    f[o + 2] = keepShape[meshOf[w1]] && keepShape[meshOf[w2]] ? dihedral0(w1, w2, h0, h1) : 0;
    f[o + 6] = k > 0 ? 1 / k : 1e3;
    nb++;
  }
  for (let s = 0; s < ns; s++) {
    const o = 8 * (ne + s);
    cons[o] = A.seams[4 * s]; cons[o + 1] = A.seams[4 * s + 1];
    f[o + 2] = new Float32Array(A.seams.buffer, A.seams.byteOffset, A.seams.length)[4 * s + 2];
    f[o + 3] = 0; i32[o + 4] = -1; f[o + 5] = 0; f[o + 6] = 0; cons[o + 7] = 2;
  }
  for (let x = 0; x < nx; x++) {
    const o = 8 * (ne + ns + x), [w1, w2, h, comp] = cross[x];
    const r0 = keepShape[meshOf[w1]] && keepShape[meshOf[w2]] ? dihedral0(w1, w2, E[8 * h], E[8 * h + 1]) : 0;   // 칼라대-날개 접힘
    cons[o] = w1; cons[o + 1] = w2; f[o + 2] = r0; f[o + 3] = 0; i32[o + 4] = h; f[o + 5] = 0; f[o + 6] = comp; cons[o + 7] = 3;
  }

  const lo = new Uint32Array(n), hi = new Uint32Array(n);   // 점마다 쓴 색 (64 색까지)
  const color = new Uint8Array(nc);
  let ncolor = 0;
  const verts = [0, 0, 0, 0];
  for (let c = 0; c < nc; c++) {
    const o = 8 * c, kind = cons[o + 7];
    let nv = 2;
    verts[0] = cons[o]; verts[1] = cons[o + 1];
    if ((kind === 1 || kind === 3) && i32[o + 4] >= 0) { const h = i32[o + 4]; verts[2] = cons[8 * h]; verts[3] = cons[8 * h + 1]; nv = 4; }
    let ml = 0, mh = 0;
    for (let j = 0; j < nv; j++) { ml |= lo[verts[j]]; mh |= hi[verts[j]]; }
    let k = 0;
    while (k < 64 && ((k < 32 ? (ml >>> k) : (mh >>> (k - 32))) & 1)) k++;
    if (k >= 64) throw new Error('제약 색칠 실패 (색 64개 초과)');
    color[c] = k; ncolor = Math.max(ncolor, k + 1);
    for (let j = 0; j < nv; j++) { if (k < 32) lo[verts[j]] |= 1 << k; else hi[verts[j]] |= 1 << (k - 32); }
  }
  const counts = new Uint32Array(ncolor);
  for (let c = 0; c < nc; c++) counts[color[c]]++;
  const colors = [], fill = new Uint32Array(ncolor);
  let off = 0;
  for (let k = 0; k < ncolor; k++) { colors.push({ off, cnt: counts[k] }); fill[k] = off; off += counts[k]; }
  const clist = new Uint32Array(nc);
  for (let c = 0; c < nc; c++) clist[fill[color[c]]++] = c;
  return { cons, clist, colors, bendInfo: { meshes: info, bend: nb, seamBend: nx, colors: ncolor } };
}
