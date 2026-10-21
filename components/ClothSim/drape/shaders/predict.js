// predict.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 1) 중력, 감쇠(작은 단계마다 exp(-감쇠율 dt)), 예측 위치 P = X + V dt
//    attach: 0 = 천(겉막), 1 = 붙은 패널(움직이지 않음), 2 = 이중막 속막(겉막과 같이 움직이는 천)
@group(0) @binding(1) var<storage, read> X: array<f32>;
@group(0) @binding(2) var<storage, read_write> V: array<f32>;
@group(0) @binding(3) var<storage, read_write> P: array<f32>;
@group(0) @binding(4) var<storage, read> attach: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= prm.n) { return; }
  var v = vec3f(V[3u*i], V[3u*i+1u], V[3u*i+2u]);
  if (attach[i] != 1u) { v.y -= prm.gravity * prm.dt; }
  v *= prm.damping;
  V[3u*i] = v.x; V[3u*i+1u] = v.y; V[3u*i+2u] = v.z;
  let x = vec3f(X[3u*i], X[3u*i+1u], X[3u*i+2u]);
  let p = x + v * prm.dt;
  P[3u*i] = p.x; P[3u*i+1u] = p.y; P[3u*i+2u] = p.z;
}
`;
