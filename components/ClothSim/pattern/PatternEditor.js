// <ClothPatternEditor />: 재단 도면(패널을 펼친 2D) 위에서 로고를 옮기고 크기, 회전을 바꾸는 화면.
// 바꿀 때마다 onChange(새 로고 값) 을 부르므로, 같은 값을 <ClothSim logo={...}> 에 주면 3D 에 바로 반영된다.
//   마우스: 로고 끌기 = 옮기기 (다른 패널로 옮기면 그 패널에 붙음), 로고 위 휠 = 크기, Shift + 휠 = 회전
//           빈 곳 끌기 = 화면 이동, 빈 곳 휠 = 화면 확대/축소
// JSX 없이 씀 (설정 없이 어디서나 동작)
import { createElement as h, useEffect, useMemo, useRef, useState } from 'react';
import { layoutPanels, panelContains, panelLabel, panelOutlines, sceneArrays } from './logo.js';

export default function ClothPatternEditor(props) {
  const { scene, logo, onChange, style, className, background = '#f3f5f8', preview = false, showGrid = false, focus = 'all' } = props;
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [img, setImg] = useState(null);
  const [size, setSize] = useState([600, 400]);
  const view = useRef({ s: 4, tx: 20, ty: 20, fitted: false });
  const drag = useRef(null);
  const logoRef = useRef(logo);
  logoRef.current = logo;
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  const panels = useMemo(() => {
    const all = scene ? panelOutlines(scene) : [];
    if (focus === 'all') return all;
    return all.filter(p => focus === 'sleeve' ? /^(sleeve|cuff)/.test(p.name) : p.name.startsWith(focus) || p.role === focus);
  }, [scene, focus]);
  const layout = useMemo(() => layoutPanels(panels), [panels]);

  // 로고 미리보기 그림
  useEffect(() => {
    let alive = true;
    const src = logo && logo.src;
    if (!src) { setImg(null); return undefined; }
    if (typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap) { setImg(src); return undefined; }
    if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) { setImg(src); return undefined; }
    const im = new Image();
    let url = null;
    if (typeof src === 'object') { url = URL.createObjectURL(src); im.src = url; } else im.src = String(src);
    im.onload = () => alive && setImg(im);
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [logo && logo.src]);

  // 크기 따라가기
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setSize([Math.max(50, el.clientWidth), Math.max(50, el.clientHeight)]));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 처음에 전체가 보이게
  useEffect(() => {
    if (!panels.length) return;
    let x1 = 0, y1 = 0;
    for (const p of panels) { const q = layout.get(p.mesh); x1 = Math.max(x1, q.ox + p.bbox[2]); y1 = Math.max(y1, q.oy - p.bbox[1]); }
    const [W, H] = size, pad = preview ? 12 : 24;
    const s = Math.min((W - 2 * pad) / Math.max(x1, 1), (H - 2 * pad) / Math.max(y1, 1));
    view.current = { s, tx: (W - s * x1) / 2, ty: (H - s * y1) / 2, fitted: true };
    draw();
  }, [panels, layout, size[0], size[1], preview]);

  useEffect(() => { draw(); });

  const toScreen = (mesh, u, v) => { const q = layout.get(mesh), V = view.current; return [V.tx + V.s * (q.ox + u), V.ty + V.s * (q.oy - v)]; };
  const meshOf = name => { const p = panels.find(p => p.name === name); return p ? p.mesh : -1; };
  // 화면 점 -> (패널, u, v)
  function pick(px, py) {
    const V = view.current, X = (px - V.tx) / V.s, Y = (py - V.ty) / V.s;
    for (const p of panels) {
      const q = layout.get(p.mesh), u = X - q.ox, v = q.oy - Y;
      if (u < p.bbox[0] || u > p.bbox[2] || v < p.bbox[1] || v > p.bbox[3]) continue;
      if (panelContains(scene, p, u, v)) return { p, u, v };
    }
    return null;
  }
  function logoQuad() {
    const lg = logoRef.current;
    if (!lg || !img) return null;
    const m = meshOf(lg.panel);
    if (m < 0) return null;
    const w = lg.width || 10, hh = w * (img.height / Math.max(1, img.width));
    const [cx, cy] = toScreen(m, lg.x || 0, lg.y || 0);
    return { cx, cy, w: w * view.current.s, h: hh * view.current.s, r: (lg.rotation || 0) * Math.PI / 180 };
  }
  function insideLogo(px, py) {
    const q = logoQuad();
    if (!q) return false;
    const dx = px - q.cx, dy = py - q.cy, c = Math.cos(q.r), s = Math.sin(q.r);
    const lx = c * dx - s * dy, ly = s * dx + c * dy;   // 화면 y 는 아래로 (회전 반대)
    return Math.abs(lx) <= q.w / 2 + 4 && Math.abs(ly) <= q.h / 2 + 4;
  }

  function draw() {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), [W, H] = size;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = background; g.fillRect(0, 0, W, H);
    const V = view.current, lg = logoRef.current;
    // 1 cm 격자 (5 cm 마다 진하게)
    if (V.s > 3 && !preview && showGrid) {
      g.strokeStyle = 'rgba(8,35,72,0.025)'; g.lineWidth = 1; g.beginPath();
      const step = V.s * (V.s > 12 ? 1 : 5);
      for (let x = ((V.tx % step) + step) % step; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
      for (let y = ((V.ty % step) + step) % step; y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
      g.stroke();
    }
    for (const p of panels) {
      const q = layout.get(p.mesh), UV = sceneArrays(scene).uv, t = p.tris;
      g.fillStyle = '#ffffff';
      g.beginPath();
      for (let k = 0; k < t.length; k += 3) {
        for (let j = 0; j < 3; j++) {
          const [x, y] = toScreen(p.mesh, UV[2 * t[k + j]], UV[2 * t[k + j] + 1]);
          if (j === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.closePath();
      }
      g.fill();
      g.strokeStyle = '#b7c3d6'; g.lineWidth = 1.2; g.beginPath();
      for (const e of p.edges) { const [ax, ay] = toScreen(p.mesh, e[0], e[1]), [bx, by] = toScreen(p.mesh, e[2], e[3]); g.moveTo(ax, ay); g.lineTo(bx, by); }
      g.stroke();
      const [lx, ly] = toScreen(p.mesh, (p.bbox[0] + p.bbox[2]) / 2, p.bbox[1]);
      g.fillStyle = '#7c899d'; g.font = preview ? '8px sans-serif' : '11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText(panelLabel(p.name), lx, ly + 4);
    }
    const qd = logoQuad();
    if (qd) {
      g.save(); g.translate(qd.cx, qd.cy); g.rotate(-qd.r);
      g.drawImage(img, -qd.w / 2, -qd.h / 2, qd.w, qd.h);
      if (!preview) {
        g.strokeStyle = drag.current && drag.current.kind === 'logo' ? '#082348' : '#7c92b8';
        g.setLineDash([5, 4]); g.lineWidth = 1.5; g.strokeRect(-qd.w / 2, -qd.h / 2, qd.w, qd.h);
        g.setLineDash([]); g.fillStyle = '#082348';
        for (const x of [-qd.w / 2, qd.w / 2]) for (const y of [-qd.h / 2, qd.h / 2]) g.fillRect(x - 3, y - 3, 6, 6);
      }
      g.restore();
      g.fillStyle = '#687a94'; g.font = '11px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'bottom';
      const lgv = logoRef.current;
      if (!preview) g.fillText(`${panelLabel(lgv.panel)}  가로 ${(lgv.width || 10).toFixed(1)}cm  ${Math.round(lgv.rotation || 0)}°`, 10, H - 8);
    } else if (!lg && !preview) {
      g.fillStyle = '#6b7079'; g.font = '13px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'bottom';
      g.fillText('로고 이미지가 없어요', 10, H - 8);
    }
  }

  function emit(next) { logoRef.current = next; draw(); if (cbRef.current) cbRef.current(next); }

  function onPointerDown(e) {
    const r = canvasRef.current.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    canvasRef.current.setPointerCapture(e.pointerId);
    // A different mobile tab hides the original panel; tapping a visible panel moves the logo there.
    const current = logoRef.current;
    if (focus !== 'all' && current && meshOf(current.panel) < 0) {
      const hit = pick(px, py);
      if (hit) { const next = { ...current, panel: hit.p.name, x: hit.u, y: hit.v }; emit(next); drag.current = { kind: 'logo', px, py, off: [0, 0] }; return; }
    }
    const q = logoQuad();
    if (q) {
      const dx = px - q.cx, dy = py - q.cy, c = Math.cos(q.r), s = Math.sin(q.r);
      const lx = c * dx - s * dy, ly = s * dx + c * dy;
      if (Math.abs(Math.abs(lx) - q.w / 2) < 10 && Math.abs(Math.abs(ly) - q.h / 2) < 10) {
        drag.current = { kind: 'resize', cx: q.cx, cy: q.cy, distance: Math.max(1, Math.hypot(dx, dy)), width: logoRef.current.width || 10 };
        return;
      }
    }
    if (insideLogo(px, py)) {
      const hit = pick(px, py), lg = logoRef.current;
      drag.current = { kind: 'logo', px, py, off: hit && hit.p.name === lg.panel ? [hit.u - lg.x, hit.v - lg.y] : [0, 0] };
    } else drag.current = { kind: 'pan', px, py, tx: view.current.tx, ty: view.current.ty };
  }
  function onPointerMove(e) {
    const d = drag.current;
    const r = canvasRef.current.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    canvasRef.current.style.cursor = d ? (d.kind === 'logo' ? 'grabbing' : 'move') : (insideLogo(px, py) ? 'grab' : 'default');
    if (!d) return;
    if (d.kind === 'resize') {
      emit({ ...logoRef.current, width: Math.max(1, Math.min(30, d.width * Math.hypot(px - d.cx, py - d.cy) / d.distance)) });
      return;
    }
    if (d.kind === 'pan') { view.current.tx = d.tx + px - d.px; view.current.ty = d.ty + py - d.py; draw(); return; }
    const hit = pick(px, py);
    if (!hit) return;   // 패널 밖으로는 못 나감 (마지막 자리 유지)
    const lg = logoRef.current;
    const same = hit.p.name === lg.panel;
    emit({ ...lg, panel: hit.p.name, x: hit.u - (same ? d.off[0] : 0), y: hit.v - (same ? d.off[1] : 0) });
    if (!same) d.off = [0, 0];
  }
  function onPointerUp(e) { drag.current = null; try { canvasRef.current.releasePointerCapture(e.pointerId); } catch (_) { /* 이미 풀림 */ } draw(); }

  // 휠은 passive 가 아니어야 화면 스크롤을 막을 수 있어서 직접 붙임
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || preview) return undefined;
    const onWheel = e => {
      e.preventDefault();
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const lg = logoRef.current, k = Math.exp(-e.deltaY * 0.0015);
      if (lg && insideLogo(px, py)) {
        if (e.shiftKey) emit({ ...lg, rotation: (((lg.rotation || 0) + (e.deltaY > 0 ? 5 : -5)) % 360 + 360) % 360 });
        else emit({ ...lg, width: Math.max(1, Math.min(30, (lg.width || 10) * k)) });
        return;
      }
      const V = view.current, s2 = Math.max(0.5, Math.min(60, V.s * k));
      V.tx = px - (px - V.tx) * s2 / V.s; V.ty = py - (py - V.ty) * s2 / V.s; V.s = s2;
      draw();
    };
    cv.addEventListener('wheel', onWheel, { passive: false });
    return () => cv.removeEventListener('wheel', onWheel);
  });

  return h('div', { ref: wrapRef, className, style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...(style || {}) } },
    h('canvas', {
      ref: canvasRef, style: { width: '100%', height: '100%', display: 'block', touchAction: 'none' },
      onPointerDown: preview ? undefined : onPointerDown, onPointerMove: preview ? undefined : onPointerMove, onPointerUp: preview ? undefined : onPointerUp, onPointerCancel: preview ? undefined : onPointerUp,
    }));
}
