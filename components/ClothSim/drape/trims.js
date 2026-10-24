// 부자재(단추, 지퍼, 끈, 앞여밈 박음질) 그리기 데이터 만들기.
// 도면에는 부자재 형상이 없어서 전에는 아무것도 그려지지 않았다 (C++ 엔진은 trims 목록만 내고 장면에 넣지 않음).
// 여기서는 scene.meta.trims (garment/index.js 가 spec 토큰으로 만듦) 와 패널 도면 좌표(uv) 로
// 부자재 위치를 천 삼각형에 묶는다 (삼각형 세 점 + 무게). 그리기 셰이더가 매 프레임 계산 버퍼에서 위치를 다시 읽으므로
// 천이 움직이면 같이 움직인다.
//
// 인스턴스 하나 = u32 x 20
//   0..2 삼각형 점 A, 3..5 무게 A, 6..8 삼각형 점 B, 9..11 무게 B (A 에서 B 쪽 = 방향)
//   12 종류 (0 단추, 1 지퍼 이빨 띠, 2 끈, 3 박음질, 4 지퍼 손잡이, 5 아일렛, 6 끈 끝)
//   13 크기 cm (반지름 또는 폭), 14..16 색 rgb, 17 바깥으로 띄울 거리 cm (부호 = 바깥 방향), 18 변형, 19 길이 cm (띠)
export const TRIM_WORDS = 20;
const K = { button: 0, teeth: 1, cord: 2, stitch: 3, puller: 4, eyelet: 5, tip: 6 };

function hex(c) {
  const s = (c || '#aaaaaa').replace('#', '');
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
}

export function buildTrims(scene) {
  const meta = scene.meta, A = scene.A, tr = meta.trims;
  if (!tr || !A.uv) return null;
  const UV = A.uv, X = A.X, T = A.tris, ntri = meta.n_tris;
  const no = meta.shell && meta.shell.n_outer ? meta.shell.n_outer : meta.n;
  const names = meta.meshes.map(m => m.name);
  const meshIdx = nm => names.indexOf(nm);
  // 메쉬마다 겉막 삼각형 목록
  const trisOf = new Map();
  for (let t = 0; t < ntri; t++) {
    const a = T[4 * t], b = T[4 * t + 1], c = T[4 * t + 2], m = T[4 * t + 3];
    if (a >= no || b >= no || c >= no) continue;
    if (!trisOf.has(m)) trisOf.set(m, []);
    trisOf.get(m).push(t);
  }
  // 바깥 방향 부호: 삼각형 감김 법선이 가장 가까운 몸 점에서 멀어지는 쪽이면 +1
  const BV = A.body_V || new Float32Array(0);
  const nearBody = (p) => {
    let best = 1e30, bi = -1;
    for (let j = 0; j < BV.length; j += 9) { const d = (p[0] - BV[j]) ** 2 + (p[1] - BV[j + 1]) ** 2 + (p[2] - BV[j + 2]) ** 2; if (d < best) { best = d; bi = j; } }
    return bi;
  };
  const P = i => [X[3 * i], X[3 * i + 1], X[3 * i + 2]];
  // 도면 좌표 (x, y) 를 그 메쉬의 삼각형에 묶기. 안에 없으면 가장 가까운 삼각형 경계로 당김
  function bind(m, x, y) {
    const list = trisOf.get(m);
    if (!list) return null;
    let best = null, bestD = 1e30;
    for (const t of list) {
      const a = T[4 * t], b = T[4 * t + 1], c = T[4 * t + 2];
      const ax = UV[2 * a], ay = UV[2 * a + 1], bx = UV[2 * b], by = UV[2 * b + 1], cx = UV[2 * c], cy = UV[2 * c + 1];
      const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(d) < 1e-12) continue;
      let w0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
      let w1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
      let w2 = 1 - w0 - w1;
      const out = Math.max(0, -w0) + Math.max(0, -w1) + Math.max(0, -w2);
      if (out < bestD) {
        bestD = out;
        w0 = Math.max(0, w0); w1 = Math.max(0, w1); w2 = Math.max(0, w2);
        const s = w0 + w1 + w2 || 1;
        best = { v: [a, b, c], w: [w0 / s, w1 / s, w2 / s] };
        if (out === 0) break;
      }
    }
    if (!best || bestD > 0.5) return best && bestD < 3 ? best : null;
    return best;
  }
  const posOf = bd => { const p = [0, 0, 0]; for (let k = 0; k < 3; k++) { const q = P(bd.v[k]); for (let j = 0; j < 3; j++) p[j] += q[j] * bd.w[k]; } return p; };
  function outwardSign(bd) {
    const [a, b, c] = bd.v, pa = P(a), pb = P(b), pc = P(c);
    const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]], v = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const p = posOf(bd), j = nearBody(p);
    if (j < 0) return 1;
    return (n[0] * (p[0] - BV[j]) + n[1] * (p[1] - BV[j + 1]) + n[2] * (p[2] - BV[j + 2])) >= 0 ? 1 : -1;
  }
  const inst = [];
  function push(kind, A0, B0, size, color, off, variant = 0, length = 0) {
    if (!A0 || !B0) return;
    const rgb = hex(color), sg = outwardSign(A0);
    inst.push({ A: A0, B: B0, kind, size, rgb, off: sg * off, variant, length });
  }
  // 한 메쉬 위 도면 좌표 선을 따라 띠 조각들 (step cm 간격)
  function strip(kind, m, pts, step, size, color, off, variant = 0) {
    let prev = null, prevB = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / step));
      for (let k = 0; k <= n; k++) {
        if (i > 0 && k === 0) continue;
        const f = k / n, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
        const b = bind(m, x, y);
        if (prevB && b) push(kind, prevB, b, size, color, off, variant, Math.hypot(x - prev[0], y - prev[1]));
        prev = [x, y]; prevB = b;
      }
    }
  }
  const point = (kind, m, x, y, size, color, off, variant = 0) => push(kind, bind(m, x, y), bind(m, x, y + 1.0), size, color, off, variant);

  // 앞중심 메쉬: 앞이 갈라진 옷이면 front_r(+x), 아니면 front. 앞중심 꼭대기(목 파임) 높이
  const fr = meshIdx('front_r') >= 0 ? meshIdx('front_r') : (meshIdx('front_up_r') >= 0 ? meshIdx('front_up_r') : -1);
  const fl = meshIdx('front_l') >= 0 ? meshIdx('front_l') : (meshIdx('front_up_l') >= 0 ? meshIdx('front_up_l') : -1);
  const fc = meshIdx('front') >= 0 ? meshIdx('front') : (meshIdx('front_up') >= 0 ? meshIdx('front_up') : -1);
  const cfTop = m => { let y = -1e9; for (const t of trisOf.get(m) || []) for (let k = 0; k < 3; k++) { const v = T[4 * t + k]; if (Math.abs(UV[2 * v]) < 1.2) y = Math.max(y, UV[2 * v + 1]); } return y; };
  const cfBot = m => { let y = 1e9; for (const t of trisOf.get(m) || []) for (let k = 0; k < 3; k++) { const v = T[4 * t + k]; if (Math.abs(UV[2 * v]) < 1.2) y = Math.min(y, UV[2 * v + 1]); } return y; };

  const closure = tr.closure, neck = tr.neck;
  const thread = tr.threadColor || '#555555';
  const btnR = 0.55;
  // 앞여밈 (셔츠 단추, 스냅): 앞판 전체 길이. 박음질 두 줄 + 단추
  if ((closure === 'button_front' || closure === 'snap_front') && fr >= 0) {
    const top = cfTop(fr), bot = cfBot(fr);
    if (tr.placket !== 'hidden') {
      strip(K.stitch, fr, [[1.6, bot + 0.3], [1.6, top - 0.3]], 1.5, 0.05, thread, 0.08);
      if (fl >= 0) strip(K.stitch, fl, [[-1.6, bot + 0.3], [-1.6, top - 0.3]], 1.5, 0.05, thread, 0.08);
    }
    const n = tr.buttonCount || 7;
    const y0 = top - 1.6, y1 = bot + Math.min(12, (top - bot) * 0.18);
    for (let i = 0; i < n; i++) {
      const y = y0 + (y1 - y0) * (n === 1 ? 0 : i / (n - 1));
      point(closure === 'snap_front' ? K.eyelet : K.button, fr, 0.35, y, closure === 'snap_front' ? 0.5 : btnR, tr.buttonColor, 0.14, tr.buttonMaterial === 'metal' ? 1 : 0);
    }
  }
  // 반단추(헨리, 하프 버튼): 목에서 아래로 짧은 앞여밈
  const halfPlacket = (neck === 'henley' || closure === 'half_button');
  if (halfPlacket) {
    const m = fc >= 0 ? fc : fr;
    if (m >= 0) {
      const top = cfTop(m), len = neck === 'henley' ? 13 : 18, w = 1.4;
      strip(K.stitch, m, [[-w, top - 0.2], [-w, top - len], [w, top - len], [w, top - 0.2]], 1.2, 0.05, thread, 0.08);
      const n = tr.buttonCount || 3;
      for (let i = 0; i < n; i++) point(K.button, m, 0, top - 1.8 - (len - 3.5) * (n === 1 ? 0 : i / (n - 1)), 0.5, tr.buttonColor, 0.14);
    }
  }
  // 폴로: 덧붙인 앞여밈(placket) 위 단추
  const pk = meshIdx('placket');
  if (pk >= 0 && !halfPlacket && closure !== 'button_front') {
    let ymin = 1e9, ymax = -1e9;
    for (const t of trisOf.get(pk) || []) for (let k = 0; k < 3; k++) { const v = T[4 * t + k]; ymin = Math.min(ymin, UV[2 * v + 1]); ymax = Math.max(ymax, UV[2 * v + 1]); }
    const n = tr.buttonCount || 2;
    for (let i = 0; i < n; i++) point(K.button, pk, 0, ymax - 2 - (ymax - ymin - 4) * (n === 1 ? 0 : i / (n - 1)), 0.5, tr.buttonColor, 0.14);
    strip(K.stitch, pk, [[-1.3, ymax - 0.2], [-1.3, ymin + 0.3], [1.3, ymin + 0.3], [1.3, ymax - 0.2]], 1.2, 0.05, thread, 0.08);
  }
  // 지퍼: 전체(앞중심 끝까지) 또는 반(18cm). 이빨 띠 + 손잡이
  if ((closure === 'full_zip' || closure === 'half_zip') && (fr >= 0 || fc >= 0)) {
    const m = fr >= 0 ? fr : fc;
    const x = fr >= 0 ? 0.15 : 0;
    const top = cfTop(m), bot = closure === 'full_zip' ? cfBot(m) + 0.5 : top - 18;
    const metal = tr.zipType === 'metal' ? 1 : 0;
    if (tr.zipType !== 'invisible') strip(K.teeth, m, [[x, bot], [x, top - 0.3]], 1.0, 0.45, tr.zipColor, 0.1, metal);
    point(K.puller, m, x, top - 1.6, 0.55, metal ? '#b8bbc0' : tr.zipColor, 0.2, metal);
  }
  // 후드 끈: 목 앞 양쪽 아일렛에서 몸판 위로 늘어뜨림 (천 표면을 따라감)
  if (tr.drawcord && (fc >= 0 || fr >= 0)) {
    const d = tr.drawcord, w = d.flat ? 0.9 : 0.55, len = 28;
    for (const sx of [-1, 1]) {
      const m = fc >= 0 ? fc : (sx > 0 ? fr : fl);
      if (m < 0) continue;
      const top = cfTop(m), x0 = sx * 4.2, y0 = top - 0.8;
      const pts = [[x0, y0], [x0 + sx * 0.6, y0 - len * 0.5], [x0 + sx * 0.4, y0 - len]];
      strip(K.cord, m, pts, 1.4, w, d.color, 0.35, d.flat ? 1 : 0);
      const tipM = d.tip === 'metal_aglet' ? '#b8bbc0' : (d.tip === 'knot' ? d.color : '#2a2a2c');
      if (d.tip !== 'knot') strip(K.tip, m, [[x0 + sx * 0.4, y0 - len + 2.8], [x0 + sx * 0.4, y0 - len]], 1.4, w * 1.1, tipM, 0.37, d.tip === 'metal_aglet' ? 1 : 0);
      point(K.eyelet, m, x0, y0 + 0.2, 0.42, d.eyelet === 'stitched' ? tr.threadColor : (d.eyelet === 'tonal_grommet' ? tr.buttonColor : '#b8bbc0'), 0.12, d.eyelet === 'stitched' ? 0 : 1);
    }
  }
  // 버튼다운 칼라 끝 단추
  const cl = meshIdx('collar_leaf');
  if (cl >= 0 && tr.collarStyle === 'button_down') {
    let xmin = 1e9, xmax = -1e9, ymax = 0;
    for (const t of trisOf.get(cl) || []) for (let k = 0; k < 3; k++) { const v = T[4 * t + k]; xmin = Math.min(xmin, UV[2 * v]); xmax = Math.max(xmax, UV[2 * v]); ymax = Math.max(ymax, UV[2 * v + 1]); }
    point(K.button, cl, xmin + 2.2, ymax - 1.6, 0.4, tr.buttonColor, 0.12);
    point(K.button, cl, xmax - 2.2, ymax - 1.6, 0.4, tr.buttonColor, 0.12);
  }

  if (!inst.length) return null;
  const buf = new ArrayBuffer(inst.length * TRIM_WORDS * 4), u = new Uint32Array(buf), f = new Float32Array(buf);
  inst.forEach((it, i) => {
    const o = i * TRIM_WORDS;
    u.set(it.A.v, o); f.set(it.A.w, o + 3); u.set(it.B.v, o + 6); f.set(it.B.w, o + 9);
    u[o + 12] = it.kind; f[o + 13] = it.size; f.set(it.rgb, o + 14); f[o + 17] = it.off; f[o + 18] = it.variant; f[o + 19] = it.length;
  });
  return { data: u, count: inst.length };
}
