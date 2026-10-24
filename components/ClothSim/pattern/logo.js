// 로고(PNG 등) 불러오기와 기본 위치, 재단 도면 배치 계산. 화면(React) 없이도 씀
//   로고 값: { src, panel, x, y, width, rotation }
//     src: 이미지 주소(data:, blob:, http), File/Blob, HTMLImageElement, ImageBitmap
//     panel: 붙일 패널(메쉬) 이름, x, y: 그 패널 도면 좌표 (cm, y 는 아래 끝 0 에서 위로), width: 가로 cm, rotation: 도

const bitmapCache = new WeakMap();
const urlCache = new Map();

/** 로고 원본 -> ImageBitmap (같은 원본이면 다시 만들지 않음) */
export async function loadLogoBitmap(src) {
  if (!src) return null;
  if (typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap) return src;
  if (typeof src === 'object') {
    if (bitmapCache.has(src)) return bitmapCache.get(src);
    const bm = await createImageBitmap(src);
    bitmapCache.set(src, bm);
    return bm;
  }
  const key = String(src);
  if (urlCache.has(key)) return urlCache.get(key);
  // fetch 대신 이미지 요소로 읽음: 사이트 보안 정책(CSP connect-src)이 data:, blob: 주소 fetch 를 막는 경우가 있음 (img-src 는 보통 허용)
  const p = new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => createImageBitmap(im).then(res, rej);
    im.onerror = () => rej(new Error('로고 이미지를 불러오지 못함'));
    im.src = key;
  });
  urlCache.set(key, p);
  try { return await p; } catch (e) { urlCache.delete(key); throw e; }
}

/** 장면 배열 (uv, tris). textToScene 결과 {meta, bin} 이면 bin 에서 읽어 한 번만 만듦 */
export function sceneArrays(scene) {
  if (!scene || !scene.meta) return null;
  if (scene.A && scene.A.uv) return scene.A;
  if (scene._logoA) return scene._logoA;
  const ar = scene.meta.arrays, bin = scene.bin;
  if (!ar || !bin || !ar.uv || !ar.tris) return null;
  const view = (a, T) => new T(bin, a.offset, a.count);
  scene._logoA = { uv: view(ar.uv, Float32Array), tris: view(ar.tris, Uint32Array) };
  return scene._logoA;
}

/** 장면의 겉막 패널들 (속막, 테두리 제외): [{mesh, name, kind, role, tris: [a,b,c...], bbox, edges: [[x0,y0,x1,y1]...]}] */
export function panelOutlines(scene) {
  const meta = scene.meta, A = sceneArrays(scene);
  if (!A) return [];
  const UV = A.uv, T = A.tris;
  const no = meta.shell && meta.shell.n_outer ? meta.shell.n_outer : meta.n;
  const by = new Map();
  for (let t = 0; t < meta.n_tris; t++) {
    const a = T[4 * t], b = T[4 * t + 1], c = T[4 * t + 2], m = T[4 * t + 3];
    if (a >= no || b >= no || c >= no) continue;
    const mm = meta.meshes[m];
    if (!mm || mm.layer === 'inner') continue;
    if (!by.has(m)) by.set(m, []);
    by.get(m).push(a, b, c);
  }
  const out = [];
  for (const [m, tris] of by) {
    const cnt = new Map();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let k = 0; k < tris.length; k += 3) {
      for (let j = 0; j < 3; j++) {
        const u = tris[k + j], v = tris[k + (j + 1) % 3];
        const key = u < v ? `${u}_${v}` : `${v}_${u}`;
        cnt.set(key, (cnt.get(key) || 0) + 1);
        x0 = Math.min(x0, UV[2 * u]); x1 = Math.max(x1, UV[2 * u]); y0 = Math.min(y0, UV[2 * u + 1]); y1 = Math.max(y1, UV[2 * u + 1]);
      }
    }
    const edges = [];
    for (const [key, c] of cnt) if (c === 1) { const [u, v] = key.split('_').map(Number); edges.push([UV[2 * u], UV[2 * u + 1], UV[2 * v], UV[2 * v + 1]]); }
    const mm = meta.meshes[m];
    out.push({ mesh: m, name: mm.name, kind: mm.kind, role: mm.role, tris, bbox: [x0, y0, x1, y1], edges });
  }
  return out;
}

const ORDER = ['front', 'front_r', 'front_l', 'back', 'sleeve_nx', 'sleeve_px', 'hood', 'collar', 'neck', 'cuff', 'placket', 'pocket'];
/** 패널을 겹치지 않게 펼쳐 놓기 (도면 cm 단위 오프셋). 줄 너비 rowW 를 넘으면 다음 줄 */
export function layoutPanels(panels, rowW = 150, gap = 6) {
  const rank = p => { const i = ORDER.findIndex(k => p.name.startsWith(k)); return i < 0 ? ORDER.length : i; };
  const list = [...panels].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  let x = 0, y = 0, rowH = 0;
  const pos = new Map();
  for (const p of list) {
    const w = p.bbox[2] - p.bbox[0], hgt = p.bbox[3] - p.bbox[1];
    if (x > 0 && x + w > rowW) { x = 0; y += rowH + gap; rowH = 0; }
    // 화면 좌표: 도면 (u, v) -> (ox + u, oy - v), oy 는 이 패널 위 끝
    pos.set(p.mesh, { ox: x - p.bbox[0], oy: y + p.bbox[3], w, h: hgt });
    x += w + gap; rowH = Math.max(rowH, hgt);
  }
  return pos;
}

/** 점 (u, v) 가 패널 삼각형 안인지 */
export function panelContains(scene, p, u, v) {
  const UV = sceneArrays(scene).uv, t = p.tris;
  for (let k = 0; k < t.length; k += 3) {
    const ax = UV[2 * t[k]], ay = UV[2 * t[k] + 1], bx = UV[2 * t[k + 1]], by = UV[2 * t[k + 1] + 1], cx = UV[2 * t[k + 2]], cy = UV[2 * t[k + 2] + 1];
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(d) < 1e-12) continue;
    const w0 = ((by - cy) * (u - cx) + (cx - bx) * (v - cy)) / d, w1 = ((cy - ay) * (u - cx) + (ax - cx) * (v - cy)) / d;
    if (w0 >= -1e-6 && w1 >= -1e-6 && w0 + w1 <= 1 + 1e-6) return true;
  }
  return false;
}

/** 처음 놓을 자리: 앞판 가슴 가운데 (앞이 갈라진 옷은 입은 사람 왼쪽 가슴), 가로 10cm */
export function defaultLogoPlacement(scene, src) {
  const panels = panelOutlines(scene);
  const pick = n => panels.find(p => p.name === n);
  const p = pick('front') || pick('front_up') || pick('front_r') || pick('front_up_r') || panels.find(q => q.role === 'front') || panels[0];
  if (!p) return null;
  const [x0, , x1, y1] = p.bbox;
  const split = p.name.endsWith('_r');
  const x = split ? Math.min(x1 - 6, x0 + 10) : (x0 + x1) / 2;
  return { src, panel: p.name, x, y: y1 - 22, width: split ? 7 : 10, rotation: 0 };
}

const NAMES = { front: '앞판', front_r: '앞판 (왼쪽)', front_l: '앞판 (오른쪽)', back: '뒤판', sleeve_px: '왼소매', sleeve_nx: '오른소매',
  cuff_px: '왼 소맷부리', cuff_nx: '오른 소맷부리', neckband: '넥밴드', collar: '칼라', collar_stand: '칼라대', collar_leaf: '칼라',
  hood_l: '후드 왼쪽', hood_r: '후드 오른쪽', hood_center: '후드 가운데', pocket: '주머니', placket: '앞여밈' };
/** 패널 이름 -> 한국어 표시 이름 (입은 사람 기준 왼쪽, 오른쪽) */
export function panelLabel(name) {
  if (NAMES[name]) return NAMES[name];
  const base = name.replace(/_(lo|mid|up)(_[rl])?$/, '$2');
  if (NAMES[base]) return NAMES[base];
  if (name.startsWith('pocket')) return '주머니';
  if (name.includes('band')) return '밴드';
  return name;
}
