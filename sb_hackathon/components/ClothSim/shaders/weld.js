// weld.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 봉제 끝난 뒤: 봉제선 짝 점 묶음을 질량 가중 중심 한 점으로 합침 (조각들이 한 장의 천처럼 이어짐)
// 봉제선 터짐(켜졌을 때): 합치기 직전 묶음 점들이 중심에서 seam_tear_cm 넘게 벌어지려 하면 그 묶음은 풀림
@group(0) @binding(1) var<storage, read_write> P: array<f32>;
@group(0) @binding(2) var<storage, read> weld: array<u32>;     // [시작(ngroups+1), 점 목록]
@group(0) @binding(3) var<storage, read_write> gbroken: array<u32>;
@group(0) @binding(4) var<storage, read> invm: array<f32>;

fn ld(i: u32) -> vec3f { return vec3f(P[3u*i], P[3u*i+1u], P[3u*i+2u]); }

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let k = g.x;
  if (k >= prm.ngroups || prm.weld_on == 0u || gbroken[k] != 0u) { return; }
  let s = weld[k];
  let e = weld[k + 1u];
  let base = prm.ngroups + 1u;
  var c = vec3f(0.0);
  var msum = 0.0;
  for (var j = s; j < e; j++) {
    let v = weld[base + j];
    let m = select(1e6, 1.0 / invm[v], invm[v] > 0.0);
    c += ld(v) * m;
    msum += m;
  }
  c /= msum;
  if (prm.seam_tear_on != 0u && prm.tear_armed != 0u) {
    var spread = 0.0;
    for (var j = s; j < e; j++) { spread = max(spread, length(ld(weld[base + j]) - c)); }
    if (spread > prm.seam_tear_cm) { gbroken[k] = 1u; return; }
  }
  for (var j = s; j < e; j++) {
    let v = weld[base + j];
    P[3u*v] = c.x; P[3u*v+1u] = c.y; P[3u*v+2u] = c.z;
  }
}
`;
