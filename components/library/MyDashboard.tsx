"use client";

import Link from "next/link";
import SupplierHeader from "@/components/supplier/SupplierHeader";
import Asset from "@/components/layout/WorkspaceAsset";


import { useState } from "react";
import { ArrowRight, LoaderCircle, Trash2, Undo2 } from "lucide-react";
import { initializeLibrary, updateLibraryItem, useLibrary } from "@/lib/library";
import { useQuoteHistoryState, refreshQuotes, setQuoteTrashed } from "@/lib/quote-history";
import { useDesignSession } from "@/lib/design-session";
import { getSupplier } from "@/lib/suppliers";
import { garmentName } from "@/lib/design";
import LibraryThumbnail from "./LibraryThumbnail";
import OrderList from "@/components/quote/OrderList";
import UsageGuide from "./UsageGuide";
import { resetOrderDetails, useDemoOrders } from "@/lib/order-workflow-client";

const date = (value: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" }).format(new Date(value));
export type DashboardTab = "design" | "orders" | "guide" | "waiting" | "trash";
type Target = { id: string; kind: "design" | "quote"; title: string };
export default function MyDashboard({ initialTab = "design" }: { initialTab?: DashboardTab }) {
  const { orders } = useDemoOrders();
  const tab = initialTab;
  const { items, status, error } = useLibrary();
  const { records, loading: quotesLoading, error: quotesError } = useQuoteHistoryState();
  const { loadDesign, resetSession } = useDesignSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [undo, setUndo] = useState<Target | null>(null);
  const designs = items.filter(item => item.kind === "design" && !item.trashedAt);
  const requests = records.filter(record => !record.trashedAt);
  const deletedDesigns = items.filter(item => item.kind === "design" && item.trashedAt);
  const deletedQuotes = records.filter(record => record.trashedAt);
  const deletedCount = deletedDesigns.length + deletedQuotes.length;
  async function changeTrash(target:Target, trashed:boolean) {
    if (busy) return;
    setBusy(target.id);setActionError("");setMessage("");
    try {
      if(target.kind==="design")await updateLibraryItem(target.id,{trashedAt:trashed?new Date().toISOString():null});
      else await setQuoteTrashed(target.id,trashed);
      setMessage(trashed?`‘${target.title}’을 휴지통으로 옮겼어요.`:`‘${target.title}’을 복원했어요.`);
      setUndo(trashed?target:null);
    } catch(cause){setActionError(cause instanceof Error?cause.message:"항목을 변경하지 못했어요. 다시 시도해주세요.");}
    finally{setBusy(null);}
  }
  function trashButton(target:Target){return <button className="library-delete" aria-label={`${target.title} 삭제`} disabled={!!busy} onClick={()=>void changeTrash(target,true)}>{busy===target.id?<LoaderCircle size={15} className="animate-spin"/>:<Trash2 size={15}/>}삭제</button>;}
  return <main id="main-content" className="account-page" data-ui><SupplierHeader accountMenu/><div className="account-content my-dashboard simple-library">
    <div className="my-heading"><div><h1>마이페이지</h1><p>디자인과 주문, 이용 안내를 한곳에서 확인하세요.</p></div><Link href="/design" onClick={() => { resetSession(); resetOrderDetails(); }} className="outline"><Asset name="3093c.svg" className="account-desktop"/><Asset name="24f20.svg" className="account-mobile"/>새 디자인</Link></div>
    <section className="account-storage" aria-label="자료 보관 안내"><Asset name="7262f.svg" className="account-desktop"/><Asset name="8f128.svg" className="account-mobile"/><div><strong>탭을 닫으면 임시 자료가 사라져요</strong><p>작성 중인 디자인·주문·도안은 미리 저장하거나 내려받아 주세요.<span className="account-desktop"> ‘저장’한 디자인은 같은 브라우저에 남아요.</span></p><details><summary>자료 보관 안내 자세히 보기 <Asset name="d25e5.svg"/></summary><p>저장한 디자인은 이 브라우저의 보관함에 남아요. 주문과 요청서는 현재 탭에 보관되므로 탭을 닫기 전에 PDF와 앞·뒷면 이미지를 내려받아 주세요.</p></details></div></section>
    <div className="account-tabs-row"><nav className="my-primary-tabs" aria-label="마이페이지 항목"><Link href="/my?tab=design" aria-current={tab === "design" ? "page" : undefined}>디자인 <span>{designs.length}</span></Link><Link href="/my?tab=orders" aria-current={tab === "orders" || tab === "waiting" ? "page" : undefined}>주문 <span>{orders.length + requests.filter(record => !orders.some(order => order.id === record.sourceOrderId)).length}</span></Link><Link href="/my?tab=guide" aria-current={tab === "guide" ? "page" : undefined}>이용 방법</Link></nav>
    <div className="my-secondary-actions"><Link href="/my?tab=trash" aria-current={tab === "trash" ? "page" : undefined}><Asset name="d5d2c.svg"/>휴지통 {deletedCount > 0 && <span>{deletedCount}</span>}</Link></div>
    </div>{actionError&&<p className="error" role="alert">{actionError}</p>}
    {message&&<div className="library-action-feedback" role="status"><span>{message}</span>{undo&&<button className="text-link" disabled={!!busy} onClick={()=>void changeTrash(undo,false)}><Undo2 size={14}/>실행 취소</button>}</div>}
    {tab === "guide" ? <UsageGuide /> : tab === "design" ? <section aria-label="저장한 디자인">
      {error && <p className="error" role="alert">{error}<button className="text-link" onClick={() => initializeLibrary()}>다시 불러오기</button></p>}
      {status === "loading" ? <div className="empty-state"><LoaderCircle className="animate-spin" size={24} /><p>디자인을 불러오고 있어요.</p></div> : <div className="library-grid">{designs.map(item => <article key={item.id} className="library-card panel"><Link href="/design" onClick={() => { loadDesign(item); resetOrderDetails(); }} aria-label={`${item.title} 이어 만들기`}><LibraryThumbnail item={item} /></Link><div className="library-card-body"><div className="library-card-title"><h2>{item.title}</h2>{trashButton({id:item.id,kind:"design",title:item.title})}</div><p>{garmentName(item.design)} · {date(item.createdAt)}</p><Link href="/design" onClick={() => { loadDesign(item); resetOrderDetails(); }} className="outline wide">이어서 만들기 <ArrowRight size={16} /></Link></div></article>)}{!designs.length && status !== "error" && <div className="empty-state"><span className="account-empty-icon"><Asset name="cdaee.svg" className="account-desktop"/><Asset name="d790e.svg" className="account-mobile"/></span><h2>저장한 디자인이 없어요.</h2><p>마음에 드는 결과에서 ‘디자인 저장’을 눌러주세요.</p><Link href="/design" className="primary">디자인 만들기 <Asset name="f3484.svg"/></Link></div>}</div>}
    </section> : tab === "orders" || tab === "waiting" ? <><OrderList requests={records} requestsLoading={quotesLoading} requestsError={quotesError} busyId={busy} onTrash={request => void changeTrash({id:request.id,kind:"quote",title:`${getSupplier(request.supplierId)?.name || "제작 업체"} · ${request.order.group || "견적 요청서"}`},true)}/>{quotesError && <button className="text-link" onClick={() => void refreshQuotes()}>요청서 다시 불러오기</button>}</> : <section aria-label="휴지통"><p className="library-footnote">삭제한 항목은 여기에 보관돼요. 복원하면 원래 목록으로 돌아갑니다.</p>{(error||quotesError)&&<p className="error" role="alert">{error||quotesError}<button className="text-link" onClick={()=>{void initializeLibrary();void refreshQuotes();}}>다시 불러오기</button></p>}{status==="loading"||quotesLoading?<p role="status">삭제한 항목을 불러오고 있어요.</p>:<div className="request-list">{[...deletedDesigns.map(item=>({id:item.id,kind:"design" as const,title:item.title,label:"디자인"})),...deletedQuotes.map(record=>({id:record.id,kind:"quote" as const,title:record.order.group||"견적 요청서",label:getSupplier(record.supplierId)?.name||"견적 요청서"}))].map(target=><article key={`${target.kind}-${target.id}`} className="panel request-card library-trash-card"><div><h2>{target.title}</h2><p>{target.label}</p></div><button className="outline" aria-label={`${target.title} 복원`} disabled={!!busy} onClick={()=>void changeTrash(target,false)}>{busy===target.id?<LoaderCircle size={15} className="animate-spin"/>:<Undo2 size={15}/>}복원</button></article>)}{!deletedCount&&!error&&!quotesError&&<div className="empty-state"><Trash2 size={30}/><h2>휴지통이 비어 있어요.</h2><p>삭제한 디자인과 요청서가 여기에 표시돼요.</p></div>}</div>}</section>}
  </div></main>;
}
