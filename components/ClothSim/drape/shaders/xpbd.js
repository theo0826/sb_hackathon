// xpbd.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// XPBD 제약 (Macklin 2016), 색칠한 묶음 하나씩 (같은 색 제약은 점을 공유하지 않아 바로 고쳐 써도 됨 = Gauss-Seidel)
//   dλ = (-C - α̃ λ) / (Σ w_i |∇C_i|² + α̃),  α̃ = 유연도 / dt²,  Δx_i = w_i ∇C_i dλ
//   늘어남(0), 봉제(2): 거리 C = |pb - pa| - rest
//     봉제는 봉제 중에만 (정지 길이가 처음 간격에서 0 으로 줄어듦), 다 꿰매면 점 합치기(weld.wgsl)로 넘어감
//   굽힘(1), 봉제선 굽힘(3): 이면각 C = θ - θ0 (Bridson 2003 기울기). 거리 방식과 달리 평평할 때도 힘이 이어지고
//     접힌 각도에 비례해서 천처럼 부드럽게 휨. 봉제선 굽힘은 봉제를 합친 뒤에만
struct Range { off: u32, cnt: u32, p0: u32, p1: u32, };
@group(1) @binding(0) var<uniform> rg: Range;
@group(0) @binding(1) var<storage, read_write> P: array<f32>;
@group(0) @binding(2) var<storage, read> cons: array<Edge>;
@group(0) @binding(3) var<storage, read> invm: array<f32>;
@group(0) @binding(4) var<storage, read_write> lambda: array<f32>;
@group(0) @binding(5) var<storage, read> broken: array<u32>;
@group(0) @binding(6) var<storage, read> clist: array<u32>;

fn ld(i: u32) -> vec3f { return vec3f(P[3u*i], P[3u*i+1u], P[3u*i+2u]); }
fn st(i: u32, p: vec3f) { P[3u*i] = p.x; P[3u*i+1u] = p.y; P[3u*i+2u] = p.z; }

// x1, x2 = 날개, x3, x4 = 접는 변
fn solve_bend(c: u32, ed: Edge) {
  let hinge = cons[u32(ed.link)];
  let i1 = ed.a; let i2 = ed.b; let i3 = hinge.a; let i4 = hinge.b;
  let x1 = ld(i1); let x2 = ld(i2); let x3 = ld(i3); let x4 = ld(i4);
  let e = x4 - x3;
  let le = length(e);
  let n1 = cross(x1 - x3, x1 - x4);
  let n2 = cross(x2 - x4, x2 - x3);
  let q1 = dot(n1, n1); let q2 = dot(n2, n2);
  if (le < 1e-6 || q1 < 1e-12 || q2 < 1e-12) { return; }
  let a = n1 / sqrt(q1); let b = n2 / sqrt(q2);
  let th = atan2(dot(cross(a, b), e) / le, dot(a, b));
  var C = th - ed.r;
  if (C > 3.14159265) { C -= 6.28318531; } else if (C < -3.14159265) { C += 6.28318531; }
  // ∇θ = -(g1, g2, g3, g4)
  let g1 = -n1 * (le / q1);
  let g2 = -n2 * (le / q2);
  let g3 = -(n1 * (dot(x1 - x4, e) / le / q1) + n2 * (dot(x2 - x4, e) / le / q2));
  let g4 = (n1 * (dot(x1 - x3, e) / le / q1) + n2 * (dot(x2 - x3, e) / le / q2));
  let w1 = invm[i1]; let w2 = invm[i2]; let w3 = invm[i3]; let w4 = invm[i4];
  let at = ed.comp / (prm.dt * prm.dt);
  let den = w1 * dot(g1, g1) + w2 * dot(g2, g2) + w3 * dot(g3, g3) + w4 * dot(g4, g4) + at;
  if (den <= 1e-20) { return; }
  let dl = (-C - at * lambda[c]) / den;
  lambda[c] += dl;
  st(i1, x1 + g1 * (w1 * dl));
  st(i2, x2 + g2 * (w2 * dl));
  st(i3, x3 + g3 * (w3 * dl));
  st(i4, x4 + g4 * (w4 * dl));
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  if (g.x >= rg.cnt) { return; }
  let c = clist[rg.off + g.x];
  let ed = cons[c];
  var brk = broken[c];
  if (ed.link >= 0) { brk = brk | broken[u32(ed.link)]; }
  if (brk != 0u) { return; }
  if (ed.kind == 1u || ed.kind == 3u) {
    if (ed.kind == 3u && prm.weld_on == 0u) { return; }
    solve_bend(c, ed);
    return;
  }
  var rest = ed.r;
  if (ed.kind == 2u) {
    if (prm.weld_on != 0u) { return; }
    rest = ed.r * prm.seam_factor;
  }
  let wa = invm[ed.a];
  let wb = invm[ed.b];
  let at = ed.comp / (prm.dt * prm.dt);
  let den = wa + wb + at;
  if (den <= 0.0) { return; }
  let pa = ld(ed.a);
  let pb = ld(ed.b);
  let d = pb - pa;
  let L = length(d);
  if (L < 1e-9) { return; }
  let n = d / L;
  let dl = (-(L - rest) - at * lambda[c]) / den;
  lambda[c] += dl;
  st(ed.a, pa - n * (wa * dl));
  st(ed.b, pb + n * (wb * dl));
}
`;
