"use client";

import { publicPath } from "@/lib/deployment";
// 삭제금지: ClothSim 연동 — 홈의 임시 연동을 디자인 화면으로 이동.
import ClothSim from "../ClothSim";

export default function ClothSimulationPreview({ clothRepresentText, ready, onReady, onUnavailable }: {
  clothRepresentText: string;
  ready: boolean;
  onReady: () => void;
  onUnavailable: () => void;
}) {
  return <div className="studio-cloth-layer" style={{ visibility: ready ? "visible" : "hidden" }} aria-hidden={!ready}>
    {/* 삭제금지: ClothSim clothRepresentText 전달 */}
    <ClothSim scene={publicPath("/cloth")} clothRepresentText={clothRepresentText} onReady={onReady} onError={onUnavailable} style={{ width: "100%", height: "100%" }} />
  </div>;
}
