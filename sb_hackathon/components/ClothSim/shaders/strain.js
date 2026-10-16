// strain.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 7) 늘어남 표시값 (정점마다): 이어진 늘어남 변 중 가장 많이 늘어난 정도를 찢어짐 기준 대비 비율로
//    0 = 정지 길이 이하, 1 = 찢어지는 길이.  strain_raw 에는 길이 / 정지 길이 최댓값
@group(0) @binding(1) var<storage, read> X: array<f32>;
@group(0) @binding(2) var<storage, read> edges: array<Edge>;
@group(0) @binding(3) var<storage, read> adj: array<i32>;
@group(0) @binding(4) var<storage, read> broken: array<u32>;
@group(0) @binding(5) var<storage, read_write> strain: array<f32>;   // [비율 n, 늘어남 배수 n]

fn ld(i: u32) -> vec3f { return vec3f(X[3u*i], X[3u*i+1u], X[3u*i+2u]); }

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= prm.n) { return; }
  var frac = 0.0;
  var raw = 1.0;
  let e0 = adj[prm.e_start_off + i];
  let e1 = adj[prm.e_start_off + i + 1u];
  for (var k = e0; k < e1; k++) {
    let e = u32(abs(adj[prm.e_list_off + u32(k)]) - 1);
    if (e >= prm.n_stretch || broken[e] != 0u) { continue; }
    let ed = edges[e];
    let ratio = length(ld(ed.b) - ld(ed.a)) / max(ed.r, 1e-6);
    let lim = 1.0 + (ed.limit - 1.0) * prm.tear_scale;
    frac = max(frac, (ratio - 1.0) / max(lim - 1.0, 1e-4));
    raw = max(raw, ratio);
  }
  strain[i] = frac;
  strain[prm.n + i] = raw;
}
`;
