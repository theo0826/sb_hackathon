import * as THREE from "three";
import type { Design } from "./design";

// A sewn, open garment shell. The print follows the same curved front/back surface.
function profile(y: number) {
  const levels = [[-1.08, .61, .25], [-.9, .6, .27], [-.4, .57, .30], [.2, .61, .31], [.58, .66, .29], [.78, .62, .25], [.99, .27, .18]];
  for (let i = 1; i < levels.length; i++) {
    if (y <= levels[i][0]) {
      const a = levels[i - 1], b = levels[i];
      const t = THREE.MathUtils.clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
      return [THREE.MathUtils.lerp(a[1], b[1], t), THREE.MathUtils.lerp(a[2], b[2], t)];
    }
  }
  return levels[levels.length - 1].slice(1);
}
function surface(x: number, y: number) {
  const [w, depth] = profile(y);
  const curvature = Math.sqrt(Math.max(.02, 1 - (x / w) ** 2));
  const folds = .012 * Math.sin(x * 26 + y * 2) * Math.exp(-((y + .8) ** 2) * 3);
  return depth * curvature + folds;
}

function shell() {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
  const rows = 56, sides = 96;
  for (let row = 0; row <= rows; row++) {
    const y = -1.08 + row / rows * 2.07;
    const [w] = profile(y);
    for (let col = 0; col <= sides; col++) {
      const a = col / sides * Math.PI * 2;
      const x = w * Math.cos(a);
      const z = Math.sign(Math.sin(a)) * surface(x, y);
      const neckline = .22 * Math.max(0, Math.sin(a)) * Math.max(0, (y - .76) / .23) ** 2;
      positions.push(x, y - neckline + .009 * Math.cos(a * 6) * Math.max(0, -y), z);
      uvs.push(col / sides * 4, row / rows * 3);
      if (row < rows && col < sides) {
        const i = row * (sides + 1) + col;
        indices.push(i, i + sides + 1, i + 1, i + 1, i + sides + 1, i + sides + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function curvedPrint(design: Design) {
  const width = .94 * design.scale / 100, height = width * 220 / 240;
  const geometry = new THREE.PlaneGeometry(width, height, 32, 32);
  const position = geometry.getAttribute("position");
  const centerX = (design.x - 260) / 160;
  const centerY = .18 - (design.y - 248) / 175;
  const angle = -design.rotation * Math.PI / 180;
  const back = design.side === "back";
  for (let i = 0; i < position.count; i++) {
    const px = position.getX(i), py = position.getY(i);
    const x = centerX + px * Math.cos(angle) - py * Math.sin(angle);
    const y = centerY + px * Math.sin(angle) + py * Math.cos(angle);
    const faceX = back ? -x : x;
    position.setXYZ(i, faceX, y, (surface(faceX, y) + .008) * (back ? -1 : 1));
  }
  // Keep print placement inside the garment even at extreme size/position settings.
  const source = geometry.getIndex()!, clipped: number[] = [];
  for (let i = 0; i < source.count; i += 3) {
    const triangle = [source.getX(i), source.getX(i + 1), source.getX(i + 2)];
    if (triangle.every(index => {
      const y = position.getY(index);
      return y >= -1.02 && y <= .74 && Math.abs(position.getX(index)) < profile(y)[0] * .92;
    })) clipped.push(...triangle);
  }
  geometry.setIndex(clipped);
  geometry.computeVertexNormals();
  return geometry;
}

function fabricTexture() {
  const size = 128, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const value = 180 + 18 * Math.sin(x * Math.PI) + ((x + y) % 3 === 0 ? 25 : -10) + 8 * Math.sin(x * 17.13 + y * 4.31);
    const i = (y * size + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = value; pixels[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(6, 6); texture.needsUpdate = true;
  return texture;
}

export function createGarment(design: Design, artwork: THREE.Texture | null) {
  const group = new THREE.Group();
  const fabric = fabricTexture();
  const material = new THREE.MeshStandardMaterial({ color: design.color, roughness: .92, metalness: 0, side: THREE.DoubleSide, bumpMap: fabric, bumpScale: .009 });
  const trim = material.clone(); trim.color.multiplyScalar(.8); trim.roughness = 1;
  const seam = material.clone(); seam.color.multiplyScalar(1.12);
  const add = (geometry: THREE.BufferGeometry, surfaceMaterial: THREE.Material = material) => {
    const mesh = new THREE.Mesh(geometry, surfaceMaterial); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  add(shell());

  // Sleeves have open cuffs and a round cross section; long sleeves angle toward the body.
  const long = design.garment === "hoodie" || design.garment === "varsity";
  const sleeveMaterial = design.garment === "varsity" ? material.clone() : material;
  if (design.garment === "varsity") sleeveMaterial.color.set("#e7e4df");
  for (const side of [-1, 1]) {
    const start = new THREE.Vector3(side * .35, .68, 0);
    const end = new THREE.Vector3(side * (long ? 1.04 : 1.06), long ? -.82 : .23, 0);
    const direction = end.clone().sub(start), length = direction.length();
    const sleeve = add(new THREE.CylinderGeometry(long ? .23 : .255, long ? .15 : .23, length, 48, 16, true), sleeveMaterial);
    // Cylinder's top sits at the shoulder; its bottom sits at the cuff.
    sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().negate().normalize());
    sleeve.position.copy(start.clone().add(end).multiplyScalar(.5)); sleeve.scale.z = .83;
    const cuff = add(new THREE.CylinderGeometry(long ? .153 : .232, long ? .15 : .23, long ? .10 : .035, 48, 1, true), long ? trim : seam);
    cuff.quaternion.copy(sleeve.quaternion); cuff.position.copy(end); cuff.scale.z = .83;
  }
  const hem = add(new THREE.CylinderGeometry(.612, .612, .045, 96, 1, true), trim);
  hem.scale.z = .25 / .61; hem.position.y = -1.055;
  const neckline = new THREE.CatmullRomCurve3(Array.from({ length: 72 }, (_, i) => {
    const a = i / 72 * Math.PI * 2;
    return new THREE.Vector3(.27 * Math.cos(a), .99 - .22 * Math.max(0, Math.sin(a)), .18 * Math.sin(a));
  }), true);
  add(new THREE.TubeGeometry(neckline, 96, .021, 8, true), trim);

  if (design.garment === "hoodie") {
    const hood = add(new THREE.SphereGeometry(.39, 48, 32, Math.PI, Math.PI), material);
    hood.scale.set(1, 1.1, .9); hood.position.set(0, 1.13, .06);
    const lining = trim.clone(); lining.color.multiplyScalar(.58);
    const inside = add(new THREE.SphereGeometry(.383, 48, 32, Math.PI, Math.PI), lining);
    inside.scale.copy(hood.scale); inside.position.copy(hood.position);
    const rim = new THREE.CatmullRomCurve3(Array.from({ length: 64 }, (_, i) => {
      const a = i / 64 * Math.PI * 2;
      return new THREE.Vector3(.39 * Math.cos(a), 1.13 + .429 * Math.sin(a), .06);
    }), true);
    add(new THREE.TubeGeometry(rim, 64, .016, 8, true), trim);
    for (const side of [-1, 1]) {
      const cord = new THREE.CatmullRomCurve3([new THREE.Vector3(side * .19, .92, .17), new THREE.Vector3(side * .2, .63, .28), new THREE.Vector3(side * .17, .40, .3)]);
      add(new THREE.TubeGeometry(cord, 20, .012, 8, false), new THREE.MeshStandardMaterial({ color: "#cccac6", roughness: 1 }));
    }
    const pocket = new THREE.PlaneGeometry(.68, .30, 24, 12), p = pocket.getAttribute("position");
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i) - .69; p.setXYZ(i, x, y, surface(x, y) + .01); }
    pocket.computeVertexNormals(); add(pocket, seam);
  }
  if (design.garment === "varsity") {
    const placket = new THREE.PlaneGeometry(.045, 1.77, 1, 40), p = placket.getAttribute("position");
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) - .12; p.setZ(i, surface(p.getX(i), y) + .014); p.setY(i, y); }
    placket.computeVertexNormals(); add(placket, trim);
    for (let y = -.85; y < .8; y += .29) { const button = add(new THREE.SphereGeometry(.022, 12, 8), new THREE.MeshStandardMaterial({ color: "#deddd9", roughness: .45, metalness: .35 })); button.position.set(0, y, surface(0, y) + .032); button.scale.z = .4; }
  }
  if (artwork) add(curvedPrint(design), new THREE.MeshStandardMaterial({ map: artwork, transparent: true, roughness: .96, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  return group;
}

export function disposeGarment(group: THREE.Group) {
  const textures = new Set<THREE.Texture>(), materials = new Set<THREE.Material>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      const m = material as THREE.MeshStandardMaterial;
      if (m.map) textures.add(m.map); if (m.bumpMap) textures.add(m.bumpMap);
    }
  });
  textures.forEach(texture => texture.dispose()); materials.forEach(material => material.dispose());
}
