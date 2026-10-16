"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createGarment, disposeGarment, loadGarmentMaster } from "@/lib/garment-model";
import { DEFAULT_DESIGN, type Design } from "@/lib/design";
import ShirtPreview from "@/components/design/ShirtPreview";

export default function RunwayScene({ color, paused }: { color: string; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef({ color, paused });
  const wake = useRef<() => void>(() => {});
  const [failed, setFailed] = useState(false);
  useEffect(() => { current.current = { color, paused }; wake.current(); }, [color, paused]);

  useEffect(() => {
    const target = host.current;
    if (!target) return;
    const element: HTMLDivElement = target;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch { const id = requestAnimationFrame(() => setFailed(true)); return () => cancelAnimationFrame(id); }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
    scene.add(new THREE.HemisphereLight("#ffffff", "#a1afc1", 2.8));
    const key = new THREE.DirectionalLight("#ffffff", 4); key.position.set(-3, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight("#b9d8ff", 2); rim.position.set(4, 2, -3); scene.add(rim);
    const makeTexture = (text: string, ink: string) => {
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1024;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 12;
      ctx.textAlign = "center"; ctx.font = "900 122px Arial";
      ctx.fillText(text, 512, 440); ctx.font = "700 56px Arial";
      ctx.fillText("SEONGBUK", 512, 535);
      ctx.beginPath(); ctx.ellipse(512, 468, 430, 220, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.font = "700 42px Arial"; ctx.fillText("OUR OWN KIND OF FIT", 512, 645);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
    };
    const designs: Design[] = [
      { ...DEFAULT_DESIGN, color: "#e8e5dd", ink: "#253952", text: "WAVE" },
      { ...DEFAULT_DESIGN, color: current.current.color, text: "OUR CLUB" },
      { ...DEFAULT_DESIGN, color: "#236b60", text: "FIT" },
    ];
    const models = designs.map(d => { const model = createGarment(d, makeTexture(d.text, d.ink)); scene.add(model); return model; });
    const centerMaterials: THREE.MeshStandardMaterial[] = [];
    const collectCenterMaterials = () => {
      centerMaterials.length = 0;
      models[1].traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          if (material instanceof THREE.MeshStandardMaterial && material.name === "Fabric") centerMaterials.push(material);
        }
      });
    };
    collectCenterMaterials();
    let disposed = false;
    void loadGarmentMaster().then(master => {
      if (disposed) return;
      designs.forEach((design, i) => {
        const previous = models[i], next = createGarment(design, makeTexture(design.text, design.ink), undefined, master);
        next.position.copy(previous.position); next.quaternion.copy(previous.quaternion); next.scale.copy(previous.scale);
        scene.remove(previous); disposeGarment(previous); models[i] = next; scene.add(next);
      });
      collectCenterMaterials(); element.dataset.modelSource = "makehuman-cc0"; syncLoop();
    }).catch(() => { /* The local procedural fallback remains available if the asset cannot load. */ });
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true, unavailable = false, frame = 0, last = 0, time = 0, width = 1, height = 1, pointerX = 0, pointerY = 0;
    let smoothX = 0, smoothY = 0, smoothScroll = 0;
    const targetColor = new THREE.Color();
    const resize = () => {
      width = element.clientWidth; height = element.clientHeight;
      renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1);
      camera.position.set(0, .15, width < 420 ? 10.4 : 9.2); camera.lookAt(0, .08, 0); camera.updateProjectionMatrix();
      syncLoop();
    };
    const observer = new ResizeObserver(resize); observer.observe(element);
    const visibility = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncLoop(); }); visibility.observe(element);
    function draw(now: number) {
      frame = 0;
      const reduced = media.matches || current.current.paused;
      const delta = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
      if (!reduced) time += delta;
      const scroll = Math.min(1, Math.max(0, -element.getBoundingClientRect().top / innerHeight));
      const smoothing = 1 - Math.exp(-delta * 3.2);
      if (!reduced) { smoothX += (pointerX - smoothX) * smoothing; smoothY += (pointerY - smoothY) * smoothing; smoothScroll += (scroll - smoothScroll) * smoothing; }
      const spread = width < 420 ? 1.55 : 1.85;
      models.forEach((model, i) => {
        const side = i - 1;
        if (!current.current.paused || time === 0) {
          model.position.set(side * spread + (reduced ? 0 : Math.sin(time * .36 + i * 1.3) * .16 + smoothX * .26), (i === 1 ? .02 : -.14) + (reduced ? 0 : Math.sin(time * .6 + i * 1.8) * .22), i === 1 ? .4 : -.45);
          model.rotation.set(reduced ? 0 : Math.sin(time * .28 + i) * .045 + smoothY * .24, side * -.32 + (reduced ? 0 : Math.sin(time * .28 + i) * .34 + smoothX * .65 + smoothScroll * 1.3), side * -.1 + (reduced ? 0 : Math.sin(time * .32 + i) * .06));
          model.scale.setScalar(i === 1 ? 1.03 : .8);
        }
      });
      targetColor.set(current.current.color); centerMaterials.forEach(material => material.color.lerp(targetColor, reduced ? 1 : .09));
      renderer.render(scene, camera);
      if (visible && !unavailable && !document.hidden && !reduced) frame = requestAnimationFrame(draw);
    }
    function syncLoop() { if (visible && !unavailable && !document.hidden && !frame) { last = 0; frame = requestAnimationFrame(draw); } else if ((!visible || unavailable || document.hidden) && frame) { cancelAnimationFrame(frame); frame = 0; } }
    wake.current = syncLoop;
    const pointer = (event: PointerEvent) => { const rect = element.getBoundingClientRect(); pointerX = (event.clientX - rect.left) / width - .5; pointerY = (event.clientY - rect.top) / height - .5; };
    const leave = () => { pointerX = pointerY = 0; };
    const lost = (event: Event) => { event.preventDefault(); unavailable = true; visible = false; cancelAnimationFrame(frame); setFailed(true); };
    element.addEventListener("pointermove", pointer); element.addEventListener("pointerleave", leave);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", syncLoop); media.addEventListener("change", syncLoop); resize(); syncLoop();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame); observer.disconnect(); visibility.disconnect(); wake.current = () => {};
      document.removeEventListener("visibilitychange", syncLoop); media.removeEventListener("change", syncLoop); element.removeEventListener("pointermove", pointer); element.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      models.forEach(disposeGarment); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, []);

  return <div className="runway-scene" role="img" aria-label="단색 반팔티의 움직이는 3D 룩북">
    <div ref={host} className="runway-canvas" hidden={failed} />
    {failed && <div className="runway-fallback"><ShirtPreview color={color} ink="#e9dec2" text="OUR CLUB" style="campus" /></div>}
  </div>;
}
