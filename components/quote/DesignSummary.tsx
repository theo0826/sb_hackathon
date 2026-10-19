"use client";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { garmentName, type Design } from "@/lib/design";
import { totalQuantity, type OrderDraft } from "@/lib/quote";
import type { CanvasHandle } from "@/components/design/DesignCanvas";
const Canvas = dynamic(() => import("@/components/design/DesignCanvas"), { ssr: false, loading: () => <div className="wf-preview-loading">도안 준비 중…</div> });
export function DesignThumbnail({ design }: { design: Design }) { const ref = useRef<CanvasHandle>(null); return <div className="wf-thumbnail" aria-hidden="true"><Canvas design={design} exportRef={ref} editable={false} onChange={() => {}} /></div>; }
export function DesignViews({ design }: { design: Design }) {
  const front = useRef<CanvasHandle>(null), back = useRef<CanvasHandle>(null);
  return <div className="wf-design-views">{(["front", "back"] as const).map(side => <div key={side}><Canvas design={{ ...design, side }} exportRef={side === "front" ? front : back} editable={false} showArtwork={!!design.placements || design.side === side} onChange={() => {}} /><span>{side === "front" ? "앞면" : "뒷면"}</span></div>)}</div>;
}
export default function DesignSummary({ design, order, title = "내 주문" }: { design: Design; order: OrderDraft; title?: string }) {
  return <section className="wf-card wf-summary"><h2>{title}</h2><DesignViews design={design} /><dl><div><dt>의류</dt><dd>{garmentName(design)}</dd></div><div><dt>수량</dt><dd>{totalQuantity(order)}벌</dd></div><div><dt>제작 방식</dt><dd>{order.method}</dd></div><div><dt>희망 수령일</dt><dd>{order.desiredDeliveryDate || "주문서에서 선택"}</dd></div></dl></section>;
}
