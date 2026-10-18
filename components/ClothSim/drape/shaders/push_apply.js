// push_apply.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 몸 점이 민 양의 평균을 천 점에 적용하고 누적값 비우기 (부착 점은 그대로)
@group(0) @binding(1) var<storage, read_write> P: array<f32>;
@group(0) @binding(2) var<storage, read_write> acc: array<atomic<i32>>;
@group(0) @binding(3) var<storage, read> invm: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let v = g.x;
  if (v >= prm.n) { return; }
  let c = atomicLoad(&acc[3u*prm.n + v]);
  if (c <= 0) { return; }
  let d = vec3f(f32(atomicLoad(&acc[3u*v])), f32(atomicLoad(&acc[3u*v+1u])), f32(atomicLoad(&acc[3u*v+2u]))) * (1e-4 / f32(c));
  if (invm[v] > 0.0) {
    P[3u*v] += d.x; P[3u*v+1u] += d.y; P[3u*v+2u] += d.z;
  }
  atomicStore(&acc[3u*v], 0); atomicStore(&acc[3u*v+1u], 0); atomicStore(&acc[3u*v+2u], 0);
  atomicStore(&acc[3u*prm.n + v], 0);
}
`;
