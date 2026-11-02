"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { normalizeCapturePixels } from "@/lib/capture-background";

const normalized = new Map<string, Promise<string>>();

// Older saved renders have a blue-grey or beige ground. Recolour only the connected
// background from the image edges; the garment and the stored original stay intact.
function normalizeCapture(src: string): Promise<string> {
  const cached = normalized.get(src);
  if (cached) return cached;
  const result = new Promise<string>(resolve => {
    const image = new window.Image();
    image.onerror = () => resolve(src);
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) return resolve(src);
        context.drawImage(image, 0, 0);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        if (!normalizeCapturePixels(frame.data, canvas.width, canvas.height)) return resolve(src);
        context.putImageData(frame, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch { resolve(src); }
    };
    image.src = src;
  });
  if (normalized.size >= 12) normalized.delete(normalized.keys().next().value!);
  normalized.set(src, result);
  return result;
}

export default function CaptureImage({ src, normalizeBackground = true, ...props }: ImageProps & { src: string; normalizeBackground?: boolean }) {
  const [render, setRender] = useState<{ source: string; src: string } | null>(null);
  useEffect(() => {
    if (!normalizeBackground || !src.startsWith("data:image/")) return;
    let active = true;
    void normalizeCapture(src).then(value => { if (active) setRender({ source: src, src: value }); });
    return () => { active = false; };
  }, [src, normalizeBackground]);
  // eslint-disable-next-line jsx-a11y/alt-text -- forwarded through ImageProps.
  return <Image {...props} src={normalizeBackground && render?.source === src ? render.src : src} unoptimized/>;
}
