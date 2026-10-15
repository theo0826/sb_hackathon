"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RotateCcw, Minus, Plus, Rotate3D } from "lucide-react";
import { createGarment, disposeGarment, loadGarmentMaster } from "@/lib/garment-model";
import { simpleDesign, type Design, type Side } from "@/lib/design";
import type { CanvasHandle } from "./DesignCanvas";
import Artwork from "./Artwork";
import type { UVSnapshot } from "@/lib/production-mapping";

import { textArtworkSVG } from "@/lib/print-artwork";

const Fallback = dynamic(() => import("./DesignCanvas"), { ssr: false });
type Viewer = { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; model: THREE.Group | null; draw: () => void; frame: (side: Side, angled?: boolean) => void; ready: boolean; unavailable: boolean; dispose: () => void };
function printCanvas(width:number,height:number){const canvas=document.createElement("canvas"),ratio=width/height;canvas.width=ratio>=1?1024:Math.max(1,Math.round(1024*ratio));canvas.height=ratio>=1?Math.max(1,Math.round(1024/ratio)):1024;return canvas;}

export default function GarmentPreview3D({ design: inputDesign, exportRef, showArtwork = true, uv }: { design: Design; exportRef: Ref<CanvasHandle>; showArtwork?: boolean; uv?: UVSnapshot }) {
  const design=simpleDesign(inputDesign);
  const host = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), viewer = useRef<Viewer | null>(null);
  const fallback = useRef<CanvasHandle>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const designRef = useRef(design);
  useEffect(() => { designRef.current = design; }, [design]);
  const [orientation, setOrientation] = useState<{ side: Side | "free"; modelSide: Side }>({ side: design.side, modelSide: design.side });
  const facing = orientation.modelSide === design.side ? orientation.side : design.side;
  const setFacing = useCallback((side: Side | "free") => setOrientation({ side, modelSide: designRef.current.side }), []);
  const designSnapshot = JSON.stringify(design);
  const uvSnapshot = JSON.stringify(uv);

  useImperativeHandle(exportRef, () => ({ previewPNG: (side) => {
    if (status === "fallback") return fallback.current?.previewPNG(side);
    const v = viewer.current; if (!v?.ready) return undefined;
    const savedPosition = v.camera.position.clone(), savedTarget = v.controls.target.clone();
    const size = v.renderer.getSize(new THREE.Vector2()), ratio = v.renderer.getPixelRatio();
    try {
      v.renderer.setPixelRatio(1); v.renderer.setSize(1040, 1040, false); v.camera.aspect = 1;
      v.frame(side || designRef.current.side); v.camera.updateProjectionMatrix(); v.draw();
      return v.renderer.domElement.toDataURL("image/png");
    } finally {
      v.renderer.setPixelRatio(ratio); v.renderer.setSize(size.x, size.y, false); v.camera.aspect = size.x / size.y;
      v.camera.position.copy(savedPosition); v.controls.target.copy(savedTarget); v.camera.updateProjectionMatrix(); v.controls.update(); v.draw();
    }
  } }), [status]);

  useEffect(() => {
    const element = host.current; if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true }); }
    catch { const frame = requestAnimationFrame(() => setStatus("fallback")); return () => cancelAnimationFrame(frame); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute("aria-label", "3D 의류. 드래그 또는 방향키로 회전할 수 있어요.");
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#f1f2f3");
    const studio = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(studio, .04); scene.environment = environment.texture; scene.environmentIntensity = .5;
    studio.dispose(); pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(37, 1, .1, 30);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.enableDamping = false; controls.enableZoom = false;
    controls.minPolarAngle = .65; controls.maxPolarAngle = 2.35; controls.rotateSpeed = .7;
    const draw = () => renderer.render(scene, camera);
    const frame = (side: Side, angled = false) => {
      const hoodie = designRef.current.garment === "hoodie";
      const distance = hoodie ? 4.8 : 4.2, centerY = hoodie ? .18 : -.02;
      camera.position.set(angled ? .65 : 0, centerY + .17, side === "front" ? distance : -distance);
      controls.target.set(0, centerY, 0); controls.update(); draw();
    };
    scene.add(new THREE.HemisphereLight("#ffffff", "#9ba5b5", 1.3));
    const key = new THREE.DirectionalLight("#fffaf3", 2.7); key.position.set(-3, 4, 5); scene.add(key);
    const fill = new THREE.DirectionalLight("#dce6ff", .9); fill.position.set(4, 1, 3); scene.add(fill);
    const rim = new THREE.DirectionalLight("#ffffff", 1.6); rim.position.set(-2, 3, -4); scene.add(rim);
    controls.addEventListener("change", draw);
    const free = () => setFacing("free"); controls.addEventListener("start", free);
    const contextLost = (event: Event) => { event.preventDefault(); if (viewer.current) { viewer.current.ready = false; viewer.current.unavailable = true; } setStatus("fallback"); };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const observer = new ResizeObserver(() => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); draw();
    }); observer.observe(element);
    const dispose = () => { observer.disconnect(); controls.removeEventListener("change", draw); controls.removeEventListener("start", free); controls.dispose(); renderer.domElement.removeEventListener("webglcontextlost", contextLost); environment.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
    viewer.current = { renderer, scene, camera, controls, model: null, ready: false, unavailable: false, draw, frame, dispose };
    frame(designRef.current.side, true);
    return () => { const v = viewer.current; if (v?.model) disposeGarment(v.model); dispose(); viewer.current = null; };
  }, [setFacing]);

  useEffect(() => {
    const v = viewer.current; if (!v || v.unavailable) return;
    const currentDesign: Design = JSON.parse(designSnapshot);
    let cancelled = false; v.ready = false;
    async function update() {
      let texture: THREE.CanvasTexture | null = null;
      let artworkBitmap:HTMLImageElement|null=null;
      if (showArtwork && !currentDesign.placements?.every(p=>p.content==="text")) {
        const source = currentDesign.image || (svg.current ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg.current))}` : null);
        if (source) {
          const bitmap = new Image();
          try {
            await new Promise<void>((resolve, reject) => { bitmap.onload = () => resolve(); bitmap.onerror = () => reject(new Error("도안 이미지")); bitmap.src = source; });
            if (cancelled) return;
            artworkBitmap=bitmap;
            const canvas = document.createElement("canvas");
            const printUV: UVSnapshot | undefined = uvSnapshot ? JSON.parse(uvSnapshot) : undefined;
            const ratioUV = printUV ? printUV.placement.widthMm / printUV.placement.heightMm : 1024 / 940;
            canvas.width = ratioUV >= 1 ? 1024 : Math.max(1,Math.round(1024*ratioUV));
            canvas.height = ratioUV >= 1 ? Math.max(1,Math.round(1024/ratioUV)) : 1024;
            const context = canvas.getContext("2d"); if (!context) throw new Error("도안 캔버스");
            const ratio = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
            context.drawImage(bitmap, (canvas.width - bitmap.width * ratio) / 2, (canvas.height - bitmap.height * ratio) / 2, bitmap.width * ratio, bitmap.height * ratio);
            texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(8, v!.renderer.capabilities.getMaxAnisotropy());
          } catch { if (!cancelled) setStatus("fallback"); return; }
        }
      }
      const printTextures = new Map<string,THREE.Texture>();
      if(showArtwork&&artworkBitmap)for(const p of currentDesign.placements||[])if(p.content!=="text"){
        const canvas=printCanvas(p.widthCm,p.heightCm),context=canvas.getContext("2d")!,ratio=Math.min(canvas.width/artworkBitmap.width,canvas.height/artworkBitmap.height);
        context.drawImage(artworkBitmap,(canvas.width-artworkBitmap.width*ratio)/2,(canvas.height-artworkBitmap.height*ratio)/2,artworkBitmap.width*ratio,artworkBitmap.height*ratio);
        const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;printTextures.set(p.id,map);
      }
      if(showArtwork)for(const p of currentDesign.placements || [])if(p.content==="text"){
        const canvas=printCanvas(p.widthCm,p.heightCm);
        const context=canvas.getContext("2d")!, bitmap=new Image();
        try { await new Promise<void>((resolve,reject)=>{bitmap.onload=()=>resolve();bitmap.onerror=()=>reject(new Error("문구를 준비하지 못했어요."));bitmap.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(textArtworkSVG(p.text||currentDesign.text,p.ink||currentDesign.ink,canvas.width,canvas.height))}`;}); }
        catch { texture?.dispose();printTextures.forEach(t=>t.dispose());if(!cancelled)setStatus("fallback");return; }
        context.drawImage(bitmap,0,0,canvas.width,canvas.height);
        const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;printTextures.set(p.id,map);
      }
      if(currentDesign.placements?.every(p=>printTextures.has(p.id))){texture?.dispose();texture=null;}
      const master = await loadGarmentMaster().catch(() => undefined);
      if (cancelled) { texture?.dispose();printTextures.forEach(t=>t.dispose()); return; }
      if (v!.model) { v!.scene.remove(v!.model); disposeGarment(v!.model); }
      v!.model = createGarment(currentDesign, texture, uvSnapshot ? JSON.parse(uvSnapshot) : undefined, master,{prints:printTextures}); v!.scene.add(v!.model); v!.ready = true; if(host.current) host.current.dataset.modelSource=master ? "makehuman-cc0" : "procedural"; v!.draw(); setStatus("ready");
    }
    void update(); return () => { cancelled = true; };
  }, [designSnapshot, showArtwork, uvSnapshot]);

  useEffect(() => { viewer.current?.frame(design.side, true); }, [design.side, design.garment]);
  function face(side: Side) { viewer.current?.frame(side); setFacing(side); }
  function zoom(direction: number) {
    const v = viewer.current; if (!v) return;
    const offset = v.camera.position.clone().sub(v.controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * direction, 3.5, 7));
    v.camera.position.copy(v.controls.target).add(offset); v.controls.update(); v.draw();
  }
  return <div className="garment-viewer" data-renderer={status === "ready" ? "webgl" : status}>
    <div ref={host} className="garment-viewport" tabIndex={status === "fallback" ? -1 : 0} role="group" aria-label="3D 의류 회전" onKeyDown={event => {
      const v = viewer.current; if (!v) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); const offset = v.camera.position.clone().sub(v.controls.target); offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), event.key === "ArrowLeft" ? -.2 : .2); v.camera.position.copy(v.controls.target).add(offset); v.controls.update(); setFacing("free");
      } else if (event.key === "+" || event.key === "=") { event.preventDefault(); zoom(.9); }
      else if (event.key === "-") { event.preventDefault(); zoom(1.1); }
    }} hidden={status === "fallback"} />
    {status === "fallback" ? <><Fallback design={design} exportRef={fallback} onChange={() => {}} editable={false} showArtwork={showArtwork} /><p className="viewer-hint">이 기기에서는 2D 미리보기를 표시해요.</p></> : <>
      <p className="viewer-hint" aria-live="polite"><Rotate3D size={15} />{status === "loading" ? "3D 미리보기를 준비하고 있어요" : "드래그해서 돌려보세요"}</p>
      <div className="viewer-toolbar"><div className="viewer-segments" role="group" aria-label="보는 방향"><button aria-pressed={facing === "front"} onClick={() => face("front")}>앞면</button><button aria-pressed={facing === "back"} onClick={() => face("back")}>뒷면</button></div><div className="viewer-tools"><button aria-label="축소" onClick={() => zoom(1.15)}><Minus size={17} /></button><button aria-label="확대" onClick={() => zoom(.87)}><Plus size={17} /></button><button aria-label="시점 초기화" onClick={() => { viewer.current?.frame(design.side, true); setFacing(design.side); }}><RotateCcw size={16} /></button></div></div>
    </>}
    <div hidden aria-hidden="true"><Artwork design={design} exportRef={svg} /></div>
  </div>;
}
