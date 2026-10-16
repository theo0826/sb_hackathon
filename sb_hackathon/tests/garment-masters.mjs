import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadTS, tsURL } from './helpers/load-ts.mjs';
const bytes=await fs.readFile('public/models/garment-masters-v2.glb');
assert.equal(bytes.toString('utf8',0,4),'glTF');
const jsonLength=bytes.readUInt32LE(12), manifest=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
assert(!manifest.images?.length,'Master models should not fetch outside textures');
assert(!manifest.buffers.some(buffer=>buffer.uri),'Binary geometry must be self contained');
const model=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',gltf=>resolve(gltf.scene),reject));
assert.equal(model.userData.license,'CC0-1.0');
let source=ts.transpileModule(await fs.readFile('lib/garment-model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
source=source.replace('from "three"',`from ${JSON.stringify(pathToFileURL(path.resolve('node_modules/three/build/three.module.js')).href)}`).replace('from "three/addons/loaders/GLTFLoader.js"',`from ${JSON.stringify(pathToFileURL(path.resolve('node_modules/three/examples/jsm/loaders/GLTFLoader.js')).href)}`);
source=source.replace(/from\s+["'](\.[^"']+)["']/g,(_match,relative)=>`from ${JSON.stringify(tsURL(path.resolve('lib',relative)+'.ts'))}`);
const renderer=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const {DEFAULT_DESIGN}=await loadTS('lib/design.ts');
for(const garment of ['tee','hoodie','varsity']) for(const side of ['front','back']) {
  const group=renderer.createGarment({...DEFAULT_DESIGN,garment,side},new THREE.Texture(),undefined,model);
  const box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3());
  assert(size.y>1.9&&size.y<3,'Upright garment height'); assert(size.z<1,'Front-to-back thickness');
  const print=group.children.at(-1); assert(print.geometry.index.count>2500,`${garment} ${side}: Artwork must intersect the garment (${print.geometry.index.count})`);
  const z=print.geometry.getAttribute('position');
  for(let i=0;i<z.count;i++) assert(side==='front'?z.getZ(i)>0:z.getZ(i)<0,'Correct front/back surface');
  const body=group.children[0].getObjectByName(`${garment}_Body`), receivers=[];
  assert(body,'Named garment body');
  group.children[0].traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    assert(object.geometry.getAttribute('uv')?.count>0,'UV attributes survive asset preparation');
    let ancestor=object;
    while(ancestor&&!ancestor.userData.printReceiver)ancestor=ancestor.parent;
    if(ancestor)receivers.push(object);
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(material.name==='Fabric')assert.equal(material.color.getHexString(),DEFAULT_DESIGN.color.slice(1),'Customer color stays editable');
    }
  });
  group.updateMatrixWorld(true);
  const sign=side==='front'?1:-1, ray=new THREE.Raycaster();
  for(const fraction of [.2,.4,.6,.8]){
    const i=Math.floor(z.count*fraction), x=z.getX(i), y=z.getY(i);
    ray.set(new THREE.Vector3(x,y,sign*2),new THREE.Vector3(0,0,-sign));
    const hit=ray.intersectObjects(receivers,false)[0];
    assert(hit,`${garment} ${side}: independent ray intersects receiver`);
    assert(Math.abs(z.getZ(i)-hit.point.z-sign*.003)<.0001,'Cached projection agrees with independent ray intersection');
  }
  renderer.disposeGarment(group);
}
assert.equal(model.getObjectByName('tee_Body').geometry.getAttribute('position').count>0,true,'Shared master survives preview disposal');
const lowPrint=renderer.createGarment({...DEFAULT_DESIGN,garment:'hoodie',y:350},new THREE.Texture(),undefined,model);
lowPrint.updateMatrixWorld(true);
const lowPositions=lowPrint.children.at(-1).geometry.getAttribute('position'), pocket=lowPrint.getObjectByName('hoodie_KangarooPocket');
let pocketChecks=0;
for(let i=0;i<lowPositions.count;i++){
  const x=lowPositions.getX(i),y=lowPositions.getY(i);
  if(Math.abs(x)>.2||y<-.78||y>-.55)continue;
  const ray=new THREE.Raycaster(new THREE.Vector3(x,y,2),new THREE.Vector3(0,0,-1));
  const hit=ray.intersectObject(pocket,false)[0];
  if(hit){assert(Math.abs(lowPositions.getZ(i)-hit.point.z-.003)<.0001,'Lower graphic stays above kangaroo pocket');pocketChecks++;}
}
assert(pocketChecks>20,'Pocket projection is exercised');renderer.disposeGarment(lowPrint);
const fixture=JSON.parse(await fs.readFile('tests/fixtures/team-design.json','utf8'));
for(const garment of ['tee','hoodie','varsity']){
  const prints=new Map(fixture.placements.map(p=>[p.id,new THREE.Texture()]));
  const group=renderer.createGarment({...fixture,garment},null,undefined,model,{fabric:new THREE.Texture(),prints});
  const meshes=group.children.filter(mesh=>mesh.userData.placementId);
  assert.equal(meshes.length,fixture.placements.length,`${garment}: every placement becomes a separate decal`);
  for(const mesh of meshes){
    const p=fixture.placements.find(p=>p.id===mesh.userData.placementId),positions=mesh.geometry.getAttribute('position');
    assert(positions.count>0);assert.equal(mesh.material.map,prints.get(p.id));
    for(let i=0;i<positions.count;i++)assert(p.side==='front'?positions.getZ(i)>0:positions.getZ(i)<0,'Every layer uses the correct garment surface');
  }
  renderer.disposeGarment(group);
}
console.log('PASS self-contained CC0 GLB; three upright garments; editable colors/UVs; front/back projection matches independent rays; isolated resource disposal');
