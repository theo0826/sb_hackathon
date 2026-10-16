// xpbd.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// XPBD 거리 제약 (Macklin 2016), 색칠한 묶음 하나씩 (같은 색 제약은 점을 공유하지 않아 바로 고쳐 써도 됨 = Gauss-Seidel)
//   C = |pb - pa| - rest,  dλ = (-C - α̃ λ) / (wa + wb + α̃),  α̃ = 유연도 / dt²
//   봉제 제약(kind 2)은 봉제 중에만 (정지 길이가 처음 간격에서 0 으로 줄어듦), 다 꿰매면 점 합치기(weld.wgsl)로 넘어감
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

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  if (g.x >= rg.cnt) { return; }
  let c = clist[rg.off + g.x];
  let ed = cons[c];
  var brk = broken[c];
  if (ed.link >= 0) { brk = brk | broken[u32(ed.link)]; }
  if (brk != 0u) { return; }
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
