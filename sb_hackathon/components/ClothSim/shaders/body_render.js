// body_render.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 몸(마네킹) 그리기: 꼭짓점마다 위치(3) 법선(3)
struct View {
  vp: mat4x4f,
  eye: vec4f,
  flags: vec4u,
  colors: array<vec4f, 64>,
};
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<storage, read> verts: array<f32>;
@group(0) @binding(2) var<storage, read> idx: array<u32>;

struct VOut { @builtin(position) pos: vec4f, @location(0) n: vec3f, @location(1) w: vec3f, };

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VOut {
  let i = idx[vi];
  let p = vec3f(verts[6u*i], verts[6u*i+1u], verts[6u*i+2u]);
  var o: VOut;
  o.pos = view.vp * vec4f(p, 1.0);
  o.n = vec3f(verts[6u*i+3u], verts[6u*i+4u], verts[6u*i+5u]);
  o.w = p;
  return o;
}

@fragment
fn fs(i: VOut) -> @location(0) vec4f {
  var n = normalize(i.n);
  if (dot(n, normalize(view.eye.xyz - i.w)) < 0.0) { n = -n; }
  let base = pow(view.colors[63].rgb, vec3f(2.2));
  let l1 = normalize(vec3f(0.5, 1.0, 0.7));
  let lit = mix(0.35, 0.6, n.y * 0.5 + 0.5) + 0.6 * max(dot(n, l1), 0.0);
  return vec4f(pow(base * lit, vec3f(1.0 / 2.2)), 1.0);
}
`;
