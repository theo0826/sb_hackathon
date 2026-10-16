"use client";
import { detailHref, STATIC_SITE } from "@/lib/deployment";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Clock3, FolderOpen, LoaderCircle, Plus, Trash2, Undo2 } from "lucide-react";
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
  return <main id="main-content" className="shell my-dashboard simple-library">
    <div className="my-heading"><div><h1>마이페이지</h1><p>디자인과 주문, 이용 안내를 한곳에서 확인하세요.</p></div><Link href="/design" onClick={() => { resetSession(); resetOrderDetails(); }} className="outline"><Plus size={16} />새 디자인</Link></div>
    <nav className="my-primary-tabs" aria-label="마이페이지 항목"><Link href="/my?tab=design" aria-current={tab === "design" ? "page" : undefined}>디자인 <span>{designs.length}</span></Link><Link href="/my?tab=orders" aria-current={tab === "orders" || tab === "waiting" ? "page" : undefined}>주문 <span>{orders.length + requests.length}</span></Link><Link href="/my?tab=guide" aria-current={tab === "guide" ? "page" : undefined}>이용 방법</Link></nav>
    <div className="my-secondary-actions"><Link href="/my?tab=trash" aria-current={tab === "trash" ? "page" : undefined}><Trash2 size={14}/>휴지통 {deletedCount > 0 && <span>{deletedCount}</span>}</Link></div>
    {actionError&&<p className="error" role="alert">{actionError}</p>}
    {message&&<div className="library-action-feedback" role="status"><span>{message}</span>{undo&&<button className="text-link" disabled={!!busy} onClick={()=>void changeTrash(undo,false)}><Undo2 size={14}/>실행 취소</button>}</div>}
    {tab === "guide" ? <UsageGuide /> : tab === "design" ? <section aria-label="저장한 디자인">
      {error && <p className="error" role="alert">{error}<button className="text-link" onClick={() => initializeLibrary()}>다시 불러오기</button></p>}
      {status === "loading" ? <div className="empty-state"><LoaderCircle className="animate-spin" size={24} /><p>디자인을 불러오고 있어요.</p></div> : <div className="library-grid">{designs.map(item => <article key={item.id} className="library-card panel"><Link href="/design" onClick={() => { loadDesign(item); resetOrderDetails(); }} aria-label={`${item.title} 이어 만들기`}><LibraryThumbnail item={item} /></Link><div className="library-card-body"><div className="library-card-title"><h2>{item.title}</h2>{trashButton({id:item.id,kind:"design",title:item.title})}</div><p>{garmentName(item.design)} · {date(item.createdAt)}</p><Link href="/design" onClick={() => { loadDesign(item); resetOrderDetails(); }} className="outline wide">이어서 만들기 <ArrowRight size={16} /></Link></div></article>)}{!designs.length && status !== "error" && <div className="empty-state"><FolderOpen size={32} /><h2>저장한 디자인이 없어요.</h2><p>마음에 드는 결과에서 ‘디자인 저장’을 눌러주세요.</p><Link href="/design" className="primary">디자인 만들기 <ArrowRight size={16} /></Link></div>}</div>}
    </section> : tab === "orders" || tab === "waiting" ? <>{tab === "orders" && <OrderList />}<section className="my-quote-history" aria-label="견적 요청서 도안"><div className="my-section-heading"><h2>견적 요청서 · 제작자료</h2><p>업체별로 준비해 둔 자료를 확인하세요.</p></div><p className="library-footnote">업체별 견적 요청서 초안이에요. 발송과 최종 금액 확인은 별도예요.</p>{quotesError && <p className="error" role="alert">{quotesError}<button className="text-link" onClick={() => void refreshQuotes()}>다시 불러오기</button></p>}{quotesLoading && <p role="status">요청서를 불러오고 있어요.</p>}<div className="request-list">{requests.map(record => <article key={record.id} className="panel request-card"><div className="request-card-title"><h2>{getSupplier(record.supplierId)?.name}</h2><span className="request-status"><Clock3 size={15} />{record.document?.production?.converter === "sample" ? "목업 변환" : record.mode === "live" ? "발송 전 초안" : "이전 체험 내역"}</span></div><p>{record.order.group} · {record.quantity}벌 · {record.design.text || record.filename}</p><div className="request-card-bottom"><span>{date(record.createdAt)}</span><div className="library-card-actions">{trashButton({id:record.id,kind:"quote",title:record.order.group||getSupplier(record.supplierId)?.name||"견적 요청서"})}<Link href={detailHref("quotes", record.id)} className="outline">요청서 보기 <ArrowRight size={16} /></Link></div></div></article>)}{!quotesLoading && !quotesError && !requests.length && <div className="empty-state"><Clock3 size={32} /><h2>보관한 요청서가 없어요.</h2><p>디자인을 만들고 업체에 맞는 견적 요청서를 준비해보세요.</p><Link href="/design" className="primary">디자인 만들기 <ArrowRight size={16} /></Link></div>}</div></section></> : <section aria-label="휴지통"><p className="library-footnote">삭제한 항목은 여기에 보관돼요. 복원하면 원래 목록으로 돌아갑니다.</p>{(error||quotesError)&&<p className="error" role="alert">{error||quotesError}<button className="text-link" onClick={()=>{void initializeLibrary();void refreshQuotes();}}>다시 불러오기</button></p>}{status==="loading"||quotesLoading?<p role="status">삭제한 항목을 불러오고 있어요.</p>:<div className="request-list">{[...deletedDesigns.map(item=>({id:item.id,kind:"design" as const,title:item.title,label:"디자인"})),...deletedQuotes.map(record=>({id:record.id,kind:"quote" as const,title:record.order.group||"견적 요청서",label:getSupplier(record.supplierId)?.name||"견적 요청서"}))].map(target=><article key={`${target.kind}-${target.id}`} className="panel request-card library-trash-card"><div><h2>{target.title}</h2><p>{target.label}</p></div><button className="outline" aria-label={`${target.title} 복원`} disabled={!!busy} onClick={()=>void changeTrash(target,false)}>{busy===target.id?<LoaderCircle size={15} className="animate-spin"/>:<Undo2 size={15}/>}복원</button></article>)}{!deletedCount&&!error&&!quotesError&&<div className="empty-state"><Trash2 size={30}/><h2>휴지통이 비어 있어요.</h2><p>삭제한 디자인과 요청서가 여기에 표시돼요.</p></div>}</div>}</section>}
    <p className="library-footnote">{STATIC_SITE ? "디자인과 제작자료는 이 기기의 브라우저에 보관됩니다. 시연 주문과 요청서는 현재 탭을 닫으면 사라져요." : "저장한 디자인과 제작자료는 현재 브라우저의 세션으로 다시 볼 수 있어요. 시연 주문은 작성한 탭에 보관됩니다."}</p>
  </main>;
}
