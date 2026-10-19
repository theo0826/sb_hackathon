// hash_clear.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 천 삼각형 공간 해시 비우기 (작은 시간 단계마다 천이 움직이므로 다시 만듦)
@group(0) @binding(1) var<storage, read_write> hcnt: array<atomic<u32>>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  if (g.x < prm.hash_size) { atomicStore(&hcnt[g.x], 0u); }
}
`;
