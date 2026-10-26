"use client";

import Image from "next/image";
import type { ClothCapture } from "@/lib/cloth-capture";

export default function ClothCapturePreview({ capture, downloads = false }: { capture: ClothCapture; downloads?: boolean }) {
  return <div className="cloth-capture-pair">{(["front", "back"] as const).map(side => <figure key={side}>
    <Image src={capture[side]} width={1024} height={1024} alt={`생성한 의류 ${side === "front" ? "앞면" : "뒷면"}`} unoptimized />
    <figcaption><span>{side === "front" ? "앞면" : "뒷면"}</span>{downloads && <a className="text-link" href={capture[side]} download={`성북핏-${side}.jpg`}>이미지 저장</a>}</figcaption>
  </figure>)}</div>;
}
