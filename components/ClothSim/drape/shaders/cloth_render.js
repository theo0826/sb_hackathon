// cloth_render.wgsl (WGSL 셰이더 원문. 고칠 때는 이 문자열 안을 고치면 됨)
export default /* wgsl */ `
// 천 그리기: 계산 결과 버퍼(X, N)를 그대로 읽는다 (CPU 로 복사 없음). 늘어남 색은 켜기/끄기
// 원단 질감: 도면 좌표 uv (cm, y = 결 방향) 위에 원단마다 짜임/조직 높이를 만들어 법선을 기울이고 색을 섞음
//   니트(저지), 플리스/테리, 리브, 울 니트(코), 와플, 피케, 우븐(포플린, 옥스포드, 린넨, 샴브레이, 나일론), 데님, 코듀로이, 기모 우븐
//   화면에서 한 화소보다 작아지는 무늬는 fwidth 로 줄여서 떨림(무아레)을 막음. 가까이 보면 짜임이 드러남
// 표면 무늬(줄무늬, 체크, 멜란지)와 가공(워싱, 산 워싱, 피그먼트)도 여기서
// (그리기 셰이더에는 common.wgsl 을 붙이지 않는다)
struct Tri { a: u32, b: u32, c: u32, mesh: u32, };
struct View {
  vp: mat4x4f,
  eye: vec4f,
  flags: vec4u,          // x = 늘어남 색
  colors: array<vec4f, 64>,
  mats: array<vec4f, 64>,   // 메쉬마다 (원단 종류, 무늬 주기 cm, 광택, 변형)
  surf0: vec4f,             // (무늬 종류, 방향, 폭 cm, 가공)
  surf1: vec4f,             // 둘째 색 rgb, 체크 종류
};
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<storage, read> X: array<f32>;
@group(0) @binding(2) var<storage, read> N: array<f32>;
@group(0) @binding(3) var<storage, read> tris: array<Tri>;
@group(0) @binding(4) var<storage, read> tri_dead: array<u32>;
@group(0) @binding(5) var<storage, read> strain: array<f32>;
@group(0) @binding(6) var<storage, read> UV: array<f32>;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) n: vec3f,
  @location(1) w: vec3f,
  @location(2) col: vec3f,
  @location(3) s: f32,
  @location(4) uv: vec2f,
  @location(5) @interpolate(flat) mesh: u32,
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
  o.uv = vec2f(UV[2u*i], UV[2u*i+1u]);
  o.mesh = tr.mesh;
  return o;
}

fn heat(t: f32) -> vec3f {
  let x = clamp(t, 0.0, 1.0);
  return select(mix(vec3f(1.0, 0.85, 0.1), vec3f(0.9, 0.08, 0.05), (x - 0.5) * 2.0),
                mix(vec3f(0.2, 0.75, 0.35), vec3f(1.0, 0.85, 0.1), x * 2.0), x < 0.5);
}

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn vnoise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x), mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x), u.y);
}
const PI = 3.14159265;

// 원단 높이 (0~1). x = 가로(씨실/코스), y = 결(날실/웨일) 방향
fn height(kind: i32, q: vec2f, aux: f32) -> f32 {
  switch (kind) {
    case 0: { return 0.5 + 0.5 * abs(sin(PI * q.x)); }                                  // 저지: 웨일
    case 2: { let r = 0.5 + 0.5 * cos(2.0 * PI * q.x); return r * r; }                  // 리브: 세로 골
    case 3: {                                                                            // 울 니트(메리야스): 코 하나 = 기울어진 고리 두 개가 V 를 이룸
      let cell = vec2f(fract(q.x) - 0.5, fract(q.y / 0.75) - 0.5);   // 코 폭 1, 높이 0.75
      var hmax = 0.0;
      for (var s = -1; s <= 1; s += 2) {
        let c = vec2f(f32(s) * 0.25, 0.0);
        let d = cell - c;
        let a = -f32(s) * 0.45;                                         // 고리 기울기 (아래로 모이는 V)
        let r = vec2f(cos(a) * d.x - sin(a) * d.y, sin(a) * d.x + cos(a) * d.y);
        let e = length(vec2f(r.x / 0.24, r.y / 0.5));
        hmax = max(hmax, 1.0 - smoothstep(0.55, 1.0, e));
      }
      return hmax;
    }
    case 4: { let a = 0.5 - 0.5 * cos(2.0 * PI * q.x); let b = 0.5 - 0.5 * cos(2.0 * PI * q.y); return 1.0 - a * b; }   // 와플
    case 5: { let g = fract(q + vec2f(0.5 * floor(q.y), 0.0)) - 0.5; return 1.0 - smoothstep(0.15, 0.45, length(g)); } // 피케
    case 6: {                                                                            // 우븐
      if (aux > 0.5 && aux < 1.5) { let b = fract(q * 0.5) - 0.5; return 0.5 + 0.5 * sign(b.x * b.y) * 0.6; }   // 옥스포드 바스켓
      return 0.5 + 0.25 * (sin(2.0 * PI * q.x) + sin(2.0 * PI * q.y));
    }
    case 7: { return 0.5 + 0.5 * sin(2.0 * PI * (q.x + q.y)); }                         // 데님 능직 (사선)
    case 8: { return abs(sin(PI * q.x)); }                                               // 코듀로이 골
    default: { return 0.5; }
  }
}

@fragment
fn fs(i: VOut, @builtin(front_facing) ff: bool) -> @location(0) vec4f {
  // 미분은 분기 전에 (균일 제어 흐름)
  let dp1 = dpdx(i.w); let dp2 = dpdy(i.w);
  let du1 = dpdx(i.uv); let du2 = dpdy(i.uv);
  let fw = max(length(du1), length(du2));   // 한 화소가 덮는 도면 거리 cm

  var n = normalize(i.n);
  let v = normalize(view.eye.xyz - i.w);
  if (dot(n, v) < 0.0) { n = -n; }
  let m = view.mats[min(i.mesh, 63u)];
  let kind = i32(m.x + 0.5);
  let period = max(m.y, 0.05);
  let sheen = m.z;
  let aux = m.w;
  var base = pow(i.col, vec3f(2.2));

  // ---- 표면 무늬 (도면 좌표 기준) ----
  let sk = i32(view.surf0.x + 0.5);
  let col2 = pow(view.surf1.xyz, vec3f(2.2));
  let sw = max(view.surf0.z, 0.2);
  if (sk == 1) {                                         // 멜란지: 섬유 점
    let sp = vnoise(i.uv * vec2f(9.0, 2.5));
    base = base * mix(0.82, 1.18, sp);
  } else if (sk == 2) {                                  // 줄무늬
    let dir = i32(view.surf0.y + 0.5);
    var c = i.uv.y;
    if (dir == 1) { c = i.uv.x; } else if (dir == 2) { c = (i.uv.x + i.uv.y) * 0.7071; }
    let aa = clamp(fw / sw, 0.0, 0.5);
    let band = smoothstep(0.5 - aa, 0.5 + aa, fract(c / (2.0 * sw)));
    base = mix(base, col2, band);
  } else if (sk == 3) {                                  // 체크
    let aa = clamp(fw / sw, 0.0, 0.5);
    let bx = smoothstep(0.5 - aa, 0.5 + aa, fract(i.uv.x / (2.0 * sw)));
    let by = smoothstep(0.5 - aa, 0.5 + aa, fract(i.uv.y / (2.0 * sw)));
    let ck = i32(view.surf1.w + 0.5);
    if (ck == 3) {                                       // 윈도페인: 큰 칸을 이루는 가는 선
      let lx = step(0.94, abs(fract(i.uv.x / (6.0 * sw)) - 0.5) * 2.0);
      let ly = step(0.94, abs(fract(i.uv.y / (6.0 * sw)) - 0.5) * 2.0);
      base = mix(base, col2, max(lx, ly));
    } else {                                             // 깅엄, 타탄, 버펄로: 겹친 곳이 진하게
      let t = (bx + by) * 0.5;
      base = mix(base, col2, t);
      if (ck == 1) { base = mix(base, base * 0.6, bx * by * 0.5); }   // 타탄: 교차 더 진하게
    }
  }

  // ---- 원단 질감 ----
  let q = i.uv / period;
  // 무늬가 화소보다 작으면 약하게 (떨림 방지)
  let detail = clamp(1.6 - fw / period * 1.6, 0.0, 1.0);
  var amp = 0.0;
  switch (kind) {
    case 0: { amp = 0.25; }
    case 2: { amp = 1.0; }
    case 3: { amp = 1.0; }
    case 4: { amp = 0.9; }
    case 5: { amp = 0.6; }
    case 6: { amp = 0.35; }
    case 7: { amp = 0.6; }
    case 8: { amp = 1.2; }
    default: { amp = 0.0; }
  }
  amp *= detail;
  if (amp > 0.0) {
    // 도면 좌표 기울기 -> 세계 좌표 접선 (화면 미분으로 만든 접선 틀)
    let dp2perp = cross(dp2, n); let dp1perp = cross(n, dp1);
    let T = dp2perp * du1.x + dp1perp * du2.x;
    let B = dp2perp * du1.y + dp1perp * du2.y;
    let inv = inverseSqrt(max(max(dot(T, T), dot(B, B)), 1e-12));
    let e = 0.08;
    let hx = (height(kind, q + vec2f(e, 0.0), aux) - height(kind, q - vec2f(e, 0.0), aux)) / (2.0 * e);
    let hy = (height(kind, q + vec2f(0.0, e), aux) - height(kind, q - vec2f(0.0, e), aux)) / (2.0 * e);
    n = normalize(n - amp * 0.35 * (hx * T + hy * B) * inv);
    // 골 안쪽은 조금 어둡게 (짜임 그늘)
    let h = height(kind, q, aux);
    let lo = select(0.72, 0.86, kind == 3);   // 니트는 홈 그늘을 약하게 (쇠사슬처럼 보이지 않게)
    base = base * mix(1.0, mix(lo, 1.04, h), detail * min(amp, 1.0));
  }
  // 재질별 색 변화
  if (kind == 1 || kind == 9) {                          // 플리스, 테리, 기모: 보풀 얼룩
    base = base * mix(0.93, 1.05, vnoise(i.uv * 1.7));
  } else if (kind == 3) {                                // 울: 섬유 털
    base = base * mix(0.9, 1.08, vnoise(i.uv * 6.0));
  } else if (kind == 6 && aux > 1.5 && aux < 2.5) {      // 린넨: 굵은 실 마디 (가로 줄)
    base = base * mix(0.9, 1.08, vnoise(vec2f(i.uv.x * 0.6, i.uv.y * 9.0)));
  } else if ((kind == 6 && aux > 2.5 && aux < 3.5) || kind == 7) {   // 샴브레이, 데님: 흰 씨실이 섞임
    let wv = vnoise(vec2f(i.uv.x * 14.0, i.uv.y * 2.0));
    base = mix(base, base * 1.5 + vec3f(0.05), 0.18 + 0.12 * wv * detail);
    if (kind == 7) { base = base * mix(0.86, 1.08, vnoise(vec2f(i.uv.x * 0.8, i.uv.y * 0.15))); }   // 데님 세로 얼룩
  }
  // 가공
  let fin = i32(view.surf0.w + 0.5);
  if (fin == 1) { let g = dot(base, vec3f(0.3, 0.59, 0.11)); base = mix(base, vec3f(g), 0.18) * mix(0.95, 1.08, vnoise(i.uv * 0.5)); }   // 워싱
  else if (fin == 2) { base = mix(base, base * 2.2 + vec3f(0.08), smoothstep(0.55, 0.8, vnoise(i.uv * 0.35)) * 0.7); }                   // 산 워싱
  else if (fin == 3) { base = base * mix(0.8, 1.12, vnoise(i.uv * 0.25)); }                                                              // 피그먼트

  if (view.flags.x != 0u) { base = mix(base, pow(heat(i.s), vec3f(2.2)), select(0.85, 0.0, i.s <= 0.02)); }

  // ---- 빛: 감싸는 확산광 + 천 광택(스치는 각도에서 밝아지는 보풀 광) ----
  let l1 = normalize(vec3f(0.5, 1.0, 0.7));
  let l2 = normalize(vec3f(-0.7, 0.3, -0.6));
  let wrap = select(0.25, 0.45, kind == 1 || kind == 9 || kind == 3);
  let d1 = max((dot(n, l1) + wrap) / (1.0 + wrap), 0.0);
  let d2 = max((dot(n, l2) + wrap) / (1.0 + wrap), 0.0);
  let hemi = mix(0.3, 0.55, n.y * 0.5 + 0.5);
  var c = base * (hemi + 0.7 * d1 + 0.22 * d2);
  let nv = max(dot(n, v), 0.0);
  c += base * sheen * pow(1.0 - nv, 4.0) * 0.9;                       // 보풀 광택
  let hv = normalize(l1 + v);
  // 또렷한 반사점은 나일론처럼 광택이 큰 우븐만 (sheen >= 0.5). 저지, 면은 무광이라 반사점을 넣으면
  // 어두운 색에서 젖은 얼룩처럼 보임. 넓게 퍼진 약한 반사(지수 12)로 둠
  c += vec3f(sheen * 0.18) * pow(max(dot(n, hv), 0.0), 12.0) * select(0.0, 1.0, kind == 6 && sheen >= 0.5);
  return vec4f(pow(c, vec3f(1.0 / 2.2)), 1.0);
}
`;
