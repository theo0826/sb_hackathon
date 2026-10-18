// 그리기: 천(계산 버퍼를 그대로 읽음)과 몸. 4x MSAA + 깊이
import { makeBuffer, shaderModule } from './gpu.js';

function hex(c) {
  const s = (c || '#aaaaaa').replace('#', '');
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
}

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
    this.viewData = new ArrayBuffer(64 + 16 + 16 + 64 * 16);
    this.viewBuf = dev.createBuffer({ size: this.viewData.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const col = new Float32Array(this.viewData, 96, 64 * 4);
    this.solver.scene.meta.meshes.forEach((m, i) => { if (i < 63) col.set([...hex(m.color), 1], 4 * i); });
    col.set([...hex(this.bodyColor), 1], 4 * 63);
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
    this.clothGroup = g(this.cloth, [this.viewBuf, B.X, B.N, B.tris, B.triDead, B.strain]);
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
