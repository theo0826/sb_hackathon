// 회전(왼쪽 끌기), 이동(오른쪽 끌기 또는 Shift), 확대(휠, 두 손가락) 카메라. 행렬은 열 우선 (WGSL mat4x4f)
export class OrbitCamera {
  // signal: AbortSignal (주면 그 신호로 이벤트 해제)
  constructor(canvas, target = [0, 120, 0], dist = 330, signal = undefined) {
    const L = { signal };
    this.target = target.slice(); this.dist = dist; this.yaw = 0.35; this.pitch = 0.12; this.fov = 32 * Math.PI / 180;
    this.canvas = canvas;
    let drag = null;
    const pts = new Map();
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey };
    }, L);
    canvas.addEventListener('pointermove', e => {
      if (!drag || !pts.has(e.pointerId)) return;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d0 = Math.hypot(a[0] - b[0], a[1] - b[1]);
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        const [c, d] = [...pts.values()];
        const d1 = Math.hypot(c[0] - d[0], c[1] - d[1]);
        if (d0 > 0) this.dist = Math.min(2000, Math.max(40, this.dist * d0 / d1));
        return;
      }
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (drag.pan) {
        const s = this.dist * 0.0018, [r, u] = this.axes();
        for (let k = 0; k < 3; k++) this.target[k] += (-dx * r[k] + dy * u[k]) * s;
      } else {
        this.yaw -= dx * 0.008;
        this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch + dy * 0.006));
      }
    }, L);
    const end = e => { pts.delete(e.pointerId); if (!pts.size) drag = null; };
    canvas.addEventListener('pointerup', end, L);
    canvas.addEventListener('pointercancel', end, L);
    canvas.addEventListener('contextmenu', e => e.preventDefault(), L);
    canvas.addEventListener('wheel', e => { e.preventDefault(); this.dist = Math.min(2000, Math.max(40, this.dist * Math.exp(e.deltaY * 0.001))); }, { passive: false, signal });
  }

  eye() {
    const cp = Math.cos(this.pitch);
    return [this.target[0] + this.dist * cp * Math.sin(this.yaw), this.target[1] + this.dist * Math.sin(this.pitch), this.target[2] + this.dist * cp * Math.cos(this.yaw)];
  }

  axes() {
    const e = this.eye(), f = norm(sub(this.target, e));
    const r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
    return [r, u, f];
  }

  viewProj(aspect) {
    const e = this.eye(), [r, u, f] = this.axes();
    const view = [r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, e), -dot(u, e), dot(f, e), 1];
    const near = 2, far = 4000, t = 1 / Math.tan(this.fov / 2);
    // 깊이 0..1 (WebGPU)
    const proj = [t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, far / (near - far), -1, 0, 0, near * far / (near - far), 0];
    return mul(proj, view);
  }
}

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = Math.hypot(...a) || 1; return a.map(x => x / l); }
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[4 * c + r] += a[4 * k + r] * b[4 * c + k];
  return o;
}
