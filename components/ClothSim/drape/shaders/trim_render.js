// trim_render.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 부자재 그리기 (drape/trims.js 가 만든 인스턴스). 인스턴스마다 사각형 하나(정점 6개).
// 위치와 법선은 매 프레임 계산 버퍼(X, N)에서 삼각형 무게로 다시 읽음 -> 천을 따라 움직임
//   점 종류(단추, 아일렛, 손잡이): A 위치 중심, A->B 가 위쪽 방향
//   띠 종류(지퍼 이빨, 끈, 박음질, 끈 끝): A 에서 B 까지, 폭 = 크기
struct View {
  vp: mat4x4f,
  eye: vec4f,
  flags: vec4u,
};
struct Inst {
  a0: u32, a1: u32, a2: u32, wa0: f32, wa1: f32, wa2: f32,
  b0: u32, b1: u32, b2: u32, wb0: f32, wb1: f32, wb2: f32,
  kind: u32, size: f32, r: f32, g: f32, b: f32, off: f32, variant: f32, len: f32,
};
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<storage, read> X: array<f32>;
@group(0) @binding(2) var<storage, read> N: array<f32>;
@group(0) @binding(3) var<storage, read> inst: array<Inst>;

fn ld(i: u32) -> vec3f { return vec3f(X[3u*i], X[3u*i+1u], X[3u*i+2u]); }
fn ldn(i: u32) -> vec3f { return vec3f(N[3u*i], N[3u*i+1u], N[3u*i+2u]); }

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) q: vec2f,        // 사각형 안 좌표 (점: -1..1, 띠: u -1..1, v 0..길이cm)
  @location(1) n: vec3f,
  @location(2) w: vec3f,
  @location(3) @interpolate(flat) id: u32,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VOut {
  let it = inst[ii];
  let pa = ld(it.a0) * it.wa0 + ld(it.a1) * it.wa1 + ld(it.a2) * it.wa2;
  let pb = ld(it.b0) * it.wb0 + ld(it.b1) * it.wb1 + ld(it.b2) * it.wb2;
  var na = normalize(ldn(it.a0) * it.wa0 + ldn(it.a1) * it.wa1 + ldn(it.a2) * it.wa2 + vec3f(1e-6));
  var nb = normalize(ldn(it.b0) * it.wb0 + ldn(it.b1) * it.wb1 + ldn(it.b2) * it.wb2 + vec3f(1e-6));
  let sg = sign(it.off);
  na = na * sg; nb = nb * sg;
  let off = abs(it.off);
  // 사각형 모서리 (0,0)(1,0)(1,1) (0,0)(1,1)(0,1)
  var cs = array<vec2f, 6>(vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0));
  let c = cs[vi];
  var o: VOut;
  var p: vec3f;
  var n: vec3f;
  if (it.kind == 0u || it.kind == 4u || it.kind == 5u) {
    n = na;
    var up = pb - pa;
    up = up - n * dot(up, n);
    if (length(up) < 1e-5) { up = vec3f(0.0, 1.0, 0.0); }
    up = normalize(up);
    let rt = normalize(cross(up, n));
    var hx = it.size; var hy = it.size; var cy = 0.0;
    if (it.kind == 4u) { hx = it.size * 0.55; hy = it.size * 1.5; cy = -it.size * 1.1; }   // 손잡이: 아래로 늘어진 판
    let q = vec2f(c.x * 2.0 - 1.0, c.y * 2.0 - 1.0);
    p = pa + n * off + rt * (q.x * hx) + up * (q.y * hy + cy);
    o.q = q;
  } else {
    let d = pb - pa;
    let t = select(normalize(d), vec3f(0.0, 1.0, 0.0), length(d) < 1e-6);
    let nn = mix(na, nb, c.y);
    let side = normalize(cross(nn, t) + vec3f(1e-7));
    let base = mix(pa, pb, c.y);
    p = base + nn * off + side * ((c.x - 0.5) * it.size);
    n = nn;
    o.q = vec2f(c.x * 2.0 - 1.0, c.y * max(it.len, 0.01));
  }
  o.pos = view.vp * vec4f(p, 1.0);
  o.n = n;
  o.w = p;
  o.id = ii;
  return o;
}

fn lit(base: vec3f, n: vec3f, v: vec3f, metal: f32) -> vec3f {
  let l1 = normalize(vec3f(0.5, 1.0, 0.7));
  let l2 = normalize(vec3f(-0.7, 0.3, -0.6));
  let d = max(dot(n, l1), 0.0) * 0.7 + max(dot(n, l2), 0.0) * 0.2 + mix(0.3, 0.5, n.y * 0.5 + 0.5);
  let h = normalize(l1 + v);
  let sp = pow(max(dot(n, h), 0.0), mix(24.0, 60.0, metal)) * mix(0.12, 0.8, metal);
  return base * d + vec3f(sp);
}

@fragment
fn fs(i: VOut) -> @location(0) vec4f {
  let it = inst[i.id];
  var base = pow(vec3f(it.r, it.g, it.b), vec3f(2.2));
  var n = normalize(i.n);
  let v = normalize(view.eye.xyz - i.w);
  if (dot(n, v) < 0.0) { n = -n; }
  let metal = select(0.0, 1.0, it.variant > 0.5 && (it.kind == 0u || it.kind == 1u || it.kind == 4u || it.kind == 5u || it.kind == 6u));
  var col = vec3f(0.0);
  switch (it.kind) {
    case 0u: {                                   // 단추: 원판, 테두리, 구멍 4개
      let r = length(i.q);
      if (r > 1.0) { discard; }
      var shade = 1.0 - 0.18 * smoothstep(0.75, 0.95, r) + 0.08 * (1.0 - r);
      var hole = 0.0;
      if (metal < 0.5) {
        for (var k = 0; k < 4; k++) {
          let hp = vec2f(select(-0.26, 0.26, (k & 1) == 1), select(-0.26, 0.26, (k & 2) == 2));
          hole = max(hole, 1.0 - smoothstep(0.1, 0.14, length(i.q - hp)));
        }
      }
      col = lit(base * shade, n, v, metal) * (1.0 - 0.75 * hole);
    }
    case 5u: {                                   // 아일렛 / 스냅: 고리 + 가운데 어두운 구멍
      let r = length(i.q);
      if (r > 1.0) { discard; }
      if (r < 0.5) { col = base * 0.08; }
      else { col = lit(base * (0.85 + 0.15 * sin((r - 0.5) * 6.28)), n, v, metal); }
    }
    case 4u: {                                   // 지퍼 손잡이: 둥근 사각형
      let q = abs(i.q);
      let dd = length(max(q - vec2f(0.6, 0.8), vec2f(0.0)));
      if (dd > 0.35) { discard; }
      let hole = 1.0 - smoothstep(0.18, 0.22, length(i.q - vec2f(0.0, 0.62)));
      col = lit(base * (1.0 - 0.2 * smoothstep(0.2, 0.35, dd)), n, v, metal) * (1.0 - 0.8 * hole);
    }
    case 1u: {                                   // 지퍼: 가운데 이빨 (번갈아 맞물림) + 양쪽 테이프
      let u = i.q.x;
      if (abs(u) > 1.0) { discard; }
      let tooth = fract(i.q.y / 0.32 + select(0.0, 0.5, u > 0.0));
      let inT = abs(u) < 0.55 && tooth < 0.62;
      if (inT) {
        let bump = 1.0 - abs(u) / 0.55;
        col = lit(base * (0.75 + 0.35 * bump), n, v, metal);
      } else {
        col = lit(base * 0.55, n, v, 0.0);   // 테이프 (이빨 색보다 어둡게)
      }
    }
    case 2u, 6u: {                               // 끈 / 끈 끝: 둥근 단면 음영 (납작한 끈은 평평)
      let u = i.q.x;
      if (abs(u) > 1.0) { discard; }
      var rnd = sqrt(max(0.0, 1.0 - u * u));
      if (it.variant > 0.5 && it.kind == 2u) { rnd = 1.0 - 0.25 * u * u; }
      var tw = 1.0;
      if (it.kind == 2u) { tw = 0.9 + 0.1 * sin((i.q.y * 6.0 + u * 2.0) * 3.14159); }   // 꼰 무늬
      col = lit(base * (0.55 + 0.5 * rnd) * tw, n, v, metal);
    }
    case 3u: {                                   // 박음질: 점선
      let dash = fract(i.q.y / 0.42);
      if (dash > 0.62 || abs(i.q.x) > 1.0) { discard; }
      col = lit(base, n, v, 0.0);
    }
    default: { discard; }
  }
  return vec4f(pow(col, vec3f(1.0 / 2.2)), 1.0);
}
`;
