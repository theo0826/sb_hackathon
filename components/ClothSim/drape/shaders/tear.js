// tear.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 6) 찢어짐 (프레임마다, 봉제선 당김이 끝난 뒤부터):
//    원단 = 늘어남 변 길이가 정지 길이 x limit x tear_scale 을 넘으면 끊김 (굽힘 쌍은 걸친 변을 따라 같이 끊김)
//    (봉제선 터짐은 weld.wgsl 에서)
//    한번 끊기면 처음부터 다시 할 때까지 그대로
@group(0) @binding(1) var<storage, read> X: array<f32>;
@group(0) @binding(2) var<storage, read> edges: array<Edge>;
@group(0) @binding(3) var<storage, read_write> broken: array<u32>;

fn ld(i: u32) -> vec3f { return vec3f(X[3u*i], X[3u*i+1u], X[3u*i+2u]); }

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (prm.tear_armed == 0u) { return; }
  if (i < prm.n_stretch) {
    if (prm.tear_on == 0u) { return; }
    let ed = edges[i];
    let L = length(ld(ed.b) - ld(ed.a));
    if (L > ed.r * (1.0 + (ed.limit - 1.0) * prm.tear_scale)) { broken[i] = 1u; }
  }
}
`;
