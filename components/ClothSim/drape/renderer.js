// 그리기: 천(계산 버퍼를 그대로 읽음)과 몸. 4x MSAA + 깊이
import { makeBuffer, shaderModule } from './gpu.js';

function hex(c) {
  const s = (c || '#aaaaaa').replace('#', '');
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
}

// 원단 -> 그리기 질감 (종류, 무늬 주기 cm, 광택, 변형). cloth_render.wgsl 의 height() 종류 번호와 같음
//   0 저지, 1 플리스/테리, 2 리브, 3 울 니트, 4 와플, 5 피케, 6 우븐(변형 0 포플린, 1 옥스포드, 2 린넨, 3 샴브레이, 4 나일론), 7 데님, 8 코듀로이, 9 기모 우븐
// 주기는 실제 원단보다 조금 크게 (화면 기본 거리에서도 짜임이 보이게. 가까이 가면 실제 크기 느낌)
const FABRIC_LOOK = {
  cotton_jersey: [0, 0.12, 0.15, 0], cotton_interlock: [0, 0.1, 0.2, 0], softshell_knit: [0, 0.1, 0.3, 0],
  french_terry: [1, 1, 0.35, 0], brushed_fleece: [1, 1, 0.5, 0], polyester_fleece: [1, 1, 0.45, 0], heavy_sweat_fleece: [1, 1, 0.4, 0],
  rib_knit: [2, 0.45, 0.2, 0], wool_knit: [3, 0.45, 0.35, 0], thermal_waffle: [4, 0.5, 0.2, 0], pique_cotton: [5, 0.2, 0.2, 0],
  cotton_poplin: [6, 0.06, 0.25, 0], oxford: [6, 0.14, 0.15, 1], linen: [6, 0.1, 0.1, 2], chambray: [6, 0.08, 0.15, 3], nylon_taslan: [6, 0.06, 0.7, 4],
  denim: [7, 0.25, 0.15, 0], corduroy: [8, 0.35, 0.35, 0], flannel_brushed: [9, 1, 0.35, 0],
};
function fabricLook(mesh) {
  return FABRIC_LOOK[mesh.material] || (mesh.family === 'woven' ? [6, 0.08, 0.2, 0] : [0, 0.12, 0.15, 0]);
}
// 표면 무늬 (scene.meta.surface, garment/index.js 가 spec 에서 넣음)
const SURF = { solid: 0, heather: 1, stripe: 2, check: 3 };
const DIR = { horizontal: 0, vertical: 1, diagonal: 2 };
const CHECK = { gingham: 0, tartan: 1, buffalo: 2, windowpane: 3, houndstooth: 0 };
const FINISH = { none: 0, garment_wash: 1, enzyme_wash: 1, distressed: 1, acid_wash: 2, pigment_dye: 3, brushed: 0 };

export class Renderer {
  static async create(device, canvas, solver, derived, offscreen = false, look = {}) {
    const r = new Renderer(device, canvas, solver, derived, offscreen, look);
    await r.init();
    return r;
  }

  // offscreen = true: 캔버스 표시 대신 텍스처에 그리고 2D 캔버스로 복사 (자동 점검용, 느림)
  constructor(device, canvas, solver, derived, offscreen = false, look = {}) {
    this.device = device; this.canvas = canvas; this.solver = solver; this.d = derived; this.offscreen = offscreen;
    this.flags = { strain: true, body: true };
    const dark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    this.background = look.background || (dark ? [0.078, 0.078, 0.086, 1] : [0.965, 0.961, 0.949, 1]);
    this.bodyColor = look.bodyColor || (dark ? '#55555c' : '#d8d4cc');
  }

  async init() {
    const dev = this.device;
    if (this.offscreen) {
      this.ctx2d = this.canvas.getContext('2d');
      this.format = 'rgba8unorm';
    } else {
      this.ctx = this.canvas.getContext('webgpu');
      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.ctx.configure({ device: dev, format: this.format, alphaMode: 'opaque' });
    }
    this.viewData = new ArrayBuffer(64 + 16 + 16 + 64 * 16 + 64 * 16 + 32);
    this.viewBuf = dev.createBuffer({ size: this.viewData.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const col = new Float32Array(this.viewData, 96, 64 * 4);
    this.solver.scene.meta.meshes.forEach((m, i) => { if (i < 63) col.set([...hex(m.color), 1], 4 * i); });
    col.set([...hex(this.bodyColor), 1], 4 * 63);
    const mats = new Float32Array(this.viewData, 96 + 64 * 16, 64 * 4);
    this.solver.scene.meta.meshes.forEach((m, i) => { if (i < 63) mats.set(fabricLook(m), 4 * i); });
    const sf = this.solver.scene.meta.surface || {};
    const surf = new Float32Array(this.viewData, 96 + 128 * 16, 8);
    surf.set([SURF[sf.pattern] ?? 0, DIR[sf.direction] ?? 0, sf.width || 1, FINISH[sf.finish] ?? 0,
      ...hex(sf.color2 || '#f2f1ec'), CHECK[sf.check_type] ?? 0]);
    const A = this.solver.scene.A;
    this.uvBuf = makeBuffer(dev, A.uv && A.uv.length === 2 * this.solver.n ? A.uv : new Float32Array(2 * this.solver.n));
    this.bodyVerts = makeBuffer(dev, this.d.bodyVerts);
    this.bodyIdx = makeBuffer(dev, this.d.bodyIdx);
    const target = { format: this.format };
    // D3D12/WebGPU 는 보통 1·4만 지원 (2 는 GPUPipelineError)
    this.msaaCount = 4;
    const common = { primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' }, multisample: { count: this.msaaCount } };
    const cm = await shaderModule(dev, 'cloth_render', false);
    this.cloth = await dev.createRenderPipelineAsync({ layout: 'auto', vertex: { module: cm, entryPoint: 'vs' }, fragment: { module: cm, entryPoint: 'fs', targets: [target] }, ...common });
    const bm = await shaderModule(dev, 'body_render', false);
    this.body = await dev.createRenderPipelineAsync({ layout: 'auto', vertex: { module: bm, entryPoint: 'vs' }, fragment: { module: bm, entryPoint: 'fs', targets: [target] }, ...common });
    const B = this.solver.B;
    const g = (p, list) => dev.createBindGroup({ layout: p.getBindGroupLayout(0), entries: list.map((b, i) => ({ binding: i, resource: { buffer: b } })) });
    this.clothGroup = g(this.cloth, [this.viewBuf, B.X, B.N, B.tris, B.triDead, B.strain, this.uvBuf]);
    this.bodyGroup = g(this.body, [this.viewBuf, this.bodyVerts, this.bodyIdx]);
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr)), h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width === w && this.canvas.height === h && this.msaa) return;
    this.canvas.width = w; this.canvas.height = h;
    if (this.msaa) this.msaa.destroy();
    if (this.depth) this.depth.destroy();
    const sc = this.msaaCount || 4;
    this.msaa = this.device.createTexture({ size: [w, h], format: this.format, sampleCount: sc, usage: GPUTextureUsage.RENDER_ATTACHMENT });
    this.depth = this.device.createTexture({ size: [w, h], format: 'depth24plus', sampleCount: sc, usage: GPUTextureUsage.RENDER_ATTACHMENT });
    if (this.offscreen) {
      if (this.target) this.target.destroy();
      this.target = this.device.createTexture({ size: [w, h], format: this.format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
    }
  }

  // offscreen 일 때 그린 결과를 2D 캔버스로
  async present() {
    if (!this.offscreen) return;
    const w = this.canvas.width, h = this.canvas.height, row = Math.ceil(w * 4 / 256) * 256;
    const buf = this.device.createBuffer({ size: row * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = this.device.createCommandEncoder();
    enc.copyTextureToBuffer({ texture: this.target }, { buffer: buf, bytesPerRow: row }, [w, h]);
    this.device.queue.submit([enc.finish()]);
    await buf.mapAsync(GPUMapMode.READ);
    const src = new Uint8Array(buf.getMappedRange()), img = new ImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(src.subarray(y * row, y * row + w * 4), y * w * 4);
    buf.unmap(); buf.destroy();
    this.ctx2d.putImageData(img, 0, 0);
  }

  destroy() {
    this.viewBuf?.destroy();
    this.uvBuf?.destroy();
    this.bodyVerts?.destroy();
    this.bodyIdx?.destroy();
    this.msaa?.destroy();
    this.depth?.destroy();
    this.target?.destroy();
  }

  draw(camera) {
    this.resize();
    const vp = camera.viewProj(this.canvas.width / this.canvas.height);
    new Float32Array(this.viewData, 0, 16).set(vp);
    new Float32Array(this.viewData, 64, 4).set([...camera.eye(), 1]);
    new Uint32Array(this.viewData, 80, 4).set([this.flags.strain ? 1 : 0, 0, 0, 0]);
    this.device.queue.writeBuffer(this.viewBuf, 0, this.viewData);
    const bg = this.background;
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [{ view: this.msaa.createView(), resolveTarget: (this.offscreen ? this.target : this.ctx.getCurrentTexture()).createView(), clearValue: bg, loadOp: 'clear', storeOp: 'discard' }],
      depthStencilAttachment: { view: this.depth.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'discard' },
    });
    if (this.flags.body) { pass.setPipeline(this.body); pass.setBindGroup(0, this.bodyGroup); pass.draw(this.d.bodyIdx.length); }
    pass.setPipeline(this.cloth); pass.setBindGroup(0, this.clothGroup); pass.draw(3 * this.solver.ntri);
    pass.end();
    this.device.queue.submit([enc.finish()]);
  }
}
