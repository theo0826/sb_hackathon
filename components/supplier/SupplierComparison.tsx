"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDesignSession } from "@/lib/design-session";
import { useOrderDetails } from "@/lib/order-workflow-client";
import { won } from "@/lib/order-workflow";
import { SIZES, totalQuantity } from "@/lib/quote";
import { pricingGarment } from "@/lib/garment-pricing";
import { useClothData } from "@/components/ClothSim/clothdata/store";
import { readyClothCapture } from "@/lib/cloth-capture";
import { bidRequestKey, demoOffers, productionOrder, recommendedOffer, sortedOffers, type BidSort, type SupplierOffer } from "@/lib/supplier-bids";
import { useSupplierBids } from "@/lib/supplier-bids-client";
import SupplierHeader from "./SupplierHeader";
import SupplierAsset from "./SupplierAsset";

const methodLabel = (method: string) => method === "DTF" ? "DTF 전사" : method;
function SupplierSteps() {
  return <nav className="supplier-steps" aria-label="제작 단계"><ol className="supplier-desktop"><li><Link href="/design"><SupplierAsset name="912f3.svg" />디자인</Link></li><li><SupplierAsset name="0ebe2.svg" /></li><li><Link href="/quotes/new"><SupplierAsset name="912f3.svg" />주문서 확인</Link></li><li><SupplierAsset name="0ebe2.svg" /></li><li aria-current="step"><strong>03 업체 견적</strong></li><li><SupplierAsset name="0ebe2.svg" /></li><li>04 제작 진행</li></ol><p className="supplier-mobile">3 / 4 <strong>· 업체 견적</strong></p></nav>;
}
function BidCard({ offer, arrived, comparing, selected, recommended, onSelect }: { offer: SupplierOffer; arrived: boolean; comparing: boolean; selected: boolean; recommended: boolean; onSelect: () => void }) {
  const { supplier, price } = offer;
  return <label className="supplier-bid" data-arrived={arrived} data-comparing={comparing} data-selected={selected}>
    {comparing && arrived ? <><input type="radio" name="supplier-offer" value={supplier.id} checked={selected} onChange={onSelect} aria-label={`${supplier.name} 선택`} /><span className="supplier-radio">{selected ? <SupplierAsset name="fcf03.svg" /> : <span />}</span></> : <span className={`supplier-arrival-icon ${arrived ? "is-arrived" : "is-waiting"}`}><SupplierAsset name={arrived ? "efaf9.svg" : "35511.svg"} className="supplier-desktop" /><SupplierAsset name={arrived ? "6f425.svg" : "1a599.svg"} className="supplier-mobile" /></span>}
    <span className="supplier-bid-content"><span className="supplier-bid-name"><strong>{supplier.name}</strong>{comparing && arrived && recommended && <span className="supplier-recommendation">추천</span>}</span><span className="supplier-bid-meta supplier-desktop">성북구 {supplier.region}{arrived && (comparing ? ` · 제작 ${supplier.leadDays} · 최소 ${supplier.minOrder}벌` : " · 방금 도착")}</span>{arrived && <span className="supplier-bid-meta supplier-mobile">제작 {supplier.leadDays}</span>}</span>
    <span className="supplier-bid-price">{arrived ? <><strong>{won(price.total)}</strong><small>1벌 {won(price.unit)}</small></> : <><span className="supplier-price-skeleton supplier-desktop" /><small>견적 작성 중</small></>}</span>
  </label>;
}

export default function SupplierComparison() {
  const router = useRouter();
  const { design, order, setOrder, selectSupplier, hasResult } = useDesignSession();
  const { details } = useOrderDetails();
  const cloth = useClothData();
  const preparedOrder = useMemo(() => productionOrder(design, order), [design, order]);
  const offers = useMemo(() => demoOffers(preparedOrder), [preparedOrder]);
  const artworkReady = (hasResult || !!design.image) && readyClothCapture(cloth);
  const valid = artworkReady && details.confirmed;
  const key = useMemo(() => bidRequestKey(design, preparedOrder, details, cloth), [design, preparedOrder, details, cloth]);
  const { request, update, arrivedCount } = useSupplierBids(key, offers.length, valid);
  const comparing = request?.comparing === true;
  const arrived = offers.slice(0, arrivedCount);
  const pending = offers.slice(arrivedCount);
  const recommended = recommendedOffer(arrived);
  const selected = arrived.find(offer => offer.supplier.id === request?.selectedId);
  const display = comparing ? [...sortedOffers(arrived, request?.sort || "recommended"), ...pending] : offers;
  const arrivedIds = new Set(arrived.map(offer => offer.supplier.id));
  const [editOpen, setEditOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const editTrigger = useRef<HTMLElement | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const quantity = totalQuantity(order);
  const garment = cloth.category?.label || pricingGarment(order.pricingGarment).label;
  const orderShort = `${garment} ${quantity}벌 · ${methodLabel(order.method)}`;
  useEffect(() => {
    if (!editOpen || !dialog.current) return;
    const element = dialog.current; element.showModal();
    return () => { element.close(); editTrigger.current?.focus(); };
  }, [editOpen]);
  function editOrder(trigger: HTMLElement) { editTrigger.current = trigger; setEditOpen(true); }
  function compare() {
    if (!arrived.length) return;
    update({ comparing: true, selectedId: recommended?.supplier.id || null });
    requestAnimationFrame(() => title.current?.focus());
  }
  function next() {
    if (!valid || !selected) return;
    setOrder(preparedOrder); selectSupplier(selected.supplier.id); router.push("/quotes/prepare");
  }
  const pageTitle = comparing ? `업체 ${arrivedCount}곳이 견적을 보냈어요` : `업체 ${offers.length}곳에 견적을 요청했어요`;
  const deliveryDate = new Date(`${order.desiredDeliveryDate}T12:00:00+09:00`);
  const date = Number.isFinite(deliveryDate.getTime()) && deliveryDate.toISOString().slice(0, 10) === order.desiredDeliveryDate
    ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" }).format(deliveryDate) : "";
  const mobileAction = comparing ? "AI 제작 요청서 확인하기" : `견적 ${arrivedCount}건 비교하기`;

  return <main id="main-content" className="wf-page supplier-page" data-ui data-state={comparing ? "comparing" : "receiving"}>
    <SupplierHeader />
    <div className="supplier-content"><SupplierSteps />{!valid ? <section className="supplier-empty"><h1>주문서를 먼저 확인해주세요.</h1><p>{artworkReady ? "주문서에서 업체별 견적 받기를 눌러주세요." : "디자인 화면에서 앞·뒷면 이미지를 준비해주세요."}</p><Link href={artworkReady ? "/quotes/new" : "/design"} className="supplier-primary">이전 단계로 →</Link></section> : <>
      <header className="supplier-title"><h1 ref={title} tabIndex={-1}>{pageTitle}</h1><p className="supplier-desktop">{comparing ? "시연용 업체 견적을 비교하고 제작 업체를 선택할 수 있어요." : "업체가 주문을 확인하고 견적을 보내고 있어요. 도착한 견적부터 바로 비교할 수 있어요."}</p><div className="supplier-mobile supplier-mobile-order"><span>{orderShort}</span><button type="button" onClick={event => editOrder(event.currentTarget)}>주문 수정</button></div></header>
      <div className="supplier-grid"><section className="supplier-list-column" aria-label="업체 견적 목록">
        <div className="supplier-toolbar">{comparing ? <><p><strong>견적 {arrivedCount}건</strong><span className="supplier-desktop"> · {orderShort}</span></p><label className="supplier-sort"><span className="sr-only">견적 정렬</span><select value={request?.sort || "recommended"} onChange={event => update({ sort: event.target.value as BidSort })}><option value="recommended">추천순</option><option value="price">낮은 가격</option><option value="delivery">빠른 납기</option></select><SupplierAsset name="9c237.svg" /></label></> : <div className="supplier-progress-panel"><div><p aria-live="polite" aria-atomic="true"><strong>견적 도착 {arrivedCount} / {offers.length}</strong><span className="supplier-desktop"> · {offers.length - arrivedCount}곳 작성 중</span></p><span className="supplier-mobile">{offers.length - arrivedCount}곳 작성 중</span></div><div className="supplier-progress" role="progressbar" aria-label="견적 도착" aria-valuemin={0} aria-valuemax={offers.length} aria-valuenow={arrivedCount}>{offers.map((offer, index) => <span key={offer.supplier.id} data-complete={index < arrivedCount} />)}</div></div>}</div>
        <div className="supplier-bids" role={comparing ? "radiogroup" : undefined} aria-label={comparing ? "제작 업체 선택" : "업체별 견적 도착 상태"}>{display.map(offer => <BidCard key={offer.supplier.id} offer={offer} arrived={arrivedIds.has(offer.supplier.id)} comparing={comparing} selected={selected?.supplier.id === offer.supplier.id} recommended={recommended?.supplier.id === offer.supplier.id} onSelect={() => update({ selectedId: offer.supplier.id })} />)}</div>
        {comparing && <p className="supplier-fine-print">※ 업체가 제작 파일을 확인한 뒤 금액이 조정될 수 있어요.<span className="supplier-desktop"> 업체·가격은 시연용 예시예요.</span></p>}
      </section>
      <aside className="supplier-sidebar supplier-desktop"><section className="supplier-summary"><div className="supplier-summary-heading"><h2>내 주문</h2><button type="button" onClick={event => editOrder(event.currentTarget)}><SupplierAsset name="39bc0.svg" />주문서 수정</button></div><div className="supplier-summary-body"><span className="supplier-summary-shirt"><SupplierAsset name="7d1d6.svg" /></span><div><p>{garment === "반팔" ? "반팔 티셔츠" : garment} · {quantity}벌 · {methodLabel(order.method)}</p><p>{SIZES.filter(size => order.sizes[size] > 0).map(size => `${size} ${order.sizes[size]}`).join(" · ")}</p><p>{details.delivery === "pickup" ? "방문 수령" : "택배 배송"} · {date ? `${date} 수령 희망` : "희망 수령일 미입력"}</p></div></div></section>
        <section className="supplier-decision"><div className="supplier-decision-name"><p>{comparing ? "선택한 업체" : "도착한 견적"}</p><h2 aria-live="polite">{comparing ? selected?.supplier.name || "업체를 선택해주세요" : `${arrivedCount}건 / ${offers.length}건`}</h2></div><dl><div><dt>{comparing ? `견적 금액 · ${quantity}벌` : "현재 최저가"}</dt><dd aria-live="polite">{comparing ? selected ? won(selected.price.total) : "—" : recommended ? won(recommended.price.total) : "—"}</dd></div></dl><button type="button" className="supplier-primary" disabled={comparing ? !selected : !arrivedCount} onClick={comparing ? next : compare}>{comparing ? "AI 제작 요청서 확인하기" : `견적 ${arrivedCount}건 비교하기`} →</button></section>
      </aside></div>
      <div className="supplier-mobile supplier-bottom-bar"><button type="button" className="supplier-primary" disabled={comparing ? !selected : !arrivedCount} onClick={comparing ? next : compare}>{mobileAction} →</button></div>
    </>}</div>
    {editOpen && <dialog ref={dialog} className="supplier-edit-dialog" aria-labelledby="supplier-edit-title" onCancel={() => setEditOpen(false)}><h2 id="supplier-edit-title">주문 조건을 변경하면 견적을 다시 요청해야 할 수 있어요</h2><div><button type="button" onClick={() => setEditOpen(false)}>취소</button><button type="button" className="supplier-primary" onClick={() => { setEditOpen(false); router.push("/quotes/new"); }}>수정하기</button></div></dialog>}
  </main>;
}
