"use client";

import CaptureImage from "./CaptureImage";
import type { ClothCapture } from "@/lib/cloth-capture";

export default function ClothCapturePreview({ capture, downloads = false, shortLabels = false }: { capture: ClothCapture; downloads?: boolean; shortLabels?: boolean }) {
  return <div className="cloth-capture-pair">{(["front", "back"] as const).map(side => <figure key={side}>
    <CaptureImage src={capture[side]} width={1024} height={1024} alt={`생성한 의류 ${side === "front" ? "앞면" : "뒷면"}`} />
    <figcaption><span>{side === "front" ? shortLabels ? "앞" : "앞면" : shortLabels ? "뒤" : "뒷면"}</span>{downloads && <a className="text-link" href={capture[side]} download={`한땀-${side}.jpg`}>이미지 저장</a>}</figcaption>
  </figure>)}</div>;
}
