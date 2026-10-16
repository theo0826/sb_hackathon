// hash_insert.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 천 삼각형을 걸친 칸(hash_cell cm)들의 해시 통에 넣기. 통마다 hash_slots 개까지 (넘치면 버림)
@group(0) @binding(1) var<storage, read> P: array<f32>;
@group(0) @binding(2) var<storage, read> tris: array<Tri>;
@group(0) @binding(3) var<storage, read> tri_dead: array<u32>;
@group(0) @binding(4) var<storage, read_write> hcnt: array<atomic<u32>>;
@group(0) @binding(5) var<storage, read_write> hslot: array<u32>;

fn ld(i: u32) -> vec3f { return vec3f(P[3u*i], P[3u*i+1u], P[3u*i+2u]); }
fn hash3(x: i32, y: i32, z: i32) -> u32 {
  return ((bitcast<u32>(x) * 73856093u) ^ (bitcast<u32>(y) * 19349663u) ^ (bitcast<u32>(z) * 83492791u)) % prm.hash_size;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let t = g.x;
  if (t >= prm.ntri || tri_dead[t] != 0u) { return; }
  let tr = tris[t];
  let a = ld(tr.a); let b = ld(tr.b); let c = ld(tr.c);
  let r = prm.push_radius;
  let lo = vec3i(floor((min(a, min(b, c)) - vec3f(r)) / prm.hash_cell));
  let hi = vec3i(floor((max(a, max(b, c)) + vec3f(r)) / prm.hash_cell));
  let span = hi - lo + vec3i(1);
  if (span.x * span.y * span.z > 64) { return; }
  for (var z = lo.z; z <= hi.z; z++) {
    for (var y = lo.y; y <= hi.y; y++) {
      for (var x = lo.x; x <= hi.x; x++) {
        let h = hash3(x, y, z);
        let s = atomicAdd(&hcnt[h], 1u);
        if (s < prm.hash_slots) { hslot[h * prm.hash_slots + s] = t; }
      }
    }
  }
}
`;
