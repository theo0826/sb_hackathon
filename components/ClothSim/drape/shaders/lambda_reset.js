// lambda_reset.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// XPBD 라그랑주 승수는 작은 시간 단계마다 0 에서 시작
@group(0) @binding(1) var<storage, read_write> lambda: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  if (g.x < prm.ncons) { lambda[g.x] = 0.0; }
}
`;
