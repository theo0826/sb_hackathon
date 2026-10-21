// shell_side.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 이중막: 속막 점이 짝 겉막 점의 바깥으로 넘어가지 못하게 (한쪽 방향 제약)
//   n = 겉막 점의 바깥 방향 법선 (겉막 삼각형만으로 계산, 처음 배치에서 정한 부호)
//   d = (속 - 겉) . n  이  -최소간격 보다 크면 (속막이 너무 바깥) 두 점을 질량비로 n 방향으로 벌림
//   최소간격 = 처음 간격 x shell_min. 겉, 속 짝마다 두 점만 고치므로 짝끼리는 겹치지 않음
struct Pair { o: u32, i: u32, nout: u32, sgap: f32, };   // sgap = 부호 x 처음 간격
@group(0) @binding(1) var<storage, read_write> P: array<f32>;
@group(0) @binding(2) var<storage, read> pairs: array<Pair>;
@group(0) @binding(3) var<storage, read> tris: array<Tri>;
@group(0) @binding(4) var<storage, read> vtadj: array<u32>;
@group(0) @binding(5) var<storage, read> invm: array<f32>;

fn ld(i: u32) -> vec3f { return vec3f(P[3u*i], P[3u*i+1u], P[3u*i+2u]); }
fn st(i: u32, p: vec3f) { P[3u*i] = p.x; P[3u*i+1u] = p.y; P[3u*i+2u] = p.z; }

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let k = g.x;
  if (k >= prm.nshell) { return; }
  let pr = pairs[k];
  let no = pr.nout;   // 이 번호부터 속막 점
  var s = vec3f(0.0);
  for (var j = vtadj[pr.o]; j < vtadj[pr.o + 1u]; j++) {
    let t = tris[vtadj[prm.n + 1u + j]];
    // 겉막 삼각형만 (속막, 테두리 삼각형 제외)
    if (t.a >= no || t.b >= no || t.c >= no) { continue; }
    let a = ld(t.a);
    s += cross(ld(t.b) - a, ld(t.c) - a);
  }
  let l = length(s);
  if (l < 1e-12) { return; }
  let n = s / l * sign(pr.sgap);
  let po = ld(pr.o);
  let pi = ld(pr.i);
  let d = dot(pi - po, n);
  let lim = -abs(pr.sgap) * prm.shell_min;
  if (d <= lim) { return; }
  let wo = invm[pr.o];
  let wi = invm[pr.i];
  let w = wo + wi;
  if (w <= 0.0) { return; }
  let c = d - lim;   // 이만큼 속막이 바깥으로 나옴
  st(pr.i, pi - n * (c * wi / w));
  st(pr.o, po + n * (c * wo / w));
}
`;
