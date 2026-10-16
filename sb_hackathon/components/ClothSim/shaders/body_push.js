// body_push.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 몸 점 -> 천 삼각형 충돌: 천이 원래 있던 쪽을 지킴.
//   작은 단계 시작(X) 때 그 삼각형이 몸 점 앞쪽(법선 방향)에 있었는데 지금(P) 두께 안으로 들어왔으면 앞쪽으로 밀어냄.
//   처음부터 뒤쪽에 있던 천(이미 뚫린 곳)은 건드리지 않음: 손 위아래 점이 같은 삼각형을 서로 반대로 밀어 상쇄되는 것을 막음.
// 천 점 사이로 손가락처럼 얇은 몸 부위가 빠져나오는 것을 막음. 밀어낼 양은 정수(1e-4 cm 단위)로 모아 push_apply 에서 평균
@group(0) @binding(1) var<storage, read> P: array<f32>;
@group(0) @binding(2) var<storage, read> X: array<f32>;        // 작은 단계 시작 위치 (원래 있던 쪽 판정)
@group(0) @binding(3) var<storage, read> tris: array<Tri>;
@group(0) @binding(4) var<storage, read> hcnt: array<u32>;
@group(0) @binding(5) var<storage, read> hslot: array<u32>;
@group(0) @binding(6) var<storage, read> bverts: array<f32>;   // 몸 점마다 위치(3) 법선(3)
@group(0) @binding(7) var<storage, read_write> acc: array<atomic<i32>>;   // [이동 3n, 횟수 n]

fn ld(i: u32) -> vec3f { return vec3f(P[3u*i], P[3u*i+1u], P[3u*i+2u]); }
fn ldx(i: u32) -> vec3f { return vec3f(X[3u*i], X[3u*i+1u], X[3u*i+2u]); }
fn hash3(x: i32, y: i32, z: i32) -> u32 {
  return ((bitcast<u32>(x) * 73856093u) ^ (bitcast<u32>(y) * 19349663u) ^ (bitcast<u32>(z) * 83492791u)) % prm.hash_size;
}

// 삼각형 위 최근접점의 무게중심 좌표 (Ericson 5.1.5)
fn closest_bary(p: vec3f, a: vec3f, b: vec3f, c: vec3f) -> vec3f {
  let ab = b - a; let ac = c - a; let ap = p - a;
  let d1 = dot(ab, ap); let d2 = dot(ac, ap);
  if (d1 <= 0.0 && d2 <= 0.0) { return vec3f(1.0, 0.0, 0.0); }
  let bp = p - b;
  let d3 = dot(ab, bp); let d4 = dot(ac, bp);
  if (d3 >= 0.0 && d4 <= d3) { return vec3f(0.0, 1.0, 0.0); }
  let vc = d1*d4 - d3*d2;
  if (vc <= 0.0 && d1 >= 0.0 && d3 <= 0.0) { let v = d1 / (d1 - d3); return vec3f(1.0 - v, v, 0.0); }
  let cp = p - c;
  let d5 = dot(ab, cp); let d6 = dot(ac, cp);
  if (d6 >= 0.0 && d5 <= d6) { return vec3f(0.0, 0.0, 1.0); }
  let vb = d5*d2 - d1*d6;
  if (vb <= 0.0 && d2 >= 0.0 && d6 <= 0.0) { let w = d2 / (d2 - d6); return vec3f(1.0 - w, 0.0, w); }
  let va = d3*d6 - d5*d4;
  if (va <= 0.0 && (d4 - d3) >= 0.0 && (d5 - d6) >= 0.0) { let w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return vec3f(0.0, 1.0 - w, w); }
  let den = 1.0 / (va + vb + vc);
  let v = vb * den; let w = vc * den;
  return vec3f(1.0 - v - w, v, w);
}

fn add(v: u32, d: vec3f) {
  atomicAdd(&acc[3u*v], i32(round(d.x * 1e4)));
  atomicAdd(&acc[3u*v+1u], i32(round(d.y * 1e4)));
  atomicAdd(&acc[3u*v+2u], i32(round(d.z * 1e4)));
  atomicAdd(&acc[3u*prm.n + v], 1);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= prm.nbv) { return; }
  let bp = vec3f(bverts[6u*i], bverts[6u*i+1u], bverts[6u*i+2u]);
  let bn = vec3f(bverts[6u*i+3u], bverts[6u*i+4u], bverts[6u*i+5u]);
  let cl = vec3i(floor(bp / prm.hash_cell));
  let h = ((bitcast<u32>(cl.x) * 73856093u) ^ (bitcast<u32>(cl.y) * 19349663u) ^ (bitcast<u32>(cl.z) * 83492791u)) % prm.hash_size;
  let cnt = min(hcnt[h], prm.hash_slots);
  for (var k = 0u; k < cnt; k++) {
    let t = hslot[h * prm.hash_slots + k];
    let tr = tris[t];
    let a = ld(tr.a); let b = ld(tr.b); let c = ld(tr.c);
    let w = closest_bary(bp, a, b, c);
    let q = a * w.x + b * w.y + c * w.z;
    let dv = q - bp;
    let dn = dot(dv, bn);
    if (dn >= prm.thickness || dn <= -prm.push_depth) { continue; }
    if (length(dv - bn * dn) > prm.push_radius) { continue; }
    // 같은 무게중심 점의 단계 시작 위치가 몸 점 앞쪽(살짝 뒤 0.2cm 까지 허용)이었을 때만
    let q0 = ldx(tr.a) * w.x + ldx(tr.b) * w.y + ldx(tr.c) * w.z;
    if (dot(q0 - bp, bn) < -0.2) { continue; }
    let d = bn * (prm.thickness - dn) / dot(w, w);
    add(tr.a, d * w.x);
    add(tr.b, d * w.y);
    add(tr.c, d * w.z);
  }
}
`;
