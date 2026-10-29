"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { detailHref } from "@/lib/deployment";
import { useDemoOrders } from "@/lib/order-workflow-client";
import { getSupplier } from "@/lib/suppliers";
import { estimate, won } from "@/lib/order-workflow";
import { totalQuantity, type QuoteRecord } from "@/lib/quote";
import { pricingGarment } from "@/lib/garment-pricing";
import { orderHistory } from "@/lib/order-history";
import { downloadRequestPDF, downloadRequestImages } from "@/lib/request-download";
import Asset from "@/components/layout/WorkspaceAsset";

type Props = { requests?: QuoteRecord[]; requestsLoading?: boolean; requestsError?: string; busyId?: string | null; onTrash?: (request: QuoteRecord) => void };
export default function OrderList({ requests = [], requestsLoading = false, requestsError = "", busyId, onTrash }: Props = {}) {
  const { orders, ready } = useDemoOrders();
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState(""), [message, setMessage] = useState("");
  const entries = orderHistory(orders, requests);
  const disabled = !!busy || !!busyId;
  async function download(record: QuoteRecord, images = false) {
    if (disabled) return;
    setBusy(record.id); setError(""); setMessage("");
    try {
      if (images) downloadRequestImages(record); else await downloadRequestPDF(record);
      setMessage(`${getSupplier(record.supplierId)?.name} · ${record.order.group}의 ${images ? "앞·뒷면 이미지 내려받기를 요청했어요." : "제작 요청서를 내려받았어요."}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "파일을 내려받지 못했어요."); }
    finally { setBusy(null); }
  }
  return <section className="my-order-history" aria-labelledby="my-orders-title">
    <div className="my-section-heading"><h2 id="my-orders-title">주문 · 요청서 전달 내역</h2><p>업체별 주문 내용과 요청서, 앞·뒷면 도안을 함께 확인하세요.</p></div>
    {requestsError && <p className="error" role="alert">{requestsError}</p>}
    {!ready || requestsLoading ? <p role="status">주문과 요청서를 불러오고 있어요.</p> : entries.length ? <div className="account-orders">{entries.map(entry => {
      const record = entry.snapshot, request = entry.request, supplier = getSupplier(record.supplierId), capture = record.clothCapture;
      const date = new Intl.DateTimeFormat("ko-KR", { timeZone:"Asia/Seoul", month:"long", day:"numeric" }).format(new Date(record.createdAt));
      const viewHref = entry.orderId ? detailHref("orders", entry.orderId) : detailHref("quotes", record.id);
      const context = `${supplier?.name || "제작 업체"} · ${record.order.group}`;
      return <article key={entry.id} className="account-order" data-order-id={entry.orderId} data-request-id={record.id} aria-label={context}>
        <div className="account-order-summary"><div className="account-order-top"><div className="account-order-thumb">{capture ? <Image src={capture.front!} alt={`${context} 주문 의류 앞면`} width={84} height={84} unoptimized/> : <Asset name="173c1.svg"/>}</div><div className="account-order-info"><div><span className="account-status">{entry.status === "delivered" ? "요청서 전달 완료" : entry.status === "production" ? "제작 진행 · 시연" : "요청서 보관"}</span><time dateTime={record.createdAt}>{date}</time></div><h3>{supplier?.name} · {record.order.group}</h3><p>{capture?.category?.label || pricingGarment(record.order.pricingGarment).label} · {totalQuantity(record.order)}벌 · {record.order.method === "DTF" ? "DTF 전사" : record.order.method}</p><p className="account-order-delivery">{record.order.desiredDeliveryDate} 수령 희망<span className="account-desktop"> · 제작 {supplier?.leadDays}</span></p></div></div><div className="account-order-bottom"><strong>{supplier ? won(estimate(supplier, record.order).total) : "견적 확인 필요"}</strong><Link href={viewHref} className="account-pill">요청서 보기</Link></div></div>
        <div className="account-order-files" aria-label={`${context} 제작자료`}>
          {request ? <><div className="account-file"><span className="account-file-icon"><Asset name="11319.svg"/></span><Link href={detailHref("quotes", request.id)}><strong>제작 요청서</strong><small>PDF · {record.order.group} · {supplier?.name}</small></Link><button disabled={disabled} onClick={() => void download(request)} aria-label={`${context} 요청서 내려받기`}><Asset name="cd7aa.svg"/><span>{busy === request.id ? "준비 중…" : "내려받기"}</span></button>{onTrash && <button className="library-delete" disabled={disabled} onClick={() => onTrash(request)} aria-label={`${context} 제작자료 삭제`}><Asset name="d5d2c.svg"/><span>삭제</span></button>}</div>
          {request.clothCapture && <div className="account-file"><span className="account-file-icon"><Asset name="8a879.svg"/></span><Link href={detailHref("quotes", request.id)}><strong>앞·뒷면 도안 이미지</strong><small>{record.order.group} · 제작 검토용 이미지 2장</small></Link><button disabled={disabled} onClick={() => void download(request, true)} aria-label={`${context} 앞·뒷면 도안 이미지 내려받기`}><Asset name="cd7aa.svg"/><span>내려받기</span></button></div>}</> : <p className="account-order-trashed">이 주문의 제작자료는 휴지통에 있어요. <Link href="/my?tab=trash">제작자료 복원하기 →</Link></p>}
        </div>
      </article>;
    })}</div> : !requestsError && <div className="empty-state"><h2>아직 저장한 주문·요청서가 없어요.</h2><p>요청서를 전달하면 업체별 주문과 제작자료가 함께 표시돼요.</p><Link href="/design" className="primary">디자인 시작하기 →</Link></div>}
    {error && <p role="alert" className="error">{error}</p>}{message && <p role="status" className="library-action-feedback">{message}</p>}
    <p className="wf-fine-print">주문과 전달 내역은 지금 브라우저 탭에 보관돼요. 탭을 닫기 전에 필요한 자료는 내려받아 주세요.</p>
  </section>;
}
