"use client";
import { detailHref } from "@/lib/deployment";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { SUPPLIERS, getSupplier } from "@/lib/suppliers";
import { useDesignSession } from "@/lib/design-session";
import { validateDesignForSupplier, validateOrder, totalQuantity } from "@/lib/quote";
import { createDemoOrder, useOrderDetails } from "@/lib/order-workflow-client";
import { estimate, reviewIssues, won } from "@/lib/order-workflow";
import FlowSteps from "@/components/layout/FlowSteps";
import DesignSummary from "@/components/quote/DesignSummary";

export default function SupplierComparison() {
  const router = useRouter();
  const { design, order, filename, selectSupplier, hasResult } = useDesignSession();
  const productionOrder = design.placements?.length ? { ...order, printWidthCm: Math.max(...design.placements.map(p => p.widthCm)), printHeightCm: Math.max(...design.placements.map(p => p.heightCm)) } : order;
  const { details } = useOrderDetails();
  const [sort, setSort] = useState("recommended"), [pending, setPending] = useState<string | null>(null), [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null), active = useRef(false);
  const issues = reviewIssues(order, details);
  const supplier = getSupplier(pending);
  const selectedEstimate = supplier && estimate(supplier, order);
  const offers = SUPPLIERS.map(s => ({ supplier: s, price: estimate(s, productionOrder), issues: [...Object.values(validateOrder(productionOrder, s)), ...[validateDesignForSupplier(design, s)].filter(Boolean)] }));
  offers.sort((a, b) => sort === "price" ? a.price.total - b.price.total : sort === "delivery" ? a.price.days - b.price.days : a.issues.length - b.issues.length || a.price.total - b.price.total);
  function choose(id: string) { setPending(id); setError(""); dialog.current?.showModal(); }
  function confirm() {
    if (!supplier || active.current) return;
    const invalid = [...reviewIssues(productionOrder, details), ...Object.values(validateOrder(productionOrder, supplier)), ...[validateDesignForSupplier(design, supplier)].filter(Boolean)];
    if (invalid.length) { setError(invalid.join(" ")); return; }
    active.current = true;
    try { const record = createDemoOrder({ supplierId: supplier.id, design, order: productionOrder, details, filename }); selectSupplier(supplier.id); dialog.current?.close(); router.push(detailHref("orders", record.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "저장하지 못했어요."); active.current = false; }
  }
  return <main id="main-content" className="wf-page"><FlowSteps current={3} />
    {(!hasResult && !design.image) || issues.length > 0 ? <section className="wf-empty"><h1>주문서를 먼저 확인해주세요.</h1><p>{!hasResult && !design.image ? "선택한 디자인이 필요해요." : issues[0]}</p><Link className="primary" href={!hasResult && !design.image ? "/design" : "/quotes/new"}>이전 단계로 <ArrowRight size={16} /></Link></section> : <div className="wf-content"><div className="wf-title"><h1>업체 {offers.length}곳의 견적을 비교해보세요</h1><p>같은 주문 조건으로 비교하는 시연용 견적이에요.</p></div><div className="wf-two-column"><div>
      <div className="wf-offer-toolbar"><span>총 {totalQuantity(order)}벌 · {order.method}</span><div className="wf-sort" role="group" aria-label="견적 정렬">{[['recommended','추천순'],['price','낮은 가격'],['delivery','빠른 납기']].map(([value,label]) => <button key={value} aria-pressed={sort === value} onClick={() => setSort(value)}>{label}</button>)}</div></div>
      <div className="wf-offers">{offers.map(({ supplier: s, price, issues: supplierIssues }, index) => <article key={s.id} className="wf-offer" data-recommended={index === 0 && !supplierIssues.length}>
        <div className="wf-offer-name">{index === 0 && !supplierIssues.length && <span className="wf-recommendation">조건에 맞는 업체</span>}<h2>{s.name}</h2><p>성북구 {s.region} · 최소 {s.minOrder}벌</p></div>
        <div><span className="wf-muted">총 견적 · 예시</span><strong>{won(price.total)}</strong><small>1벌 {won(price.unit)}</small></div><div><span className="wf-muted">예상 제작 기간</span><strong>{s.leadDays}</strong><small>일정은 업체 확인 후 확정</small></div><div className="wf-offer-conditions"><span className="wf-muted">확인 사항</span><p className={supplierIssues.length ? "wf-warning" : "wf-ok"}>{supplierIssues.length ? supplierIssues.join(" ") : "현재 주문 조건에 맞아요"}</p></div>
        <button className={index === 0 && !supplierIssues.length ? "primary" : "outline"} disabled={supplierIssues.length > 0} onClick={() => choose(s.id)}>이 업체 선택 <ArrowRight size={15} /></button>
      </article>)}</div><p className="wf-fine-print">업체와 가격은 시연용 예시입니다. 실제 견적 요청·업체 발송·결제는 이루어지지 않습니다.</p>
    </div><aside className="wf-aside"><DesignSummary design={design} order={order} /><Link href="/quotes/new" className="outline wide">주문서 다시 보기</Link><section className="wf-card wf-comparison-note"><Check size={18} /><h2>주문 조건을 확인했어요</h2><p>수량, 제작 방식, 인쇄 크기를 기준으로 선택 가능한 업체를 표시해요.</p></section></aside></div></div>}
    <dialog ref={dialog} className="wf-dialog" aria-labelledby="supplier-confirm-title"><button className="wf-dialog-close wf-icon" aria-label="업체 선택 닫기" onClick={() => dialog.current?.close()}><X size={20} /></button><h2 id="supplier-confirm-title">{supplier?.name}와 진행할까요?</h2><p>선택한 디자인과 주문서로 제작 진행 화면을 체험해요.</p>{selectedEstimate && <dl><div><dt>예시 총액</dt><dd>{won(selectedEstimate.total)}</dd></div><div><dt>주문 수량</dt><dd>{totalQuantity(order)}벌</dd></div><div><dt>결제 방식</dt><dd>{details.payment === "group" ? "대표자 결제" : "개별 결제"}</dd></div></dl>}<p className="wf-demo-label">시연 주문 · 실제 결제 없음</p>{error && <p role="alert" className="field-error">{error}</p>}<button className="primary wide" onClick={confirm}>시연 주문으로 진행 <ArrowRight size={16} /></button><button className="text-link wide" onClick={() => dialog.current?.close()}>다시 비교하기</button></dialog>
  </main>;
}
