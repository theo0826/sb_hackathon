import { publicPath } from "./deployment";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { placementDesign, type Design } from "./design";
import { freezeUVDesign, placementSnapshot, type UVSnapshot } from "./production-mapping";
type GarmentTextures = { fabric?: THREE.Texture|null; prints?: Map<string,THREE.Texture> };
function printLayers(design:Design, uv?:UVSnapshot) {
  return design.placements ? design.placements.map(p=>({id:p.id,design:placementDesign(design,p),uv:uv?.placements?.find(item=>item.id===p.id) ? placementSnapshot(uv,uv.placements.find(item=>item.id===p.id)!) : freezeUVDesign({...placementDesign(design,p),placements:[p]},{printWidthCm:p.widthCm,printHeightCm:p.heightCm})})) : [{id:"primary",design,uv}];
}

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

function curvedPrint(design: Design, uv?: UVSnapshot) {
  const panel = uv?.panels.find(item => item.id === uv.placement.panel);
  const width = uv && panel ? uv.placement.widthMm / panel.widthMm * 1.22 : .94 * design.scale / 100;
  const height = uv && panel ? uv.placement.heightMm / panel.heightMm * 2.07 : width * 220 / 240;
  const geometry = new THREE.PlaneGeometry(width, height, 32, 32);
  const position = geometry.getAttribute("position");
  const centerX = uv ? (uv.placement.u - .5) * 1.22 : (design.x - 260) / 160;
  const centerY = uv ? .99 - uv.placement.v * 2.07 : .18 - (design.y - 248) / 175;
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

let masterFile: Promise<THREE.Group> | undefined;
type SurfaceTriangle = [number, number, number, number, number, number, number, number, number];
const projectionCache = new WeakMap<THREE.Object3D, (x: number, y: number, back: boolean) => number | undefined>();
function projectSurface(body: THREE.Object3D) {
  const existing = projectionCache.get(body); if (existing) return existing;
  body.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(body), nx = 32, ny = 48;
  const width = Math.max(bounds.max.x - bounds.min.x, .001), height = Math.max(bounds.max.y - bounds.min.y, .001);
  const cellX = (x: number) => THREE.MathUtils.clamp(Math.floor((x - bounds.min.x) / width * nx), 0, nx - 1);
  const cellY = (y: number) => THREE.MathUtils.clamp(Math.floor((y - bounds.min.y) / height * ny), 0, ny - 1);
  const cells: SurfaceTriangle[][] = Array.from({ length: nx * ny }, () => []);
  body.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    let receiver: THREE.Object3D | null = object;
    while (receiver && receiver !== body && !receiver.userData.printReceiver) receiver = receiver.parent;
    if (!receiver?.userData.printReceiver) return;
    const positions = object.geometry.getAttribute("position"), index = object.geometry.index;
    const count = index ? index.count : positions.count;
    for (let i = 0; i < count; i += 3) {
      const points = [0,1,2].map(offset => new THREE.Vector3().fromBufferAttribute(positions, index ? index.getX(i + offset) : i + offset).applyMatrix4(object.matrixWorld));
      const [a,b,c] = points;
      if (Math.abs((b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y)) < 1e-10) continue;
      const triangle: SurfaceTriangle = [a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z];
      const minX = cellX(Math.min(a.x,b.x,c.x)), maxX = cellX(Math.max(a.x,b.x,c.x));
      const minY = cellY(Math.min(a.y,b.y,c.y)), maxY = cellY(Math.max(a.y,b.y,c.y));
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) cells[y*nx+x].push(triangle);
    }
  });
  const sample = (x: number, y: number, back: boolean) => {
    if (x < bounds.min.x || x > bounds.max.x || y < bounds.min.y || y > bounds.max.y) return undefined;
    let result: number | undefined;
    for (const [ax,ay,az,bx,by,bz,cx,cy,cz] of cells[cellY(y)*nx+cellX(x)]) {
      const denominator = (by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
      const u = ((by-cy)*(x-cx)+(cx-bx)*(y-cy))/denominator;
      const v = ((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/denominator, w = 1-u-v;
      if (u < -1e-6 || v < -1e-6 || w < -1e-6) continue;
      const z = u*az+v*bz+w*cz;
      if (result === undefined || (back ? z < result : z > result)) result = z;
    }
    return result;
  };
  projectionCache.set(body, sample); return sample;
}
export async function loadGarmentMaster() {
  // Checked-in CC0 meshes, subdivided offline; no external service at runtime.
  if (!masterFile) masterFile = new GLTFLoader().loadAsync(publicPath("/models/garment-masters-v2.glb")).then(gltf => gltf.scene).catch(error => { masterFile = undefined; throw error; });
  return masterFile;
}

function importedGarment(source: THREE.Group, design: Design, artwork: THREE.Texture | null, uv?: UVSnapshot, textures:GarmentTextures={}) {
  const master = source.getObjectByName(`GARMENT_${design.garment || "tee"}`);
  if (!master) throw new Error("의류 모델이 없어요.");
  const group = new THREE.Group(), model = master.clone(true), fabric = fabricTexture();
  model.position.set(0,0,0);
  model.rotation.set(0,0,0); model.scale.setScalar(1);
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry = object.geometry.clone();
    const replace = (original: THREE.Material) => {
      const m = (original as THREE.MeshStandardMaterial).clone();
      m.side = THREE.DoubleSide;
      if (["Fabric","Rib","Pocket"].includes(original.name)) { m.color.set(design.color); if (original.name === "Rib") m.color.multiplyScalar(.84); if (original.name === "Pocket") m.color.multiplyScalar(.97); m.bumpMap = fabric; m.bumpScale=.0012; }
      if (original.name === "Sleeve") { m.bumpMap = fabric; m.bumpScale=.001; }
      if(design.fabric && original.name==="Rib")m.color.set(design.fabric.trimColor);
      if(textures.fabric && ["Fabric","Pocket","Sleeve"].includes(original.name)){m.map=textures.fabric;m.color.set("#ffffff");}
      if(design.fabric?.sleeveColor && ["Fabric","Sleeve"].includes(original.name)){
        const color=new THREE.Color(design.fabric.sleeveColor);
        m.onBeforeCompile=shader=>{
          shader.uniforms.fitSleeveColor={value:color};
          shader.vertexShader=shader.vertexShader.replace("#include <common>","#include <common>\nvarying vec3 fitPosition;").replace("#include <begin_vertex>","#include <begin_vertex>\nfitPosition=position;");
          shader.fragmentShader=shader.fragmentShader.replace("#include <common>","#include <common>\nvarying vec3 fitPosition; uniform vec3 fitSleeveColor;").replace("#include <color_fragment>","#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,fitSleeveColor,smoothstep(0.742,0.750,abs(fitPosition.x)+0.16*fitPosition.y));");
        };
        m.customProgramCacheKey=()=>"fit-sleeve-v1";
      }
      return m;
    };
    object.material = Array.isArray(object.material) ? object.material.map(replace) : replace(object.material);
    if(textures.fabric){const positions=object.geometry.getAttribute("position"),uvs=object.geometry.getAttribute("uv");if(uvs)for(let i=0;i<positions.count;i++)uvs.setXY(i,(positions.getX(i)+1.5)/3,(positions.getY(i)+1.1)/2.7);}
  });
  group.add(model); group.updateMatrixWorld(true); group.userData.source="makehuman-cc0";
  for(const layer of printLayers(design,uv)) {
    const texture=textures.prints?.get(layer.id) || artwork; if(!texture)continue;
    const geometry = curvedPrint(layer.design,layer.uv), positions=geometry.getAttribute("position"), body=master.getObjectByName(`${design.garment || "tee"}_Body`);
    if (!body) throw new Error("인쇄 면이 없어요.");
    const sample = projectSurface(master), back=layer.design.side==="back", sign=back ? -1 : 1;
    const valid: boolean[]=[];
    for(let i=0;i<positions.count;i++) {
      const z = sample(positions.getX(i), positions.getY(i), back); valid[i] = z !== undefined;
      if(z !== undefined) positions.setZ(i,z+sign*.003);
    }
    const triangles:number[]=[], index=geometry.getIndex();
    if(index) for(let i=0;i<index.count;i+=3) { const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2); if(valid[a]&&valid[b]&&valid[c]) triangles.push(a,b,c); }
    geometry.setIndex(triangles);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:.95,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));mesh.userData.placementId=layer.id;group.add(mesh);
  }
  return group;
}

export function createGarment(design: Design, artwork: THREE.Texture | null, uv?: UVSnapshot, master?: THREE.Group, textures:GarmentTextures={}) {
  if(master) return importedGarment(master,design,artwork,uv,textures);
  const group = new THREE.Group();
  const fabric = fabricTexture();
  const material = new THREE.MeshStandardMaterial({ color: textures.fabric?"#ffffff":design.color,map:textures.fabric || null, roughness: .92, metalness: 0, side: THREE.DoubleSide, bumpMap: fabric, bumpScale: .009 });
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
  for(const layer of printLayers(design,uv)){const texture=textures.prints?.get(layer.id)||artwork;if(texture){const mesh=add(curvedPrint(layer.design,layer.uv),new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:.96,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));mesh.userData.placementId=layer.id;}}
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
