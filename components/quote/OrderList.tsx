"use client";
import Link from "next/link";
import Image from "next/image";
import { detailHref } from "@/lib/deployment";
import { useDemoOrders, resetOrderDetails } from "@/lib/order-workflow-client";
import { useDesignSession } from "@/lib/design-session";
import { getSupplier } from "@/lib/suppliers";
import { estimate, won } from "@/lib/order-workflow";
import { totalQuantity, type QuoteRecord } from "@/lib/quote";
import { pricingGarment } from "@/lib/garment-pricing";
import { orderHistory } from "@/lib/order-history";
import Asset from "@/components/layout/WorkspaceAsset";
type Props = { requests?: QuoteRecord[]; requestsLoading?: boolean; requestsError?: string };
export default function OrderList({ requests = [], requestsLoading = false, requestsError = "" }: Props = {}) {
  const { orders, ready } = useDemoOrders();
  const { resetSession } = useDesignSession();
  const entries = orderHistory(orders, requests);
  return <section className="my-order-history" aria-label="주문 · 요청서 전달 내역">
    {requestsError && <p className="error" role="alert">{requestsError}</p>}
    {!ready || requestsLoading ? <p role="status">주문과 요청서를 불러오고 있어요.</p> : entries.length ? <div className="account-orders">{entries.map(entry => {
      const record = entry.snapshot, supplier = getSupplier(record.supplierId), capture = record.clothCapture;
      const date = new Intl.DateTimeFormat("ko-KR", { timeZone:"Asia/Seoul", month:"long", day:"numeric" }).format(new Date(record.createdAt));
      const href = entry.orderId ? detailHref("orders", entry.orderId) : detailHref("quotes", record.id);
      const garment = capture?.category?.label || pricingGarment(record.order.pricingGarment).label;
      return <Link key={entry.id} href={href} className="account-history-card" data-order-id={entry.orderId} data-request-id={record.id} aria-label={supplier?.name + " · " + record.order.group + " 주문 상세"}>
        <div className="account-history-top"><time dateTime={record.createdAt}>{date}</time><span>주문 상세 <Asset name="ebe36.svg"/></span></div>
        <p className="account-history-status">{entry.status === "delivered" ? "요청서 전달 완료" : entry.status === "production" ? "제작 진행 · 시연" : "요청서 보관"}</p>
        <div className="account-history-product"><div className="account-history-thumb">{capture ? <Image src={capture.front} alt={record.order.group + " 주문 의류 앞면"} width={72} height={72} unoptimized/> : <Asset name="173c1.svg"/>}</div><div><h3>{garment === "반팔" ? "반팔 티셔츠" : garment} {totalQuantity(record.order)}벌</h3><p>{supplier?.name}</p><strong>{supplier ? won(estimate(supplier,record.order).total) : "견적 확인 필요"}</strong></div></div>
      </Link>;
    })}</div> : !requestsError && <div className="empty-state"><span className="account-empty-icon"><Asset name="e88f7.svg" className="account-desktop"/><Asset name="15d1c.svg" className="account-mobile"/></span><h2>아직 주문이 없어요</h2><p>디자인을 만들고 성북 업체 견적을 받아보세요.</p><Link href="/design" onClick={() => { resetSession(); resetOrderDetails(); }} className="primary">디자인 만들기 <Asset name="f3484.svg"/></Link></div>}
    {!!entries.length && <p className="wf-fine-print">주문과 전달 내역은 지금 브라우저 탭에 보관돼요. 탭을 닫기 전에 필요한 자료는 내려받아 주세요.</p>}
  </section>;
}
