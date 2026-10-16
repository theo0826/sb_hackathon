// cloth_render.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 천 그리기: 계산 결과 버퍼(X, N)를 그대로 읽는다 (CPU 로 복사 없음). 늘어남 색은 켜기/끄기
// (그리기 셰이더에는 common.wgsl 을 붙이지 않는다)
struct Tri { a: u32, b: u32, c: u32, mesh: u32, };
struct View {
  vp: mat4x4f,
  eye: vec4f,
  flags: vec4u,          // x = 늘어남 색, y = 와이어 (예비)
  colors: array<vec4f, 64>,
};
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<storage, read> X: array<f32>;
@group(0) @binding(2) var<storage, read> N: array<f32>;
@group(0) @binding(3) var<storage, read> tris: array<Tri>;
@group(0) @binding(4) var<storage, read> tri_dead: array<u32>;
@group(0) @binding(5) var<storage, read> strain: array<f32>;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) n: vec3f,
  @location(1) w: vec3f,
  @location(2) col: vec3f,
  @location(3) s: f32,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VOut {
  var o: VOut;
  let t = vi / 3u;
  let tr = tris[t];
  if (tri_dead[t] != 0u) { o.pos = vec4f(0.0, 0.0, 2.0, 1.0); return o; }
  let c = vi % 3u;
  let i = select(select(tr.c, tr.b, c == 1u), tr.a, c == 0u);
  let p = vec3f(X[3u*i], X[3u*i+1u], X[3u*i+2u]);
  o.pos = view.vp * vec4f(p, 1.0);
  o.n = vec3f(N[3u*i], N[3u*i+1u], N[3u*i+2u]);
  o.w = p;
  o.col = view.colors[tr.mesh].rgb;
  o.s = strain[i];
  return o;
}

fn heat(t: f32) -> vec3f {
  // 0 초록 -> 0.5 노랑 -> 1 빨강 (찢어지는 길이)
  let x = clamp(t, 0.0, 1.0);
  return select(mix(vec3f(1.0, 0.85, 0.1), vec3f(0.9, 0.08, 0.05), (x - 0.5) * 2.0),
                mix(vec3f(0.2, 0.75, 0.35), vec3f(1.0, 0.85, 0.1), x * 2.0), x < 0.5);
}

@fragment
fn fs(i: VOut, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  var n = normalize(i.n);
  let v = normalize(view.eye.xyz - i.w);
  if (dot(n, v) < 0.0) { n = -n; }
  var base = pow(i.col, vec3f(2.2));
  if (view.flags.x != 0u) { base = mix(base, pow(heat(i.s), vec3f(2.2)), select(0.85, 0.0, i.s <= 0.02)); }
  let l1 = normalize(vec3f(0.5, 1.0, 0.7));
  let l2 = normalize(vec3f(-0.7, 0.3, -0.6));
  let hemi = mix(0.35, 0.6, n.y * 0.5 + 0.5);
  let lit = hemi + 0.75 * max(dot(n, l1), 0.0) + 0.25 * max(dot(n, l2), 0.0);
  let c = base * lit;
  return vec4f(pow(c, vec3f(1.0 / 2.2)), 1.0);
}
`;
