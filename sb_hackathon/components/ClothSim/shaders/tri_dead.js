// tri_dead.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 9) 삼각형 숨김 표시: 세 변 중 하나라도 끊겼으면 1 (그리기와 법선에서 뺌)
@group(0) @binding(1) var<storage, read> tri_edges: array<i32>;   // 삼각형마다 늘어남 변 번호 3개 (-1 = 없음)
@group(0) @binding(2) var<storage, read> broken: array<u32>;
@group(0) @binding(3) var<storage, read_write> tri_dead: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let t = g.x;
  if (t >= prm.ntri) { return; }
  var d = 0u;
  for (var k = 0u; k < 3u; k++) {
    let e = tri_edges[3u*t + k];
    if (e >= 0 && broken[u32(e)] != 0u) { d = 1u; }
  }
  tri_dead[t] = d;
}
`;
