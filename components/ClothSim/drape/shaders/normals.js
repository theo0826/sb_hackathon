// normals.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 8) 그리기용 정점 법선: 이어진 삼각형(찢어진 것 제외) 면 법선 합
@group(0) @binding(1) var<storage, read> X: array<f32>;
@group(0) @binding(2) var<storage, read> tris: array<Tri>;
@group(0) @binding(3) var<storage, read> vtadj: array<u32>;    // [시작(n+1), 삼각형 번호]
@group(0) @binding(4) var<storage, read> tri_dead: array<u32>;
@group(0) @binding(5) var<storage, read_write> N: array<f32>;

fn ld(i: u32) -> vec3f { return vec3f(X[3u*i], X[3u*i+1u], X[3u*i+2u]); }

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= prm.n) { return; }
  var s = vec3f(0.0);
  for (var k = vtadj[i]; k < vtadj[i + 1u]; k++) {
    let t = vtadj[prm.n + 1u + k];
    if (tri_dead[t] != 0u) { continue; }
    let tr = tris[t];
    let a = ld(tr.a);
    s += cross(ld(tr.b) - a, ld(tr.c) - a);
  }
  let l = length(s);
  if (l > 0.0) { s = s / l; } else { s = vec3f(0.0, 1.0, 0.0); }
  N[3u*i] = s.x; N[3u*i+1u] = s.y; N[3u*i+2u] = s.z;
}
`;
