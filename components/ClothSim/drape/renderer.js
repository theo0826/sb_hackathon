// 그리기: 천(계산 버퍼를 그대로 읽음)과 몸. 4x MSAA + 깊이
import { makeBuffer, shaderModule } from './gpu.js';
import { buildTrims } from './trims.js';

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
  cotton_poplin: [6, 0.06, 0.25, 0], oxford: [6, 0.14, 0.15, 1], linen: [6, 0.1, 0.1, 2], chambray: [6, 0.08, 0.15, 3], nylon_taslan: [6, 0.5, 0.32, 4],
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
    // 배경: 다크 모드와 상관없이 밝은 스튜디오 그라데이션 (위 #f7f6f3 -> 아래 #e4e1db).
    // look.background = [r,g,b,a] 를 주면 그 단색, look.gradient = [[위 r,g,b],[아래 r,g,b]] 를 주면 그 그라데이션 (0..1, 화면 색 그대로)
    const hx = (c) => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
    this.gradient = look.background ? null : (look.gradient || [hx('#f7f6f3'), hx('#e4e1db')]);
    this.background = look.background || [...this.gradient[0], 1];
    this.bodyColor = look.bodyColor || '#d8d4cc';
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
    this.viewData = new ArrayBuffer(64 + 16 + 16 + 64 * 16 + 64 * 16 + 32 + 32);   // 끝 32: 로고
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
    if (this.gradient) {
      const [t, u] = this.gradient, f = (v) => v.map((x) => x.toFixed(4)).join(', ');
      const code = `struct O { @builtin(position) p: vec4f, @location(0) y: f32 };
@vertex fn vs(@builtin(vertex_index) i: u32) -> O {
  var q = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: O; o.p = vec4f(q[i], 1.0, 1.0); o.y = q[i].y * 0.5 + 0.5; return o;
}
@fragment fn fs(i: O) -> @location(0) vec4f {
  let k = smoothstep(0.0, 1.0, clamp(i.y, 0.0, 1.0));
  return vec4f(mix(vec3f(${f(u)}), vec3f(${f(t)}), k), 1.0);
}`;
      const gm = dev.createShaderModule({ code });
      this.bg = await dev.createRenderPipelineAsync({ layout: 'auto', vertex: { module: gm, entryPoint: 'vs' }, fragment: { module: gm, entryPoint: 'fs', targets: [target] },
        primitive: { topology: 'triangle-list', cullMode: 'none' }, depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' }, multisample: { count: this.msaaCount } });
    }
    const B = this.solver.B;
    const g = (p, list) => dev.createBindGroup({ layout: p.getBindGroupLayout(0), entries: list.map((b, i) => ({ binding: i, resource: { buffer: b } })) });
    // 로고 텍스처 (처음에는 1x1 투명) + 샘플러
    this.logoSampler = dev.createSampler({ magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge', maxAnisotropy: 4 });
    this.logoTex = dev.createTexture({ size: [1, 1], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    dev.queue.writeTexture({ texture: this.logoTex }, new Uint8Array([0, 0, 0, 0]), { bytesPerRow: 4 }, [1, 1]);
    this.logo = null;
    this.makeClothGroup = () => {
      this.clothGroup = dev.createBindGroup({ layout: this.cloth.getBindGroupLayout(0), entries: [
        ...[this.viewBuf, B.X, B.N, B.tris, B.triDead, B.strain, this.uvBuf].map((b, i) => ({ binding: i, resource: { buffer: b } })),
        { binding: 7, resource: this.logoTex.createView() }, { binding: 8, resource: this.logoSampler }] });
    };
    this.makeClothGroup();
    this.bodyGroup = g(this.body, [this.viewBuf, this.bodyVerts, this.bodyIdx]);
    // 부자재 (단추, 지퍼, 끈, 박음질). 없거나 만들기 실패면 건너뜀 (천 그리기에는 영향 없음)
    try {
      const tr = buildTrims(this.solver.scene);
      if (tr && tr.count) {
        this.trimBuf = makeBuffer(dev, tr.data);
        this.trimCount = tr.count;
        const tm = await shaderModule(dev, 'trim_render', false);
        this.trim = await dev.createRenderPipelineAsync({ layout: 'auto', vertex: { module: tm, entryPoint: 'vs' }, fragment: { module: tm, entryPoint: 'fs', targets: [target] }, ...common });
        this.trimGroup = g(this.trim, [this.viewBuf, B.X, B.N, this.trimBuf]);
      }
    } catch (e) {
      console.warn('[ClothSim] 부자재 그리기 준비 실패 (천은 그대로 그림)', e);
      this.trim = null;
    }
  }

  // 로고: { bitmap (ImageBitmap/캔버스), mesh (메쉬 번호), x, y (도면 cm), width (cm), rotation (도), visible }
  // bitmap 이 바뀌면 텍스처(밉맵 포함)를 새로 만들고, 나머지는 값만 바꿈 (다음 그리기에 반영)
  setLogo(lg) {
    if (!lg || !lg.bitmap) { this.logo = null; return; }
    const dev = this.device;
    if (!this.logo || this.logo.bitmap !== lg.bitmap) {
      const src = lg.bitmap, sc = Math.min(1, 1024 / Math.max(src.width, src.height));
      const w0 = Math.max(1, Math.round(src.width * sc)), h0 = Math.max(1, Math.round(src.height * sc));
      const levels = Math.floor(Math.log2(Math.max(w0, h0))) + 1;
      const tex = dev.createTexture({ size: [w0, h0], format: 'rgba8unorm', mipLevelCount: levels,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      for (let l = 0; l < levels; l++) {
        const w = Math.max(1, w0 >> l), h = Math.max(1, h0 >> l);
        const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
        const cx = cv.getContext('2d');
        cx.clearRect(0, 0, w, h);
        cx.drawImage(src, 0, 0, w, h);
        dev.queue.copyExternalImageToTexture({ source: cv }, { texture: tex, mipLevel: l }, [w, h]);
      }
      if (this.logoTex) this.logoTex.destroy();
      this.logoTex = tex;
      this.makeClothGroup();
    }
    this.logo = { ...lg, aspect: lg.bitmap.height / Math.max(1, lg.bitmap.width) };
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
    this.trimBuf?.destroy();
    this.logoTex?.destroy();
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
    const lg = this.logo, dv = new Float32Array(this.viewData, 96 + 128 * 16 + 32, 8);
    if (lg && lg.visible !== false && lg.mesh >= 0) {
      const w = lg.width || 10, r = (lg.rotation || 0) * Math.PI / 180;
      dv.set([lg.x || 0, lg.y || 0, w / 2, w * lg.aspect / 2, Math.cos(r), Math.sin(r), lg.mesh, 1]);
    } else dv.set([0, 0, 1, 1, 1, 0, -1, 0]);
    this.device.queue.writeBuffer(this.viewBuf, 0, this.viewData);
    const bg = this.background;
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [{ view: this.msaa.createView(), resolveTarget: (this.offscreen ? this.target : this.ctx.getCurrentTexture()).createView(), clearValue: bg, loadOp: 'clear', storeOp: 'discard' }],
      depthStencilAttachment: { view: this.depth.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'discard' },
    });
    if (this.bg) { pass.setPipeline(this.bg); pass.draw(3); }
    if (this.flags.body) { pass.setPipeline(this.body); pass.setBindGroup(0, this.bodyGroup); pass.draw(this.d.bodyIdx.length); }
    pass.setPipeline(this.cloth); pass.setBindGroup(0, this.clothGroup); pass.draw(3 * this.solver.ntri);
    if (this.trim && this.flags.trims !== false) { pass.setPipeline(this.trim); pass.setBindGroup(0, this.trimGroup); pass.draw(6, this.trimCount); }
    pass.end();
    this.device.queue.submit([enc.finish()]);
  }
}
