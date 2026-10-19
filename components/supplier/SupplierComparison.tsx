"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { SUPPLIERS } from "@/lib/suppliers";
import { useDesignSession } from "@/lib/design-session";
import { validateDesignForSupplier, validateOrder, totalQuantity } from "@/lib/quote";
import { useOrderDetails } from "@/lib/order-workflow-client";
import { estimate, reviewIssues, won } from "@/lib/order-workflow";
import FlowSteps from "@/components/layout/FlowSteps";
import DesignSummary from "@/components/quote/DesignSummary";

export default function SupplierComparison() {
  const router = useRouter();
  const { design, order, setOrder, selectSupplier, hasResult } = useDesignSession();
  const productionOrder = design.placements?.length ? { ...order, printWidthCm: Math.max(...design.placements.map(p => p.widthCm)), printHeightCm: Math.max(...design.placements.map(p => p.heightCm)) } : order;
  const { details } = useOrderDetails();
  const [sort, setSort] = useState("recommended");
  const issues = reviewIssues(order, details);
  const offers = SUPPLIERS.map(s => ({ supplier: s, price: estimate(s, productionOrder), issues: [...Object.values(validateOrder(productionOrder, s)), ...[validateDesignForSupplier(design, s)].filter(Boolean)] }));
  offers.sort((a, b) => sort === "price" ? a.price.total - b.price.total : sort === "delivery" ? a.price.days - b.price.days : a.issues.length - b.issues.length || a.price.total - b.price.total);
  function prepareDesign(id: string) { setOrder(productionOrder); selectSupplier(id); router.push("/quotes/prepare"); }
  return <main id="main-content" className="wf-page"><FlowSteps current={3} />
    {(!hasResult && !design.image) || issues.length > 0 ? <section className="wf-empty"><h1>주문서를 먼저 확인해주세요.</h1><p>{!hasResult && !design.image ? "선택한 디자인이 필요해요." : issues[0]}</p><Link className="primary" href={!hasResult && !design.image ? "/design" : "/quotes/new"}>이전 단계로 <ArrowRight size={16} /></Link></section> : <div className="wf-content"><div className="wf-title"><h1>업체 {offers.length}곳의 견적을 비교해보세요</h1><p>같은 주문 조건으로 비교하는 시연용 견적이에요.</p></div><div className="wf-two-column"><div>
      <div className="wf-offer-toolbar"><span>총 {totalQuantity(order)}벌 · {order.method}</span><div className="wf-sort" role="group" aria-label="견적 정렬">{[['recommended','추천순'],['price','낮은 가격'],['delivery','빠른 납기']].map(([value,label]) => <button key={value} aria-pressed={sort === value} onClick={() => setSort(value)}>{label}</button>)}</div></div>
      <div className="wf-offers">{offers.map(({ supplier: s, price, issues: supplierIssues }, index) => <article key={s.id} className="wf-offer" data-recommended={index === 0 && !supplierIssues.length}>
        <div className="wf-offer-name">{index === 0 && !supplierIssues.length && <span className="wf-recommendation">조건에 맞는 업체</span>}<h2>{s.name}</h2><p>성북구 {s.region} · 최소 {s.minOrder}벌</p></div>
        <div><span className="wf-muted">총 견적 · 예시</span><strong>{won(price.total)}</strong><small>1벌 {won(price.unit)}</small></div><div><span className="wf-muted">예상 제작 기간</span><strong>{s.leadDays}</strong><small>일정은 업체 확인 후 확정</small></div><div className="wf-offer-conditions"><span className="wf-muted">확인 사항</span><p className={supplierIssues.length ? "wf-warning" : "wf-ok"}>{supplierIssues.length ? supplierIssues.join(" ") : "현재 주문 조건에 맞아요"}</p></div>
        <div className="wf-offer-actions"><button className="primary" disabled={supplierIssues.length > 0} onClick={() => prepareDesign(s.id)}>AI 맞춤 도안 만들기 <ArrowRight size={15} /></button></div>
      </article>)}</div><p className="wf-fine-print">업체와 가격은 시연용 예시입니다. 실제 견적 요청·업체 발송·결제는 이루어지지 않습니다.</p>
    </div><aside className="wf-aside"><DesignSummary design={design} order={order} /><Link href="/quotes/new" className="outline wide">주문서 다시 보기</Link><section className="wf-card wf-comparison-note"><Check size={18} /><h2>주문 조건을 확인했어요</h2><p>수량, 제작 방식, 인쇄 크기를 기준으로 선택 가능한 업체를 표시해요.</p></section></aside></div></div>}

  </main>;
}
