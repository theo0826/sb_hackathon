"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type Ref } from "react";
import type { Design } from "@/lib/design";
import { SIZES, totalQuantity, type OrderDraft } from "@/lib/quote";
import type { ClothCapture } from "@/lib/cloth-capture";
import type { Supplier } from "@/lib/suppliers";
import type { OrderDetails } from "@/lib/order-workflow";
import { estimate, won } from "@/lib/order-workflow";
import { pricingGarment } from "@/lib/garment-pricing";
import SupplierHeader from "@/components/supplier/SupplierHeader";
import SupplierAsset from "@/components/supplier/SupplierAsset";
import Asset from "@/components/layout/WorkspaceAsset";

type Props = { supplier: Supplier; design: Design; order: OrderDraft; details?: OrderDetails; capture?: ClothCapture;
  readOnly?: boolean; createdAt?: string; completed?: boolean; reviewed?: boolean; recommended?: boolean; onReview?: (checked: boolean) => void; onDeliver?: () => void;
  onDownload: () => void; downloadBusy?: boolean; feedback?: string; error?: string; headingRef?: Ref<HTMLHeadingElement> };
export default function RequestView({ supplier, order, details, capture, readOnly = false, createdAt, completed = false, reviewed = false, recommended = false, onReview, onDeliver, onDownload, downloadBusy, feedback, error, headingRef }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const editDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!editOpen || !editDialog.current) return;
    const dialog = editDialog.current;
    dialog.showModal();
    return () => dialog.close();
  }, [editOpen]);
  const price = estimate(supplier, order), quantity = totalQuantity(order);
  const garment = capture?.category?.label || pricingGarment(order.pricingGarment).label;
  const date = order.desiredDeliveryDate ? new Intl.DateTimeFormat("ko-KR", { timeZone:"Asia/Seoul", month:"long", day:"numeric", weekday:"short" }).format(new Date(`${order.desiredDeliveryDate}T12:00:00+09:00`)) : "미입력";
  const rows = [
    ...(completed ? [["제작 업체", supplier.name]] : []), ["단체 이름", order.group],
    ["의류 · 제작 방식", `${garment === "반팔" ? "반팔 티셔츠" : garment} · ${order.method === "DTF" ? "DTF 전사" : order.method}`],
    ["수량", `${quantity}벌 (${SIZES.filter(size => order.sizes[size] > 0).map(size => `${size} ${order.sizes[size]}`).join(" · ")})`],
    ["수령", `${details?.delivery === "pickup" ? "방문 수령" : "택배"} · ${date} 희망`], ["연락 이메일", order.contactEmail],
  ];
  const artwork = <div className="request-captures">{(["front", "back"] as const).map(side => <figure key={side}><div className="request-image">{capture ? <Image src={capture[side]} alt={`생성한 의류 ${side === "front" ? "앞면" : "뒷면"}`} width={1024} height={1024} unoptimized/> : <p>도안 준비 전</p>}</div><figcaption><span>{side === "front" ? "앞면" : "뒷면"}</span>{(completed || readOnly) && capture && <a href={capture[side]} download={`한땀-${side}.${capture[side].startsWith("data:image/png") ? "png" : "jpg"}`}><Asset name="a4513.svg"/><span className="request-desktop">이미지 </span>저장</a>}</figcaption></figure>)}</div>;
  const amount = <div className="request-price"><div><p>견적 금액 · {quantity}벌</p><small>1벌 {won(price.unit)}</small></div><strong>{won(price.total)}</strong></div>;
  const download = <button type="button" className="request-download" onClick={onDownload} disabled={downloadBusy}><Asset name="646e5.svg"/>{downloadBusy ? "파일 준비 중…" : "주문 정보 내려받기"}</button>;
  const deliver = <button type="button" className="request-primary" onClick={onDeliver} disabled={!reviewed || !capture}><Asset name="8b40a.svg"/>제작 요청서 전달하기</button>;
  return <main id="main-content" className={`request-page${completed ? " is-complete" : ""}${readOnly ? " is-detail" : ""}`} data-ui>
    <SupplierHeader accountMenu showSave={!readOnly}/>
    <div className={completed ? "request-receipt" : "request-content"}>
      {readOnly ? <header className="request-detail-heading"><Link href="/my?tab=orders"><Asset name="308e7.svg" className="request-desktop"/><Asset name="c304f.svg" className="request-mobile"/><h1>주문 상세</h1></Link><p>{createdAt && new Intl.DateTimeFormat("ko-KR", { timeZone:"Asia/Seoul", month:"long", day:"numeric" }).format(new Date(createdAt))} · 요청서 전달 내역</p></header> : completed ? <header className="request-complete-heading"><span><Asset name="e02d5.svg" className="request-desktop"/><Asset name="62b36.svg" className="request-mobile"/></span><h1 ref={headingRef} tabIndex={-1}>제작 요청서를 전달했어요</h1><p>주문과 요청서는 마이페이지에 보관돼요.</p></header> : <>
        <nav className="request-steps" aria-label="제작 단계"><ol className="request-desktop">{[["디자인","/design"],["주문서 확인","/quotes/new"],["업체 견적","/suppliers"]].map(([text, href]) => <li key={href}><Link href={href}><SupplierAsset name="912f3.svg"/>{text}</Link><SupplierAsset name="0ebe2.svg"/></li>)}<li aria-current="step"><strong>04 제작 진행</strong></li></ol><p className="request-mobile">4 / 4 <strong>· 제작 요청서</strong></p></nav>
        <header className="request-heading"><h1><span className="request-desktop">AI </span>제작 요청서를 확인해주세요</h1><p>업체에 보낼 도안과 주문 조건이에요.<span className="request-desktop"> 확인 후 요청을 보내면 업체가 제작을 시작해요.</span></p></header>
      </>}
      <div className="request-layout"><section className="request-artwork request-card" aria-label="제작 도안">{!completed && <div className="request-card-title"><h2>제작 도안</h2><p className="request-desktop">AI가 주문 내용으로 만든 앞·뒷면이에요</p></div>}<div id="supplier-generated-design" data-supplier-id={supplier.id}>{artwork}</div>{!completed && !readOnly && <p className="request-artwork-note">로고 위치와 크기를 확인해 주세요. 실제 인쇄 사양은 업체와 최종 확인이 필요해요.</p>}{!capture && <Link href="/design" className="request-link">디자인 화면에서 앞·뒷면 준비하기 →</Link>}</section>
      <div className="request-sidebar"><section className="request-sheet request-card">
        <div className="request-card-title">{readOnly && <div className="request-sheet-heading request-detail-mobile-heading"><Asset name="11319.svg"/><h2>{supplier.name} 제작 요청서</h2><span>전달 완료</span></div>}{completed ? <div className="request-sheet-heading"><Asset name="11319.svg"/><h2>{supplier.name} 제작 요청서</h2><span>전달 완료</span></div> : <><h2>제작 요청서</h2><p>{readOnly ? "업체에 전달한 내용이에요" : "업체에 이 내용으로 전달돼요"}</p></>}</div>
        {!completed && <section className="request-vendor"><div className="request-section-heading"><h3>제작 업체</h3>{!readOnly && <Link href="/suppliers">업체 다시 선택</Link>}</div><h4>{supplier.name}{recommended && <span>추천</span>}</h4><p>성북구 {supplier.region} · 제작 {supplier.leadDays}</p></section>}
        <div className="request-order">{!completed && <div className="request-section-heading"><h3>주문 내용</h3>{!readOnly && <button type="button" onClick={() => setEditOpen(true)}><Asset name="6dc1c.svg"/>주문 수정</button>}</div>}<dl>{readOnly && <div className="request-detail-vendor-row"><dt>제작 업체</dt><dd>{supplier.name}</dd></div>}{rows.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value || "미입력"}</dd></div>)}</dl></div>{amount}
        {!completed && !readOnly && <><label className="request-confirm"><input type="checkbox" checked={reviewed} disabled={!capture} onChange={event => onReview?.(event.target.checked)}/><span className="request-checkbox">{reviewed && <Asset name="bc434.svg"/>}</span><span>도안과 주문 정보를 모두 확인했어요</span></label><div className="request-desktop request-send">{deliver}<p>요청서는 마이페이지에 보관돼요. (시연용 · 실제 발송 없음)</p></div></>}
{readOnly && <button type="button" className="request-primary request-detail-download request-desktop" onClick={onDownload} disabled={downloadBusy}><Asset name="3e0cf.svg" className="request-desktop"/><Asset name="2930d.svg" className="request-mobile"/>{downloadBusy ? "파일 준비 중…" : "주문 정보 내려받기"}</button>}</section>{readOnly && <button type="button" className="request-primary request-detail-download request-mobile" onClick={onDownload} disabled={downloadBusy}><Asset name="3e0cf.svg" className="request-desktop"/><Asset name="2930d.svg" className="request-mobile"/>{downloadBusy ? "파일 준비 중…" : "주문 정보 내려받기"}</button>}{!completed && !readOnly && <>{download}<p className="request-mobile request-demo">요청서는 마이페이지에 보관돼요. (시연용 · 실제 발송 없음)</p></>}</div></div>
      {completed && <><div className="request-notice"><Asset name="b782c.svg"/><p>탭을 닫으면 사라지니 중요한 자료는 내려받아 주세요. 시연용이라 실제 업체 발송·결제는 없어요.</p></div><div className="request-receipt-actions"><button type="button" className="request-primary" onClick={onDownload} disabled={downloadBusy}><Asset name="2930d.svg"/>{downloadBusy ? "파일 준비 중…" : "주문 정보 내려받기"}</button><Link href="/my?tab=orders" className="request-secondary">마이페이지에서 주문 보기 <Asset name="d1b55.svg"/></Link></div></>}
      {error && <p className="request-feedback error" role="alert">{error}</p>}{feedback && <p className="request-feedback" role="status">{feedback}</p>}
    </div>{!completed && !readOnly && <div className="request-mobile request-bottom-bar">{deliver}</div>}
    {editOpen && <dialog ref={editDialog} className="request-edit-dialog" aria-labelledby="request-edit-title" onCancel={() => setEditOpen(false)}><h2 id="request-edit-title">주문 조건을 변경하면 견적을 다시 요청해야 할 수 있어요</h2><div><button onClick={() => setEditOpen(false)}>취소</button><Link href="/quotes/new" className="request-primary">수정하기</Link></div></dialog>}
  </main>;
}
