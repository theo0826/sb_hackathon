// 천 시뮬레이션 (WebGPU 계산 셰이더, XPBD).
// 작은 시간 단계 하나 = 승수 초기화 -> 예측 -> iters x (제약 색마다 XPBD -> 천 점 몸 충돌 -> 봉제 점 합치기)
//                       -> 몸 점 천 삼각형 충돌 (해시 비우기, 넣기, 밀기, 적용) -> 속도
// 프레임마다 그 뒤 부착 패널, 찢어짐, 늘어남 표시값, 삼각형 숨김, 법선.
import { makeBuffer, emptyBuffer, shaderModule, STORAGE } from './gpu.js';
import { buildGrid, updateBtri } from './grid.js';
import { clothLog } from '../garment/clothLog.js';
import { bodyVertsFromMesh } from './scene.js';

// common.wgsl 의 Params 와 같은 순서 (4 바이트씩)
const FIELDS = [
  ['n', 'u'], ['ne', 'u'], ['ns', 'u'], ['nb', 'u'],
  ['dt', 'f'], ['gravity', 'f'], ['damping', 'f'], ['seam_factor', 'f'],
  ['mu_s', 'f'], ['mu_k', 'f'], ['push_radius', 'f'], ['thickness', 'f'],
  ['max_dist', 'f'], ['tear_on', 'u'], ['tear_scale', 'f'], ['seam_tear_cm', 'f'],
  ['ngroups', 'u'], ['weld_on', 'u'], ['push_on', 'u'], ['nbv', 'u'],
  ['gox', 'f'], ['goy', 'f'], ['goz', 'f'], ['cell', 'f'],
  ['gdx', 'i'], ['gdy', 'i'], ['gdz', 'i'], ['margin', 'f'],
  ['g_start_off', 'u'], ['g_tris_off', 'u'], ['g_inside_off', 'u'], ['body_kind', 'u'],
  ['pa', 'f'], ['pb', 'f'], ['py_top', 'f'], ['py_bottom', 'f'],
  ['hx', 'f'], ['hy', 'f'], ['hz', 'f'], ['hr', 'f'],
  ['ncons', 'u'], ['ntri', 'u'], ['frame', 'u'], ['tear_armed', 'u'],
  ['seam_tear_on', 'u'], ['n_stretch', 'u'], ['push_depth', 'f'], ['hash_cell', 'f'],
  ['hash_size', 'u'], ['hash_slots', 'u'], ['e_start_off', 'u'], ['e_list_off', 'u'],
  ['ncaps', 'u'], ['dress', 'u'], ['nshell', 'u'], ['shell_min', 'f'],
  ['nout', 'u'], ['shell_gap', 'f'], ['pad0', 'u'], ['pad1', 'u'],
];
const HASH_SIZE = 1 << 16, HASH_SLOTS = 24;
const TEAR_DELAY = 10;   // 봉제 끝나고 이만큼 프레임 뒤부터 찢어짐 판정 (합친 점이 자리 잡을 시간)

export class Solver {
  static async create(device, scene, derived, opts = {}) {
    const s = new Solver(device, scene, derived, opts);
    await s.init();
    return s;
  }

  constructor(device, scene, derived, opts = {}) {
    this.device = device;
    this.scene = scene;
    this.d = derived;
    const m = scene.meta;
    this.n = m.n; this.ne = m.n_edges; this.ns = m.n_seams; this.nb = m.n_binds; this.ntri = m.n_tris;
    // 제약 수 = 변 + 봉제 + 봉제선 굽힘 (scene.js 가 덧붙임)
    this.ncons = derived.cons.length / 8; this.ngroups = m.n_weld_groups || 0;
    this.nbv = derived.bodyVerts.length / 6;
    this.sim = { ...m.sim };
    // 몸과 천 최소 간격 (1단계, 2단계 같은 값. 기본 0.2cm)
    this.sim.thickness = opts.clearance ?? 0.2;
    // 1단계(입히기): 중력 없이, 속도 없이 위치만 풀어서 몸 안에 들어간 천을 최소 간격 밖으로 밀어냄. 끝나면 false
    this.dress = opts.dressing !== false;
    // 이중막: 겉막과 속막 짝 (scene.js). 속막이 겉막 밖으로 못 나가게 함. 최소 간격 = 처음 간격 x shellMin
    this.nshell = derived.shellPairs ? derived.shellPairs.length / 4 : 0;
    this.shellMin = opts.shellMin ?? 0.7;
    this.opts = { tear_on: true, seam_tear_on: true, tear_scale: 1.0, seam_tear_cm: m.tear.seam_tear_cm, push_on: m.sim.push_on !== false, weld: true };
    this.frame = 0;
    this.paramData = new ArrayBuffer(FIELDS.length * 4);
    /** intro 포즈 블렌드: 중력·격자를 옷이 따라오게 */
    this.poseDrape = false;
    this._poseDrapeTick = 0;
  }

  async init() {
    const dev = this.device, A = this.scene.A, m = this.scene.meta, d = this.d, n = this.n;
    const t0 = performance.now();
    if (m.body.type === 'mesh') {
      this.grid = buildGrid(A.coll_V, A.coll_F, this.sim.cell, this.sim.margin, this.sim.thickness);
    } else {
      this.grid = { btri: new Float32Array(12), grid: new Uint32Array(4), origin: [0, 0, 0], dims: [0, 0, 0], off: { start: 0, tris: 0, inside: 0 }, ntri: 0 };
    }
    this.gridMs = performance.now() - t0;
    const B = this.B = {};
    B.X = makeBuffer(dev, A.X, STORAGE, 'X');
    B.V = emptyBuffer(dev, 12 * n, STORAGE, 'V');
    B.P = emptyBuffer(dev, 12 * n, STORAGE, 'P');
    B.attach = makeBuffer(dev, A.attach, STORAGE, 'attach');
    B.invm = makeBuffer(dev, A.invm, STORAGE, 'invm');
    B.edges = makeBuffer(dev, A.edges, STORAGE, 'edges');
    B.cons = makeBuffer(dev, d.cons, STORAGE, 'cons');
    B.clist = makeBuffer(dev, d.clist, STORAGE, 'clist');
    B.lambda = emptyBuffer(dev, 4 * this.ncons, STORAGE, 'lambda');
    B.weld = makeBuffer(dev, A.weld, STORAGE, 'weld');
    B.gbroken = emptyBuffer(dev, 4 * Math.max(1, this.ngroups), STORAGE, 'gbroken');
    B.binds = makeBuffer(dev, A.binds, STORAGE, 'binds');
    B.adj = makeBuffer(dev, d.adj, STORAGE, 'adj');
    B.broken = emptyBuffer(dev, 4 * this.ncons, STORAGE, 'broken');
    B.btri = makeBuffer(dev, this.grid.btri, STORAGE, 'btri');
    B.grid = makeBuffer(dev, this.grid.grid, STORAGE, 'grid');
    B.caps = makeBuffer(dev, A.caps || new Float32Array(7), STORAGE, 'caps');
    B.tris = makeBuffer(dev, A.tris, STORAGE, 'tris');
    B.triEdges = makeBuffer(dev, d.triEdges, STORAGE, 'triEdges');
    B.vtadj = makeBuffer(dev, d.vtadj, STORAGE, 'vtadj');
    B.triDead = emptyBuffer(dev, 4 * this.ntri, STORAGE, 'triDead');
    B.N = emptyBuffer(dev, 12 * n, STORAGE, 'N');
    B.strain = emptyBuffer(dev, 8 * n, STORAGE, 'strain');
    B.bverts = makeBuffer(dev, d.bodyVerts, STORAGE, 'bverts');
    B.hcnt = emptyBuffer(dev, 4 * HASH_SIZE, STORAGE, 'hcnt');
    B.hslot = emptyBuffer(dev, 4 * HASH_SIZE * HASH_SLOTS, STORAGE, 'hslot');
    B.acc = emptyBuffer(dev, 16 * n, STORAGE, 'acc');
    B.shellPairs = makeBuffer(dev, d.shellPairs || new Uint32Array(4), STORAGE, 'shellPairs');
    B.params = dev.createBuffer({ size: this.paramData.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: 'params' });

    const plan = {
      lambda_reset: ['lambda'],
      predict: ['X', 'V', 'P', 'attach'],
      xpbd: ['P', 'cons', 'invm', 'lambda', 'broken', 'clist'],
      collide: ['P', 'X', 'btri', 'grid', 'caps'],
      weld: ['P', 'weld', 'gbroken', 'invm'],
      hash_clear: ['hcnt'],
      hash_insert: ['P', 'tris', 'triDead', 'hcnt', 'hslot'],
      body_push: ['P', 'X', 'tris', 'hcnt', 'hslot', 'bverts', 'acc'],
      push_apply: ['P', 'acc', 'invm'],
      velocity: ['P', 'X', 'V', 'attach'],
      shell_side: ['P', 'shellPairs', 'tris', 'vtadj', 'invm'],
      bind: ['X', 'binds'],
      tear: ['X', 'edges', 'broken'],
      strain: ['X', 'edges', 'adj', 'broken', 'strain'],
      tri_dead: ['triEdges', 'broken', 'triDead'],
      normals: ['X', 'tris', 'vtadj', 'triDead', 'N'],
    };
    this.K = {};
    await Promise.all(Object.entries(plan).map(async ([name, bufs]) => {
      const shader = await shaderModule(dev, name, true);
      const pipeline = await dev.createComputePipelineAsync({ layout: 'auto', compute: { module: shader, entryPoint: 'main' }, label: name });
      const entries = [{ binding: 0, resource: { buffer: B.params } }, ...bufs.map((b, i) => ({ binding: i + 1, resource: { buffer: B[b] } }))];
      this.K[name] = { pipeline, group: dev.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries }) };
    }));
    // 색마다 (시작, 개수) uniform 과 묶음
    const xp = this.K.xpbd.pipeline;
    this.colorGroups = d.colors.map(c => {
      const buf = dev.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      dev.queue.writeBuffer(buf, 0, new Uint32Array([c.off, c.cnt, 0, 0]));
      return { cnt: c.cnt, group: dev.createBindGroup({ layout: xp.getBindGroupLayout(1), entries: [{ binding: 0, resource: { buffer: buf } }] }) };
    });
    this._gridCapBtri = B.btri.size;
    this._gridCapGrid = B.grid.size;
    this.reset();
  }

  rebindCollide() {
    const B = this.B;
    const pipeline = this.K.collide.pipeline;
    const bufs = ['P', 'X', 'btri', 'grid', 'caps'];
    const entries = [{ binding: 0, resource: { buffer: B.params } }, ...bufs.map((b, i) => ({ binding: i + 1, resource: { buffer: B[b] } }))];
    this.K.collide.group = this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
  }

  /** 격자 데이터가 커지면 GPU 버퍼 재할당 (포즈 intro 등) */
  uploadGrid() {
    const btriLen = this.grid.btri.byteLength;
    const gridLen = this.grid.grid.byteLength;
    let dirty = false;
    if (!this._gridCapBtri || this._gridCapBtri < btriLen) {
      if (this.B.btri) this.B.btri.destroy();
      this.B.btri = makeBuffer(this.device, this.grid.btri, STORAGE, 'btri');
      this._gridCapBtri = this.B.btri.size;
      dirty = true;
    } else {
      this.device.queue.writeBuffer(this.B.btri, 0, this.grid.btri);
    }
    if (!this._gridCapGrid || this._gridCapGrid < gridLen) {
      if (this.B.grid) this.B.grid.destroy();
      this.B.grid = makeBuffer(this.device, this.grid.grid, STORAGE, 'grid');
      this._gridCapGrid = this.B.grid.size;
      dirty = true;
    } else {
      this.device.queue.writeBuffer(this.B.grid, 0, this.grid.grid);
    }
    if (dirty) this.rebindCollide();
  }

  /** intro 시작 1회: 두 포즈 envelope 격자 + GPU 버퍼 확장 */
  reservePoseGrid(Va, Vb) {
    const A = this.scene.A;
    const m = this.scene.meta;
    if (m.body.type !== 'mesh') return;
    const { cell, margin, thickness } = this.sim;
    const F = A.coll_F;
    const gA = buildGrid(Va, F, cell, margin, thickness, Vb);
    const gB = buildGrid(Vb, F, cell, margin, thickness, Va);
    this._gridCapGrid = Math.max(this._gridCapGrid || 0, gA.grid.byteLength, gB.grid.byteLength);
    this.grid = gA;
    this.uploadGrid();
    clothLog('포즈 격자 확보', { dims: this.grid.dims, gridBytes: this.grid.grid.byteLength });
    this.writeParams();
  }

  writeParams() {
    const m = this.scene.meta, g = this.grid, sim = this.sim, o = this.opts, b = m.body;
    const f = this.frame, dt = 1 / (60 * sim.substeps);
    const head = b.head || [0, 0, 0, 0];
    const v = {
      n: this.n, ne: this.ne, ns: this.ns, nb: this.nb,
      dt,
      gravity: this.dress ? 0 : sim.gravity * (this.poseDrape ? 1.35 : 1),
      damping: Math.exp(-sim.damping_rate * dt),
      seam_factor: this.poseDrape ? Math.max(0.25, 1 - f / Math.max(1, sim.ramp * 0.65)) : Math.max(0, 1 - f / sim.ramp),
      mu_s: sim.mu_s, mu_k: sim.mu_k, push_radius: sim.push_radius, thickness: sim.thickness,
      max_dist: sim.max_dist, tear_on: o.tear_on ? 1 : 0, tear_scale: o.tear_scale, seam_tear_cm: o.seam_tear_cm,
      ngroups: this.ngroups, weld_on: (o.weld && f >= sim.ramp) ? 1 : 0, push_on: o.push_on && !this.dress ? 1 : 0, nbv: this.nbv,
      gox: g.origin[0], goy: g.origin[1], goz: g.origin[2], cell: sim.cell,
      gdx: g.dims[0], gdy: g.dims[1], gdz: g.dims[2], margin: sim.margin,
      g_start_off: g.off.start, g_tris_off: g.off.tris, g_inside_off: g.off.inside, body_kind: b.type === 'mesh' ? 0 : 1,
      pa: b.a || 0, pb: b.b || 0, py_top: b.y_top || 0, py_bottom: b.y_bottom || 0,
      hx: head[0], hy: head[1], hz: head[2], hr: head[3],
      ncons: this.ncons, ntri: this.ntri, frame: f, tear_armed: f >= sim.ramp + TEAR_DELAY ? 1 : 0,
      seam_tear_on: o.seam_tear_on ? 1 : 0, n_stretch: m.n_stretch, push_depth: sim.push_depth, hash_cell: sim.hash_cell,
      hash_size: HASH_SIZE, hash_slots: HASH_SLOTS, e_start_off: this.d.off.e_start, e_list_off: this.d.off.e_list,
      ncaps: this.scene.A.caps ? this.scene.A.caps.length / 7 : 0, dress: this.dress ? 1 : 0, nshell: this.nshell, shell_min: this.shellMin,
      nout: this.nshell ? (this.scene.meta.shell.n_outer || this.n) : this.n, shell_gap: this.nshell ? (this.scene.meta.shell.gap_cm || 0) : 0, pad0: 0, pad1: 0,
    };
    const u = new Uint32Array(this.paramData), fl = new Float32Array(this.paramData), it = new Int32Array(this.paramData);
    FIELDS.forEach(([k, t], i) => { if (t === 'u') u[i] = v[k]; else if (t === 'i') it[i] = v[k]; else fl[i] = v[k]; });
    this.device.queue.writeBuffer(this.B.params, 0, this.paramData);
  }

  reset() {
    const q = this.device.queue, n = this.n;
    q.writeBuffer(this.B.X, 0, this.scene.A.X);
    q.writeBuffer(this.B.V, 0, new Float32Array(3 * n));
    q.writeBuffer(this.B.broken, 0, new Uint32Array(this.ncons));
    q.writeBuffer(this.B.gbroken, 0, new Uint32Array(Math.max(1, this.ngroups)));
    q.writeBuffer(this.B.acc, 0, new Int32Array(4 * n));
    this.frame = 0;
    this.writeParams();
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginComputePass();
    this.post(pass);
    pass.end();
    q.submit([enc.finish()]);
  }

  run(pass, name, count) {
    if (count <= 0) return;
    const k = this.K[name];
    pass.setPipeline(k.pipeline);
    pass.setBindGroup(0, k.group);
    pass.dispatchWorkgroups(Math.ceil(count / 64));
  }

  post(pass) {
    this.run(pass, 'bind', this.nb);
    this.run(pass, 'tear', this.scene.meta.n_stretch);
    this.run(pass, 'strain', this.n);
    this.run(pass, 'tri_dead', this.ntri);
    this.run(pass, 'normals', this.n);
  }

  /**
   * 포즈 변화 중: 매 프레임 btri(삼각형 위치·법선), 4프레임마다 격자 CSR·inside 재빌드
   * Light 만 쓰면 격자가 고정되어 충돌이 intro 끝날 때까지 안 따라감
   */
  applyBodyVerticesDrape(V, renderer) {
    const A = this.scene.A;
    if (V.length !== A.body_V.length) throw new Error('몸 정점 수 불일치');
    A.body_V.set(V);
    if (A.coll_V && A.coll_V.length === V.length) A.coll_V.set(V);
    this._poseDrapeTick++;
    const m = this.scene.meta;
    if (m.body.type === 'mesh') {
      updateBtri(A.coll_V, A.coll_F, this.grid.btri);
      this.device.queue.writeBuffer(this.B.btri, 0, this.grid.btri);
      if ((this._poseDrapeTick & 7) === 0) this.rebuildBodyCollisionGrid();
    }
    this.d.bodyVerts = bodyVertsFromMesh(A.body_V, this.d.bodyIdx);
    this.device.queue.writeBuffer(this.B.bverts, 0, this.d.bodyVerts);
    if (renderer) renderer.device.queue.writeBuffer(renderer.bodyVerts, 0, this.d.bodyVerts);
  }

  /** 포즈 블렌드 중: btri·렌더만 (reservePoseGrid 후) */
  applyBodyVerticesLight(V, renderer) {
    const A = this.scene.A;
    if (V.length !== A.body_V.length) throw new Error('몸 정점 수 불일치');
    A.body_V.set(V);
    if (A.coll_V && A.coll_V.length === V.length) A.coll_V.set(V);
    if (this.scene.meta.body.type === 'mesh') {
      updateBtri(A.coll_V, A.coll_F, this.grid.btri);
      this.device.queue.writeBuffer(this.B.btri, 0, this.grid.btri);
    }
    this.d.bodyVerts = bodyVertsFromMesh(A.body_V, this.d.bodyIdx);
    this.device.queue.writeBuffer(this.B.bverts, 0, this.d.bodyVerts);
    if (renderer) renderer.device.queue.writeBuffer(renderer.bodyVerts, 0, this.d.bodyVerts);
  }

  /** coll_V 기준으로 충돌 격자만 재빌드 (정점은 이미 Light/Drape 로 반영된 상태) */
  rebuildBodyCollisionGrid() {
    const A = this.scene.A;
    if (this.scene.meta.body.type !== 'mesh') return;
    this.grid = buildGrid(A.coll_V, A.coll_F, this.sim.cell, this.sim.margin, this.sim.thickness);
    this.uploadGrid();
    this.writeParams();
  }

  /** 몸 메쉬를 블렌드된 정점으로 갱신 (충돌 격자 전체 재빌드 + 렌더) */
  applyBodyVertices(V, renderer) {
    const A = this.scene.A;
    if (V.length !== A.body_V.length) throw new Error('몸 정점 수 불일치');
    A.body_V.set(V);
    if (A.coll_V && A.coll_V.length === V.length) A.coll_V.set(V);
    const m = this.scene.meta;
    if (m.body.type === 'mesh') {
      this.grid = buildGrid(A.coll_V, A.coll_F, this.sim.cell, this.sim.margin, this.sim.thickness);
      this.uploadGrid();
    }
    this.d.bodyVerts = bodyVertsFromMesh(A.body_V, this.d.bodyIdx);
    this.device.queue.writeBuffer(this.B.bverts, 0, this.d.bodyVerts);
    if (renderer) renderer.device.queue.writeBuffer(renderer.bodyVerts, 0, this.d.bodyVerts);
    this.writeParams();
  }

  // 한 프레임 (1/60 초). 계산 패스 하나에 모두 기록 (WebGPU 는 dispatch 사이 쓰기를 다음 dispatch 에 보이게 보장)
  stepFrame() {
    this.writeParams();
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginComputePass();
    for (let st = 0; st < this.sim.substeps; st++) {
      this.run(pass, 'lambda_reset', this.ncons);
      this.run(pass, 'predict', this.n);
      for (let it = 0; it < this.sim.iters; it++) {
        const k = this.K.xpbd;
        pass.setPipeline(k.pipeline);
        pass.setBindGroup(0, k.group);
        for (const c of this.colorGroups) { pass.setBindGroup(1, c.group); pass.dispatchWorkgroups(Math.ceil(c.cnt / 64)); }
        this.run(pass, 'shell_side', this.nshell);
        this.run(pass, 'collide', this.n);
        this.run(pass, 'weld', this.ngroups);
      }
      // 몸 점 -> 천 삼각형 밀기는 2단계(중력)부터. 1단계 겹침 풀기는 점 충돌(최소 간격)로 하고,
      // 1단계 중 밀기를 켜면 밀기와 제약이 서로 되돌리는 움직임이 이어져 끝나지 않음
      if (this.opts.push_on && !this.dress) {
        this.run(pass, 'hash_clear', HASH_SIZE);
        this.run(pass, 'hash_insert', this.ntri);
        this.run(pass, 'body_push', this.nbv);
        this.run(pass, 'push_apply', this.n);
        this.run(pass, 'shell_side', this.nshell);   // 속막 위치 고친 뒤
        this.run(pass, 'weld', this.ngroups);   // 밀기 뒤 다시 합치기 (봉제 점은 마지막에 합쳐야 벌어지지 않음)
      }
      this.run(pass, 'velocity', this.n);
    }
    this.post(pass);
    pass.end();
    this.device.queue.submit([enc.finish()]);
    this.frame++;
  }

  /** 천 위치만 읽기 (1단계 수렴 확인용) */
  async readX() {
    const dev = this.device, sz = Math.max(16, 12 * this.n);
    const buf = dev.createBuffer({ size: sz, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const enc = dev.createCommandEncoder();
    enc.copyBufferToBuffer(this.B.X, 0, buf, 0, sz);
    dev.queue.submit([enc.finish()]);
    await buf.mapAsync(GPUMapMode.READ);
    const X = new Float32Array(buf.getMappedRange().slice(0));
    buf.unmap(); buf.destroy();
    return X;
  }

  // 상태 읽기 (느림, 가끔만)
  async readStats() {
    const dev = this.device, n = this.n;
    const sizes = { X: 12 * n, broken: 4 * this.ncons, strain: 8 * n, gbroken: 4 * Math.max(1, this.ngroups) };
    const enc = dev.createCommandEncoder();
    const stage = {};
    for (const [k, sz] of Object.entries(sizes)) {
      stage[k] = dev.createBuffer({ size: Math.max(16, sz), usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
      enc.copyBufferToBuffer(this.B[k], 0, stage[k], 0, Math.max(16, sz));
    }
    const frame = this.frame;
    dev.queue.submit([enc.finish()]);
    await Promise.all(Object.values(stage).map(b => b.mapAsync(GPUMapMode.READ)));
    const X = new Float32Array(stage.X.getMappedRange().slice(0));
    const br = new Uint32Array(stage.broken.getMappedRange().slice(0));
    const sr = new Float32Array(stage.strain.getMappedRange().slice(0));
    const gb = new Uint32Array(stage.gbroken.getMappedRange().slice(0));
    Object.values(stage).forEach(b => { b.unmap(); b.destroy(); });
    const S = this.scene.A.seams;
    let sum = 0, max = 0, cnt = 0, tornEdges = 0, tornSeams = 0;
    for (let k = 0; k < this.ns; k++) {
      const a = S[4 * k], b = S[4 * k + 1];
      const g = Math.hypot(X[3 * b] - X[3 * a], X[3 * b + 1] - X[3 * a + 1], X[3 * b + 2] - X[3 * a + 2]);
      sum += g; cnt++; max = Math.max(max, g);
    }
    for (let e = 0; e < this.scene.meta.n_stretch; e++) tornEdges += br[e];
    for (let k = 0; k < this.ngroups; k++) tornSeams += gb[k];
    let maxRaw = 1, maxFrac = 0, nanCount = 0;
    for (let i = 0; i < n; i++) {
      maxFrac = Math.max(maxFrac, sr[i]); maxRaw = Math.max(maxRaw, sr[n + i]);
      if (!Number.isFinite(X[3 * i])) nanCount++;
    }
    return { frame, seamMean: cnt ? sum / cnt : 0, seamMax: max, tornEdges, tornSeams, maxStretch: maxRaw, maxTearFrac: maxFrac, nanCount, X };
  }
}
