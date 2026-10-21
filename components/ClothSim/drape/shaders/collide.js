// collide.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 3) 몸 충돌 (천 점 -> 몸) + 쿨롱 마찰 (정지: 접선 이동이 mu_s x 침투 깊이 안이면 멈춤, 운동: mu_k x 깊이 만큼 줄임). 몸 종류 0 = 메쉬 격자 (C++ collider_query.h), 1 = 단순 마네킹 도형 (collider_primitive.h)
@group(0) @binding(1) var<storage, read_write> P: array<f32>;  // 점마다 자기 위치만 읽고 씀
@group(0) @binding(2) var<storage, read> X: array<f32>;
@group(0) @binding(3) var<storage, read> btri: array<f32>;   // 삼각형마다 a(3) b(3) c(3) 법선(3)
@group(0) @binding(4) var<storage, read> grid: array<u32>;   // [칸 시작(ncell+1), 칸별 삼각형, 칸 안쪽 표시]
@group(0) @binding(5) var<storage, read> caps: array<f32>;   // 캡슐 7개씩: A(3) B(3) R

fn tv(t: u32, k: u32) -> vec3f { let o = 12u*t + 3u*k; return vec3f(btri[o], btri[o+1u], btri[o+2u]); }

// 삼각형 위 최근접점 (Ericson 5.1.5)
fn closest_on_tri(p: vec3f, a: vec3f, b: vec3f, c: vec3f) -> vec3f {
  let ab = b - a; let ac = c - a; let ap = p - a;
  let d1 = dot(ab, ap); let d2 = dot(ac, ap);
  if (d1 <= 0.0 && d2 <= 0.0) { return a; }
  let bp = p - b;
  let d3 = dot(ab, bp); let d4 = dot(ac, bp);
  if (d3 >= 0.0 && d4 <= d3) { return b; }
  let vc = d1*d4 - d3*d2;
  if (vc <= 0.0 && d1 >= 0.0 && d3 <= 0.0) { return a + ab * (d1 / (d1 - d3)); }
  let cp = p - c;
  let d5 = dot(ab, cp); let d6 = dot(ac, cp);
  if (d6 >= 0.0 && d5 <= d6) { return c; }
  let vb = d5*d2 - d1*d6;
  if (vb <= 0.0 && d2 >= 0.0 && d6 <= 0.0) { return a + ac * (d2 / (d2 - d6)); }
  let va = d3*d6 - d5*d4;
  if (va <= 0.0 && (d4 - d3) >= 0.0 && (d5 - d6) >= 0.0) { return b + (c - b) * ((d4 - d3) / ((d4 - d3) + (d5 - d6))); }
  let den = 1.0 / (va + vb + vc);
  return a + ab * (vb * den) + ac * (vc * den);
}

struct Best { d2: f32, t: i32, cp: vec3f, nsum: vec3f, };

fn test_tri(t: u32, p: vec3f, b: ptr<function, Best>) {
  let q = closest_on_tri(p, tv(t, 0u), tv(t, 1u), tv(t, 2u));
  let d = p - q;
  let d2 = dot(d, d);
  let eps = 1e-8 + 1e-5 * (*b).d2;
  if (d2 < (*b).d2 - eps) { (*b).d2 = d2; (*b).t = i32(t); (*b).cp = q; (*b).nsum = tv(t, 3u); }
  else if (d2 <= (*b).d2 + eps) { (*b).nsum += tv(t, 3u); }
}

fn scan_cell(c: u32, p: vec3f, b: ptr<function, Best>) {
  let k0 = grid[prm.g_start_off + c];
  let k1 = grid[prm.g_start_off + c + 1u];
  for (var k = k0; k < k1; k++) { test_tri(grid[prm.g_tris_off + k], p, b); }
}

fn collide_mesh(p: ptr<function, vec3f>, th: f32) -> bool {
  let ix = i32(floor(((*p).x - prm.gox) / prm.cell));
  let iy = i32(floor(((*p).y - prm.goy) / prm.cell));
  let iz = i32(floor(((*p).z - prm.goz) / prm.cell));
  if (ix < 0 || iy < 0 || iz < 0 || ix >= prm.gdx || iy >= prm.gdy || iz >= prm.gdz) { return false; }
  let c = u32((iz * prm.gdy + iy) * prm.gdx + ix);
  var b = Best(1e30, -1, *p, vec3f(0.0));
  scan_cell(c, *p, &b);
  if (b.t < 0 || b.d2 > prm.margin * prm.margin) {
    // margin 보다 멀다: 몸 밖이면 충돌 아님. 몸 안이면 칸을 넓혀 가며 최근접 찾기
    if (grid[prm.g_inside_off + c] == 0u) { return false; }
    b = Best(1e30, -1, *p, vec3f(0.0));
    let rmax = i32(prm.max_dist / prm.cell) + 1;
    for (var r = 1; r <= rmax; r++) {
      for (var z = iz - r; z <= iz + r; z++) {
        for (var y = iy - r; y <= iy + r; y++) {
          for (var x = ix - r; x <= ix + r; x++) {
            if (x < 0 || y < 0 || z < 0 || x >= prm.gdx || y >= prm.gdy || z >= prm.gdz) { continue; }
            if (x != ix - r && x != ix + r && y != iy - r && y != iy + r && z != iz - r && z != iz + r) { continue; }
            scan_cell(u32((z * prm.gdy + y) * prm.gdx + x), *p, &b);
          }
        }
      }
      if (b.t >= 0 && f32(r - 1) * prm.cell > sqrt(b.d2)) { break; }
    }
  }
  if (b.t < 0) { return false; }
  let dist = sqrt(b.d2);
  if (dist > prm.max_dist) { return false; }
  let n = tv(u32(b.t), 3u);
  let sgn = select(-1.0, 1.0, dot(*p - b.cp, b.nsum) >= 0.0);
  if (dist * sgn < th) { *p = b.cp + n * th; return true; }
  return false;
}

fn collide_primitive(p: ptr<function, vec3f>, th: f32) -> bool {
  let p0 = *p;
  var q = *p;
  if (q.y > prm.py_bottom && q.y < prm.py_top) {
    let t = clamp((q.y - (prm.py_top - 20.0)) / 20.0, 0.0, 1.0);
    let t15 = t * sqrt(t);
    let a = prm.pa * (1.0 - 0.2 * t15);
    let bb = prm.pb * (1.0 - 0.4 * t15);
    let sx = q.x / (a + th); let sz = q.z / (bb + th);
    let r = sqrt(sx*sx + sz*sz);
    if (r < 1.0) { let f = 1.0 / max(r, 1e-6); q.x *= f; q.z *= f; }
  }
  for (var k = 0u; k < prm.ncaps; k++) {
    let o = 7u * k;
    let A = vec3f(caps[o], caps[o+1u], caps[o+2u]);
    let B = vec3f(caps[o+3u], caps[o+4u], caps[o+5u]);
    let R = caps[o+6u];
    let d = B - A;
    let tt = clamp(dot(q - A, d) / dot(d, d), 0.0, 1.0);
    let C = A + d * tt;
    let v = q - C;
    let dist = length(v);
    if (dist < R + th) { q = C + v * ((R + th) / max(dist, 1e-6)); }
  }
  let H = vec3f(prm.hx, prm.hy, prm.hz);
  let v = q - H;
  let dist = length(v);
  if (dist < prm.hr + th) { q = H + v * ((prm.hr + th) / max(dist, 1e-6)); }
  *p = q;
  let dd = q - p0;
  return abs(dd.x) > 1e-9 || abs(dd.y) > 1e-9 || abs(dd.z) > 1e-9;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= prm.n) { return; }
  let before = vec3f(P[3u*i], P[3u*i+1u], P[3u*i+2u]);
  var p = before;
  var hit = false;
  // 이중막이면 겉막 점은 속막 두께만큼 몸에서 더 떨어져야 함. 같은 최소 간격을 쓰면 꼭 끼는 곳(슬림 소매)에서
  // 몸이 속막을 바깥으로 밀고, 속막이 겉막 사이로 비져 나와 검은 점으로 보임
  let th = prm.thickness + select(0.0, prm.shell_gap, prm.nshell > 0u && i < prm.nout);
  if (prm.body_kind == 0u) { hit = collide_mesh(&p, th); } else { hit = collide_primitive(&p, th); }
  if (hit) {
    var nrm = p - before;
    let depth = length(nrm);
    nrm = nrm / (depth + 1e-12);
    let disp = p - vec3f(X[3u*i], X[3u*i+1u], X[3u*i+2u]);
    let tang = disp - nrm * dot(disp, nrm);
    let tl = length(tang);
    if (tl < prm.mu_s * depth) { p = p - tang; }
    else if (tl > 0.0) { p = p - tang * min(prm.mu_k * depth / tl, 1.0); }
  }
  P[3u*i] = p.x; P[3u*i+1u] = p.y; P[3u*i+2u] = p.z;
}
`;
