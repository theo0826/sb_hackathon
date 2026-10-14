"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RotateCcw, Minus, Plus, Rotate3D } from "lucide-react";
import { createGarment, disposeGarment } from "@/lib/garment-model";
import type { Design, Side } from "@/lib/design";
import type { CanvasHandle } from "./DesignCanvas";
import Artwork from "./Artwork";

const Fallback = dynamic(() => import("./DesignCanvas"), { ssr: false });
type Viewer = { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; model: THREE.Group | null; draw: () => void; frame: (side: Side, angled?: boolean) => void; ready: boolean; unavailable: boolean; dispose: () => void };

export default function GarmentPreview3D({ design, exportRef, showArtwork = true }: { design: Design; exportRef: Ref<CanvasHandle>; showArtwork?: boolean }) {
  const host = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), viewer = useRef<Viewer | null>(null);
  const fallback = useRef<CanvasHandle>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const designRef = useRef(design);
  useEffect(() => { designRef.current = design; }, [design]);
  const [orientation, setOrientation] = useState<{ side: Side | "free"; modelSide: Side }>({ side: design.side, modelSide: design.side });
  const facing = orientation.modelSide === design.side ? orientation.side : design.side;
  const setFacing = useCallback((side: Side | "free") => setOrientation({ side, modelSide: designRef.current.side }), []);
  const designSnapshot = JSON.stringify(design);

  useImperativeHandle(exportRef, () => ({ previewPNG: () => {
    if (status === "fallback") return fallback.current?.previewPNG();
    const v = viewer.current; if (!v?.ready) return undefined;
    const savedPosition = v.camera.position.clone(), savedTarget = v.controls.target.clone();
    const size = v.renderer.getSize(new THREE.Vector2()), ratio = v.renderer.getPixelRatio();
    try {
      v.renderer.setPixelRatio(1); v.renderer.setSize(1040, 1040, false); v.camera.aspect = 1;
      v.frame(designRef.current.side); v.camera.updateProjectionMatrix(); v.draw();
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
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute("aria-label", "3D 의류. 드래그 또는 방향키로 회전할 수 있어요.");
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#f5f5f7");
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
    scene.add(new THREE.HemisphereLight("#ffffff", "#a5aaba", 2.2));
    const key = new THREE.DirectionalLight("#fffaf3", 3.8); key.position.set(-3, 4, 5); scene.add(key);
    const fill = new THREE.DirectionalLight("#dce6ff", 1.7); fill.position.set(4, 1, -3); scene.add(fill);
    const rim = new THREE.DirectionalLight("#ffffff", 1.8); rim.position.set(-2, 3, -4); scene.add(rim);
    controls.addEventListener("change", draw);
    const free = () => setFacing("free"); controls.addEventListener("start", free);
    const contextLost = (event: Event) => { event.preventDefault(); if (viewer.current) { viewer.current.ready = false; viewer.current.unavailable = true; } setStatus("fallback"); };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const observer = new ResizeObserver(() => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); draw();
    }); observer.observe(element);
    const dispose = () => { observer.disconnect(); controls.removeEventListener("change", draw); controls.removeEventListener("start", free); controls.dispose(); renderer.domElement.removeEventListener("webglcontextlost", contextLost); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
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
      if (showArtwork) {
        const source = currentDesign.image || (svg.current ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg.current))}` : null);
        if (source) {
          const bitmap = new Image();
          try {
            await new Promise<void>((resolve, reject) => { bitmap.onload = () => resolve(); bitmap.onerror = () => reject(new Error("도안 이미지")); bitmap.src = source; });
            if (cancelled) return;
            const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 940;
            const context = canvas.getContext("2d"); if (!context) throw new Error("도안 캔버스");
            const ratio = Math.min(1024 / bitmap.width, 940 / bitmap.height);
            context.drawImage(bitmap, (1024 - bitmap.width * ratio) / 2, (940 - bitmap.height * ratio) / 2, bitmap.width * ratio, bitmap.height * ratio);
            texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(8, v!.renderer.capabilities.getMaxAnisotropy());
          } catch { if (!cancelled) setStatus("fallback"); return; }
        }
      }
      if (cancelled) { texture?.dispose(); return; }
      if (v!.model) { v!.scene.remove(v!.model); disposeGarment(v!.model); }
      v!.model = createGarment(currentDesign, texture); v!.scene.add(v!.model); v!.ready = true; v!.draw(); setStatus("ready");
    }
    void update(); return () => { cancelled = true; };
  }, [designSnapshot, showArtwork]);

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
