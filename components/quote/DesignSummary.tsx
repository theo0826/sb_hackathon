"use client";
import { garmentName, type Design } from "@/lib/design";
import { totalQuantity, type OrderDraft } from "@/lib/quote";
import { pricingGarment } from "@/lib/garment-pricing";
export default function DesignSummary({ design, order, title = "내 주문" }: { design: Design; order: OrderDraft; title?: string }) {
  return <section className="wf-card wf-summary"><h2>{title}</h2><dl><div><dt>의류</dt><dd>{order.pricingGarment ? pricingGarment(order.pricingGarment).label : garmentName(design)}</dd></div><div><dt>수량</dt><dd>{totalQuantity(order)}벌</dd></div><div><dt>제작 방식</dt><dd>{order.method}</dd></div><div><dt>희망 수령일</dt><dd>{order.desiredDeliveryDate || "주문서에서 선택"}</dd></div></dl></section>;
}
