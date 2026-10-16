"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useDemoOrders } from "@/lib/order-workflow-client";
import { getSupplier } from "@/lib/suppliers";
import { totalQuantity } from "@/lib/quote";
export default function OrderList() {
  const { orders, ready } = useDemoOrders();
  return <section className="my-order-history" aria-labelledby="my-orders-title"><div className="my-section-heading"><h2 id="my-orders-title">제작 진행</h2><p>함께 입을 단체티가 완성되는 과정.</p></div>{!ready ? <p role="status">주문을 불러오고 있어요.</p> : orders.length ? <div className="wf-order-cards">{orders.map(record => <Link key={record.id} href={`/orders/${record.id}`} className="wf-card wf-order-row"><div><span className="wf-demo-label">시연 주문 · 제작 중</span><h2>{record.order.group}</h2><p>{getSupplier(record.supplierId)?.name} · {totalQuantity(record.order)}벌 · 희망 수령일 {record.order.desiredDeliveryDate}</p></div><ArrowRight size={20} /></Link>)}</div> : <section className="wf-empty"><h2>아직 진행 중인 주문이 없어요.</h2><p>디자인을 만들고 우리 팀에 맞는 업체를 선택해보세요.</p><Link href="/design" className="primary">디자인 시작하기 <ArrowRight size={16} /></Link></section>}<p className="wf-fine-print">시연 주문은 현재 브라우저 탭에 보관됩니다. 클라우드에 저장한 디자인과 제작자료는 보관함에서 확인하세요.</p></section>;
}
