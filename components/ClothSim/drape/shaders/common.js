// common.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 모든 계산 셰이더 공통: 설정값(uniform) 과 구조체. JS 가 각 계산 셰이더 앞에 붙인다. 단위 cm, g, 초.
struct Params {
  n: u32, ne: u32, ns: u32, nb: u32,
  dt: f32, gravity: f32, damping: f32, seam_factor: f32,
  mu_s: f32, mu_k: f32, push_radius: f32, thickness: f32,
  max_dist: f32, tear_on: u32, tear_scale: f32, seam_tear_cm: f32,
  ngroups: u32, weld_on: u32, push_on: u32, nbv: u32,
  gox: f32, goy: f32, goz: f32, cell: f32,
  gdx: i32, gdy: i32, gdz: i32, margin: f32,
  g_start_off: u32, g_tris_off: u32, g_inside_off: u32, body_kind: u32,
  pa: f32, pb: f32, py_top: f32, py_bottom: f32,
  hx: f32, hy: f32, hz: f32, hr: f32,
  ncons: u32, ntri: u32, frame: u32, tear_armed: u32,
  seam_tear_on: u32, n_stretch: u32, push_depth: f32, hash_cell: f32,
  hash_size: u32, hash_slots: u32, e_start_off: u32, e_list_off: u32,
  ncaps: u32, pad0: u32, pad1: u32, pad2: u32,
};
@group(0) @binding(0) var<uniform> prm: Params;

// 제약 하나: 늘어남(kind 0), 굽힘(1), 봉제(2). comp = XPBD 유연도 cm/dyne (0 = 단단함)
struct Edge { a: u32, b: u32, r: f32, k: f32, link: i32, limit: f32, comp: f32, kind: u32, };
struct Bind { idx: u32, t0: u32, t1: u32, t2: u32, w0: f32, w1: f32, w2: f32, off: f32, };
struct Tri { a: u32, b: u32, c: u32, mesh: u32, };
`;
