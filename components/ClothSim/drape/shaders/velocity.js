// velocity.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 4) 속도 V = (P - X) / dt, X = P  (붙은 패널 attach=1 은 속도 0, 속막 attach=2 는 천과 같음)
//    1단계(입히기) 중에는 속도 0: 위치만 제약과 충돌로 풀어 감 (겹침을 밀어낸 속도로 튀지 않게)
@group(0) @binding(1) var<storage, read> P: array<f32>;
@group(0) @binding(2) var<storage, read_write> X: array<f32>;
@group(0) @binding(3) var<storage, read_write> V: array<f32>;
@group(0) @binding(4) var<storage, read> attach: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= prm.n) { return; }
  let p = vec3f(P[3u*i], P[3u*i+1u], P[3u*i+2u]);
  let x = vec3f(X[3u*i], X[3u*i+1u], X[3u*i+2u]);
  var v = (p - x) / prm.dt;
  if (attach[i] == 1u || prm.dress != 0u) { v = vec3f(0.0); }
  V[3u*i] = v.x; V[3u*i+1u] = v.y; V[3u*i+2u] = v.z;
  X[3u*i] = p.x; X[3u*i+1u] = p.y; X[3u*i+2u] = p.z;
}
`;
