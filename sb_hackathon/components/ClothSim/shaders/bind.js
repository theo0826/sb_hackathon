// bind.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 5) 부착 패널(포켓, 플래킷): 앞판 삼각형 무게중심 + 바깥 법선 x offset (프레임마다)
@group(0) @binding(1) var<storage, read_write> X: array<f32>;
@group(0) @binding(2) var<storage, read> binds: array<Bind>;

fn ld(i: u32) -> vec3f { return vec3f(X[3u*i], X[3u*i+1u], X[3u*i+2u]); }

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let k = g.x;
  if (k >= prm.nb) { return; }
  let bd = binds[k];
  let a = ld(bd.t0); let b = ld(bd.t1); let c = ld(bd.t2);
  let base = a * bd.w0 + b * bd.w1 + c * bd.w2;
  var n = cross(b - a, c - a);
  n = n / (length(n) + 1e-9);
  if (n.x * base.x + n.z * base.z < 0.0) { n = -n; }
  let p = base + n * bd.off;
  X[3u*bd.idx] = p.x; X[3u*bd.idx+1u] = p.y; X[3u*bd.idx+2u] = p.z;
}
`;
