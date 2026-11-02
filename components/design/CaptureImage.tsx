"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

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
        const pixels = frame.data;
        const matches = (rgb: number[]) => rgb.every((value, i) => Math.abs(pixels[i] - value) <= 3);
        if (!matches([241, 243, 246]) && !matches([247, 246, 243])) return resolve(src);
        const ground = Array.from({ length: canvas.height }, (_, y) => Array.from(pixels.slice(y * canvas.width * 4, y * canvas.width * 4 + 3)));
        const count = canvas.width * canvas.height;
        const seen = new Uint8Array(count), queue = new Uint32Array(count);
        let head = 0, tail = 0;
        const visit = (index: number) => {
          if (seen[index]) return;
          seen[index] = 1;
          const offset = index * 4;
          if (ground[Math.floor(index / canvas.width)].some((channel, i) => Math.abs(pixels[offset + i] - channel) > 4)) return;
          queue[tail++] = index;
        };
        for (let x = 0; x < canvas.width; x++) { visit(x); visit(count - canvas.width + x); }
        for (let y = 0; y < canvas.height; y++) { visit(y * canvas.width); visit((y + 1) * canvas.width - 1); }
        while (head < tail) {
          const index = queue[head++], offset = index * 4, x = index % canvas.width;
          pixels[offset] = 247; pixels[offset + 1] = 248; pixels[offset + 2] = 250;
          if (x > 0) visit(index - 1);
          if (x < canvas.width - 1) visit(index + 1);
          if (index >= canvas.width) visit(index - canvas.width);
          if (index < count - canvas.width) visit(index + canvas.width);
        }
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
