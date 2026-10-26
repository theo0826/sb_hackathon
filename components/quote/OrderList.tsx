"use client";
import { detailHref } from "@/lib/deployment";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useDemoOrders } from "@/lib/order-workflow-client";
import { getSupplier } from "@/lib/suppliers";
import { totalQuantity } from "@/lib/quote";
export default function OrderList() {
  const { orders, ready } = useDemoOrders();
  return <section className="my-order-history" aria-labelledby="my-orders-title"><div className="my-section-heading"><h2 id="my-orders-title">주문 · 도안 전달 내역</h2><p>확인한 주문 정보와 전달한 도안을 다시 살펴보세요.</p></div>{!ready ? <p role="status">주문을 불러오고 있어요.</p> : orders.length ? <div className="wf-order-cards">{orders.map(record => <Link key={record.id} href={detailHref("orders", record.id)} className="wf-card wf-order-row"><div><span className="wf-demo-label">{record.deliveryStatus === "recorded" ? "도안 전달 기록 저장" : "시연 주문 · 제작 중"}</span><h2>{record.order.group}</h2><p>{getSupplier(record.supplierId)?.name} · {totalQuantity(record.order)}벌 · 희망 수령일 {record.order.desiredDeliveryDate}</p></div><ArrowRight size={20} /></Link>)}</div> : <section className="wf-empty"><h2>아직 저장한 주문이 없어요.</h2><p>도안을 전달하면 주문과 도안 내역이 여기에 표시돼요.</p><Link href="/design" className="primary">디자인 시작하기 <ArrowRight size={16} /></Link></section>}<p className="wf-fine-print">주문과 도안 전달 내역은 현재 브라우저 탭에 보관됩니다. 탭을 닫기 전에 중요한 자료를 내려받아주세요.</p></section>;
}
