// Offline asset preparation. Only reads the checked-in CC0 meshes; never calls AI or a network.
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); }); }
};
const average = vectors => vectors.reduce((sum, vector) => sum.add(vector), vectors[0].clone().setScalar(0)).multiplyScalar(1 / vectors.length);
const edgeKey = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;

async function readOBJ(filename) {
  const text = await fs.readFile(`assets/garment-sources/${filename}`, 'utf8');
  const vertices = [], texcoords = [], faces = [];
  for (const line of text.split(/\r?\n/)) {
    const [kind, ...values] = line.trim().split(/\s+/);
    if (kind === 'v') vertices.push(new THREE.Vector3(...values.map(Number)));
    if (kind === 'vt') texcoords.push(new THREE.Vector2(...values.slice(0, 2).map(Number)));
    if (kind === 'f') {
      const corners = values.map(value => value.split('/').map(Number));
      faces.push({ ids: corners.map(corner => corner[0] - 1), uv: corners.map(corner => texcoords[corner[1] - 1].clone()) });
    }
  }
  return { vertices, faces };
}

// Catmull–Clark on shared position topology. UVs are face-varying so island seams stay intact.
function subdivide({ vertices, faces }) {
  const centers = faces.map(face => average(face.ids.map(id => vertices[id])));
  const edges = new Map(), incident = vertices.map(() => []), neighbors = vertices.map(() => new Set());
  faces.forEach((face, faceIndex) => face.ids.forEach((a, i) => {
    const b = face.ids[(i + 1) % face.ids.length], key = edgeKey(a, b);
    if (!edges.has(key)) edges.set(key, { a, b, faces: [] });
    edges.get(key).faces.push(faceIndex); incident[a].push(faceIndex); neighbors[a].add(b); neighbors[b].add(a);
  }));
  const boundary = vertices.map(() => []);
  for (const edge of edges.values()) if (edge.faces.length === 1) { boundary[edge.a].push(edge.b); boundary[edge.b].push(edge.a); }
  const next = vertices.map((point, i) => {
    if (boundary[i].length === 2) return point.clone().multiplyScalar(.75).add(average(boundary[i].map(id => vertices[id])).multiplyScalar(.25));
    const n = incident[i].length;
    if (!n) return point.clone();
    const facePoint = average(incident[i].map(id => centers[id]));
    const midpoints = average([...neighbors[i]].map(id => point.clone().add(vertices[id]).multiplyScalar(.5)));
    return point.clone().multiplyScalar(n - 3).add(facePoint).add(midpoints.multiplyScalar(2)).multiplyScalar(1 / n);
  });
  for (const edge of edges.values()) {
    edge.id = next.length;
    next.push(average([vertices[edge.a], vertices[edge.b], ...edge.faces.filter(() => edge.faces.length > 1).map(id => centers[id])]));
  }
  const centerOffset = next.length; next.push(...centers);
  const output = [];
  faces.forEach((face, i) => {
    const centerUV = average(face.uv);
    face.ids.forEach((id, j) => {
      const prev = (j + face.ids.length - 1) % face.ids.length, after = (j + 1) % face.ids.length;
      output.push({ ids: [id, edges.get(edgeKey(id, face.ids[after])).id, centerOffset + i, edges.get(edgeKey(face.ids[prev], id)).id], uv: [face.uv[j], average([face.uv[j], face.uv[after]]), centerUV, average([face.uv[prev], face.uv[j]])] });
    });
  });
  return { vertices: next, faces: output };
}

function normalize(mesh, long) {
  const box = new THREE.Box3().setFromPoints(mesh.vertices), height = box.max.y - box.min.y;
  const scale = 2.07 / height, centerX = (box.min.x + box.max.x) / 2;
  const centerZ = (box.min.z + box.max.z) / 2;
  mesh.vertices.forEach(point => {
    point.x = (point.x - centerX) * scale * (long ? .94 : 1.03);
    point.y = (point.y - box.min.y) * scale - 1.08;
    point.z = (point.z - centerZ) * scale * .68;
    // Campus garments hang looser at the waist than the original fitted avatar assets.
    const torso = 1 - THREE.MathUtils.smoothstep(Math.abs(point.x), .50, .78);
    const waist = 1 - THREE.MathUtils.smoothstep(point.y, -.8, .65);
    point.x *= 1 + torso * waist * (long ? .18 : .22);
    // Relax the rigid A-pose toward a hanging garment, with a smooth shoulder blend.
    if (long) {
      const influence = THREE.MathUtils.smoothstep(Math.abs(point.x), .50, .96);
      const shoulderX = Math.sign(point.x) * .53, shoulderY = .66;
      const dx = point.x - shoulderX, dy = point.y - shoulderY, angle = -.28 * Math.sign(point.x) * influence;
      point.x = shoulderX + dx * Math.cos(angle) - dy * Math.sin(angle);
      point.y = shoulderY + dx * Math.sin(angle) + dy * Math.cos(angle);
    }
    const lowerFold = Math.exp(-((point.y + .85) ** 2) * 8) * Math.exp(-(point.x ** 2) * 2);
    const underarm = Math.exp(-((Math.abs(point.x) - .50) ** 2) * 35 - ((point.y - .27) ** 2) * 18);
    point.z += Math.sign(point.z || 1) * (.008 * Math.sin(point.x * 23 + point.y * 4) * lowerFold + .009 * Math.sin((Math.abs(point.x) + point.y * .6) * 29) * underarm);
  });
  return mesh;
}

function geometry(mesh, materialForFace = () => 0) {
  const positions = [], texcoords = [], normals = mesh.vertices.map(() => new THREE.Vector3()), triangles = [];
  mesh.faces.forEach(face => {
    for (let j = 1; j < face.ids.length - 1; j++) {
      const ids = [face.ids[0], face.ids[j], face.ids[j + 1]], [a, b, c] = ids.map(id => mesh.vertices[id]);
      const normal = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
      ids.forEach(id => normals[id].add(normal));
      triangles.push({ ids, uv: [face.uv[0], face.uv[j], face.uv[j + 1]], material: materialForFace(average(ids.map(id => mesh.vertices[id]))) });
    }
  });
  normals.forEach(normal => normal.normalize());
  const vertexNormals = [], indices = [], lookup = new Map();
  triangles.sort((a, b) => a.material - b.material);
  const result = new THREE.BufferGeometry(); let lastMaterial = -1, groupStart = 0;
  triangles.forEach(triangle => {
    if (triangle.material !== lastMaterial) {
      if (lastMaterial >= 0) result.addGroup(groupStart, indices.length - groupStart, lastMaterial);
      lastMaterial = triangle.material; groupStart = indices.length;
    }
    triangle.ids.forEach((id, j) => {
      const uv = triangle.uv[j], key = `${id}:${uv.x.toFixed(7)}:${uv.y.toFixed(7)}`;
      if (!lookup.has(key)) {
        lookup.set(key, positions.length / 3); positions.push(...mesh.vertices[id]); texcoords.push(uv.x, uv.y); vertexNormals.push(...normals[id]);
      }
      indices.push(lookup.get(key));
    });
  });
  result.addGroup(groupStart, indices.length - groupStart, lastMaterial);
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(vertexNormals, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(texcoords, 2));
  result.setIndex(indices); return result;
}

// Cut material boundaries through polygons, rather than assigning entire triangles in a staircase.
function sleeveSeams(mesh) {
  for (const sign of [-1, 1]) {
    const intersections = new Map(), output = [];
    const distance = point => sign * point.x + .16 * point.y - .746;
    for (const face of mesh.faces) {
      const halves = [[], []];
      face.ids.forEach((id, i) => {
        const next = (i + 1) % face.ids.length, nextId = face.ids[next];
        const a = distance(mesh.vertices[id]), b = distance(mesh.vertices[nextId]);
        halves[a <= 0 ? 0 : 1].push({ id, uv: face.uv[i] });
        if (a * b < -1e-12) {
          const t = a / (a - b), key = edgeKey(id, nextId);
          if (!intersections.has(key)) { intersections.set(key, mesh.vertices.length); mesh.vertices.push(mesh.vertices[id].clone().lerp(mesh.vertices[nextId], t)); }
          const corner = { id: intersections.get(key), uv: face.uv[i].clone().lerp(face.uv[next], t) };
          halves.forEach(half => half.push(corner));
        }
      });
      for (const half of halves) if (half.length >= 3) output.push({ ids: half.map(corner => corner.id), uv: half.map(corner => corner.uv) });
    }
    mesh.faces = output;
  }
  return mesh;
}

function boundaryLoops(mesh) {
  const edges = new Map();
  mesh.faces.forEach(face => face.ids.forEach((a, i) => {
    const b = face.ids[(i + 1) % face.ids.length], key = edgeKey(a, b);
    if (edges.has(key)) edges.delete(key); else edges.set(key, [a, b]);
  }));
  const links = new Map();
  for (const [a, b] of edges.values()) { if (!links.has(a)) links.set(a, []); if (!links.has(b)) links.set(b, []); links.get(a).push(b); links.get(b).push(a); }
  const visited = new Set(), loops = [];
  for (const start of links.keys()) {
    if (visited.has(start)) continue;
    const ids = []; let current = start, previous = -1;
    while (!visited.has(current)) {
      visited.add(current); ids.push(current);
      const next = links.get(current).find(id => id !== previous); previous = current; current = next;
      if (current === undefined) break;
    }
    if (current === start && ids.length > 2) loops.push(ids.map(id => mesh.vertices[id]));
  }
  return loops;
}

const fabric = new THREE.MeshPhysicalMaterial({ name: 'Fabric', color: '#cad2d8', roughness: .91, sheen: .12, sheenRoughness: .9, sheenColor: '#87939f', side: THREE.DoubleSide });
const rib = fabric.clone(); rib.name = 'Rib'; rib.color.set('#9aa5ad');
const sleeve = fabric.clone(); sleeve.name = 'Sleeve'; sleeve.color.set('#e9e4da');
const pocketMaterial = fabric.clone(); pocketMaterial.name = 'Pocket';
const scene = new THREE.Scene();
function tube(root, name, points, radius, material, closed = false) {
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed), Math.max(48, points.length * 2), radius, 6, closed), material);
  mesh.name = name; root.add(mesh); return mesh;
}
function band(root, name, loop, direction, length) {
  const center = average(loop), points = [], uv = [], indices = [];
  for (let row = 0; row <= 4; row++) for (let col = 0; col <= loop.length; col++) {
    const point = loop[col % loop.length].clone();
    const outward = point.clone().sub(center); outward.y = 0; outward.normalize().multiplyScalar(.003);
    point.add(outward).addScaledVector(direction, row / 4 * length);
    points.push(...point); uv.push(col / loop.length, row / 4);
    if (row < 4 && col < loop.length) { const i = row * (loop.length + 1) + col; indices.push(i, i + 1, i + loop.length + 2, i, i + loop.length + 2, i + loop.length + 1); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals();
  const object = new THREE.Mesh(geo, rib); object.name = name; root.add(object);
}

for (const garment of ['tee', 'hoodie', 'varsity']) {
  const long = garment !== 'tee';
  let mesh = normalize(await readOBJ(long ? 'sweater_fisherman.obj' : 'crude_male_shirt.obj'), long);
  // The sweater asset has a tiny button opening; seal it for the pullover/jacket variants.
  if (long) for (const loop of boundaryLoops(mesh)) {
    if (loop.length >= 12 || Math.abs(average(loop).x) > .1) continue;
    const ids = loop.map(point => mesh.vertices.indexOf(point));
    if (new THREE.Vector3().crossVectors(loop[1].clone().sub(loop[0]), loop[2].clone().sub(loop[0])).z < 0) ids.reverse();
    mesh.faces.push({ ids, uv: ids.map(id => { const face = mesh.faces.find(item => item.ids.includes(id)); return face.uv[face.ids.indexOf(id)].clone(); }) });
  }
  mesh = subdivide(mesh); if (!long) mesh = subdivide(mesh);
  if (garment === 'varsity') mesh = sleeveSeams(mesh);
  const root = new THREE.Group(); root.name = `GARMENT_${garment}`;
  root.userData = { source: 'MakeHuman CC0', up: 'Y', scale: 1, revision: 'smooth-shell-1' };
  const body = new THREE.Mesh(geometry(mesh, point => garment === 'varsity' && Math.abs(point.x) + .16 * point.y > .746001 ? 1 : 0), garment === 'varsity' ? [fabric, sleeve] : fabric);
  body.name = `${garment}_Body`; body.userData.printReceiver = true; root.add(body);
  const loops = boundaryLoops(mesh);
  for (const [i, loop] of loops.entries()) {
    const center = average(loop), neck = center.y > .65 && Math.abs(center.x) < .25;
    tube(root, `${garment}_${neck ? 'Collar' : 'Hem'}_${i}`, loop, neck ? .018 : .012, rib, true);
    if (long && !neck) {
      const cuff = Math.abs(center.x) > .8;
      const direction = cuff ? new THREE.Vector3(Math.sign(center.x) * -.35, .936, 0) : new THREE.Vector3(0, 1, 0);
      band(root, `${garment}_${cuff ? 'CuffRib' : 'WaistRib'}_${i}`, loop, direction, cuff ? .10 : .095);
      if (garment === 'varsity') for (const offset of [.032, .065]) tube(root, `varsity_RibStripe_${i}_${offset}`, loop.map(point => point.clone().addScaledVector(direction, offset).add(point.clone().sub(center).normalize().multiplyScalar(.006))), .004, sleeve, true);
    }
  }
  if (garment === 'hoodie') {
    // A continuous open hood shell: neckline, side panels and crown, with a folded face edge.
    const vertices = [], faces = [], rows = 32, cols = 48;
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) {
      const t = row / rows, a = -2.22 + col / cols * 4.44;
      const dome = Math.sqrt(Math.max(0, 1 - t ** 5));
      const width = (.24 + .14 * Math.sin(t * Math.PI)) * dome + .003;
      const depth = (.21 + .13 * Math.sin(t * Math.PI)) * dome + .003;
      vertices.push(new THREE.Vector3(width * Math.sin(a), .81 + t * .77, -.11 - depth * Math.cos(a)));
      if (row < rows && col < cols) {
        const i = row * (cols + 1) + col;
        faces.push({ ids: [i, i + 1, i + cols + 2, i + cols + 1], uv: [new THREE.Vector2(col / cols, t), new THREE.Vector2((col + 1) / cols, t), new THREE.Vector2((col + 1) / cols, (row + 1) / rows), new THREE.Vector2(col / cols, (row + 1) / rows)] });
      }
    }
    const hood = new THREE.Mesh(geometry({ vertices, faces }), fabric); hood.name = 'hoodie_Hood'; root.add(hood);
    const faceEdge = Array.from({ length: rows + 1 }, (_, row) => vertices[row * (cols + 1)]).concat(Array.from({ length: rows + 1 }, (_, i) => vertices[(rows - i) * (cols + 1) + cols]));
    tube(root, 'hoodie_HoodEdge', faceEdge, .017, rib);
    for (const sign of [-1, 1]) tube(root, `hoodie_Cord_${sign}`, [new THREE.Vector3(sign * .16, .84, .20), new THREE.Vector3(sign * .17, .61, .29), new THREE.Vector3(sign * .13, .36, .31)], .009, sleeve);
    const pocket = new THREE.PlaneGeometry(.76, .40, 24, 16), positions = pocket.getAttribute('position'), ray = new THREE.Raycaster();
    body.updateMatrixWorld(true);
    for (let i = 0; i < positions.count; i++) {
      const v = (positions.getY(i) + .20) / .40, x = positions.getX(i) * (1 - .3 * THREE.MathUtils.smoothstep(v, .55, 1)), y = positions.getY(i) - .68;
      ray.set(new THREE.Vector3(x, y, 2), new THREE.Vector3(0, 0, -1)); const hit = ray.intersectObject(body, false)[0];
      positions.setXYZ(i, x, y, (hit?.point.z || .2) + .007);
    }
    pocket.computeVertexNormals(); const pouch = new THREE.Mesh(pocket, pocketMaterial); pouch.name = 'hoodie_KangarooPocket'; pouch.userData.printReceiver = true; root.add(pouch);
    const pocketOutline = [];
    for (let col = 0; col <= 24; col++) pocketOutline.push(new THREE.Vector3().fromBufferAttribute(positions, col));
    for (let row = 1; row <= 16; row++) pocketOutline.push(new THREE.Vector3().fromBufferAttribute(positions, row * 25 + 24));
    for (let col = 23; col >= 0; col--) pocketOutline.push(new THREE.Vector3().fromBufferAttribute(positions, 16 * 25 + col));
    for (let row = 15; row >= 1; row--) pocketOutline.push(new THREE.Vector3().fromBufferAttribute(positions, row * 25));
    tube(root, 'hoodie_PocketSeam', pocketOutline.map(point => point.add(new THREE.Vector3(0, 0, .001))), .0025, rib, true);
  }
  if (garment === 'varsity') {
    const ray = new THREE.Raycaster(), points = [];
    body.updateMatrixWorld(true);
    for (let y = -.98; y < .8; y += .03) {
      ray.set(new THREE.Vector3(0, y, 2), new THREE.Vector3(0, 0, -1)); const hit = ray.intersectObject(body, false)[0];
      if (hit) points.push(hit.point.add(new THREE.Vector3(0, 0, .008)));
    }
    tube(root, 'varsity_Placket', points, .014, rib);
    for (let y = -.87; y < .72; y += .27) {
      ray.set(new THREE.Vector3(0, y, 2), new THREE.Vector3(0, 0, -1)); const hit = ray.intersectObject(body, false)[0];
      if (!hit) continue;
      const button = new THREE.Mesh(new THREE.SphereGeometry(.018, 12, 8), new THREE.MeshStandardMaterial({ color: '#c6c8c9', metalness: .45, roughness: .4 }));
      button.name = 'varsity_Snap'; button.position.copy(hit.point).add(new THREE.Vector3(0, 0, .02)); button.scale.z = .35; root.add(button);
    }
  }
  scene.add(root);
}
scene.userData = { license: 'CC0-1.0', source: 'MakeHuman Community shirts01', build: 'tools/build-garment-masters.mjs' };
const binary = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true });
await fs.writeFile('public/models/garment-masters-v2.glb', Buffer.from(binary));
console.log('Saved reusable GLB bytes', binary.byteLength);
