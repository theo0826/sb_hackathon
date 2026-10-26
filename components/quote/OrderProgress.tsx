"use client";
import Link from "next/link";
import { Check, ArrowRight, FileText } from "lucide-react";
import { useDemoOrders } from "@/lib/order-workflow-client";
import { detailHref } from "@/lib/deployment";
import { orderQuoteId } from "@/lib/order-documents";
import { estimate, won } from "@/lib/order-workflow";
import { getSupplier } from "@/lib/suppliers";
import FlowSteps from "@/components/layout/FlowSteps";
import Artwork from "@/components/design/Artwork";
import { orderRows } from "@/lib/quote";

export default function OrderProgress({ id }: { id: string }) {
  const { orders, ready } = useDemoOrders();
  const record = orders.find(order => order.id === id), supplier = getSupplier(record?.supplierId);
  const price = record && supplier ? estimate(supplier, record.order) : null;
  if (ready && record && supplier && record.deliveryStatus === "recorded") return <main id="main-content" className="wf-page"><FlowSteps current={4} /><div className="wf-content">
    <div className="wf-title"><p>전달번호 {record.id.slice(5, 13).toUpperCase()} · {supplier.name}</p><h1>주문과 도안을 보관했어요.</h1><p>{record.order.group} · 희망 수령일 {record.order.desiredDeliveryDate}</p></div>
    <div className="wf-two-column"><section className="wf-card"><h2>전달할 때 확인한 주문 정보</h2><dl className="document-rows">{orderRows(supplier, record.design, record.order).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}<div><dt>수령 방법</dt><dd>{record.details.delivery === "pickup" ? "방문 수령" : "택배 배송"}</dd></div>{record.details.delivery === "shipping" && <div><dt>배송 주소</dt><dd>{record.details.address}</dd></div>}<div><dt>추가 요청</dt><dd>{record.order.memo || "없음"}</dd></div></dl></section>
    <aside className="wf-aside"><section className="wf-card"><h2>도안 전달 기록</h2><p className="wf-muted">주문 정보와 디자인 원본을 현재 탭에 보관했어요. 실제 업체 발송·결제·제작 승인은 별도예요.</p><Link href={detailHref("quotes", orderQuoteId(record))} className="outline wide"><FileText size={16} />전달한 도안 · 제작자료 보기</Link></section><section className="wf-card"><h2>보관한 디자인 원본</h2><div className="document-art" style={{ backgroundColor:record.design.color }}><Artwork design={record.design} /></div></section><Link href="/my?tab=orders" className="primary wide">마이페이지 주문 내역 <ArrowRight size={15} /></Link></aside></div>
  </div></main>;
  return <main id="main-content" className="wf-page"><FlowSteps current={4} />{!ready ? <div className="wf-empty" role="status">주문을 불러오고 있어요.</div> : !record || !supplier || !price ? <section className="wf-empty"><h1>주문을 찾을 수 없어요.</h1><p>시연 주문은 작성한 브라우저 탭에 보관됩니다.</p><Link href="/my?tab=orders" className="primary">내 주문 보기</Link></section> : <div className="wf-content"><div className="wf-title"><p>주문번호 {record.id.slice(5, 13).toUpperCase()} · {supplier.name}</p><h1>업체가 도안을 승인했어요. 제작 중이에요</h1><p>희망 수령일 {record.order.desiredDeliveryDate} · {record.order.group}</p></div><p className="wf-demo-label">시연 주문입니다. 아래 승인·제작 단계는 예시이며 실제 발송·결제·제작은 진행되지 않습니다.</p><div className="wf-two-column"><section className="wf-card wf-timeline"><ol>{[
      ["견적 요청", "선택한 디자인과 주문서 확인"], ["업체 선택 · 결제", `${supplier.name} 선택 · 결제 단계 시연`], ["업체 도안 확인 → 승인", "업체와 최종 도안을 확인하는 단계예요."], ["제작 중", "인쇄와 검품 · 완성까지의 과정을 안내해요."], ["완성 · 수령 확인", "수령 후 주문을 마무리해요."]
    ].map(([title, text], index) => <li key={title} data-state={index < 3 ? "complete" : index === 3 ? "active" : "pending"}><span className="wf-timeline-dot">{index < 3 ? <Check size={15} /> : index + 1}</span><div><div className="wf-timeline-heading"><h2>{title}</h2><span>{index === 3 ? "진행 중 · 예시" : index < 3 ? "완료 · 예시" : "대기"}</span></div><p>{text}</p>{index === 2 && <p className="wf-timeline-note">최종 인쇄 위치와 크기는 업체 검수 후 확정해요.</p>}</div></li>)}</ol></section><aside className="wf-aside"><section className="wf-card"><h2>{supplier.name}</h2><p className="wf-muted">성북구 {supplier.region} · 시연 업체</p><Link href={detailHref("quotes", orderQuoteId(record))} className="outline wide"><FileText size={16} />견적 요청서 · 제작자료 보기</Link></section><section className="wf-card wf-payment"><h2>결제 정보</h2><dl><div><dt>의류비 · 예시</dt><dd>{won(price.total)}</dd></div><div><dt>추가 수수료 · 예시</dt><dd>0원</dd></div><div className="wf-total"><dt>합계 · 예시</dt><dd>{won(price.total)}</dd></div></dl><p className="wf-muted">실제 결제된 금액이 아닙니다.</p></section><section className="wf-card"><h2>최종 도안</h2><Artwork design={record.design} /></section><button disabled className="outline wide">수령 확인 (완성 후 활성화)</button><Link href="/my?tab=orders" className="text-link wide">마이페이지의 주문으로 <ArrowRight size={15} /></Link></aside></div></div>}</main>;
}
