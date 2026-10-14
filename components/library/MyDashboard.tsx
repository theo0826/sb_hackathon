"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowRight, Clock3, FolderOpen, LoaderCircle, Plus } from "lucide-react";
import { initializeLibrary, useLibrary } from "@/lib/library";
import { useQuoteHistory } from "@/lib/quote-history";
import { useDesignSession } from "@/lib/design-session";
import { getSupplier } from "@/lib/suppliers";
import { garmentName } from "@/lib/design";
import LibraryThumbnail from "./LibraryThumbnail";

const subscribe = () => () => {};
const date = (value: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" }).format(new Date(value));
export default function MyDashboard() {
  const { items, status, error } = useLibrary();
  const requests = useQuoteHistory();
  const { loadDesign, resetSession } = useDesignSession();
  const initialTab = useSyncExternalStore(subscribe, () => new URLSearchParams(window.location.search).get("tab") === "waiting" ? "waiting" : "design", () => "design");
  const [selectedTab, setTab] = useState<"design" | "waiting" | null>(null);
  const tab = selectedTab || initialTab;
  const designs = items.filter(item => item.kind === "design" && !item.trashedAt);
  return <main id="main-content" className="shell my-dashboard simple-library">
    <div className="my-heading"><div><h1>마이페이지</h1><p>저장한 디자인과 견적을 기다리는 도안을 확인하세요.</p></div><Link href="/design" onClick={resetSession} className="outline"><Plus size={16} />새 디자인</Link></div>
    <div className="library-tabs" role="group" aria-label="마이페이지 보기"><button aria-pressed={tab === "design"} className={tab === "design" ? "active" : ""} onClick={() => setTab("design")}>저장한 디자인 <span>{designs.length}</span></button><button aria-pressed={tab === "waiting"} className={tab === "waiting" ? "active" : ""} onClick={() => setTab("waiting")}>견적 대기 <span>{requests.length}</span></button></div>
    {tab === "design" ? <section aria-label="저장한 디자인">
      {error && <p className="error" role="alert">{error}<button className="text-link" onClick={() => initializeLibrary()}>다시 불러오기</button></p>}
      {status === "loading" ? <div className="empty-state"><LoaderCircle className="animate-spin" size={24} /><p>디자인을 불러오고 있어요.</p></div> : <div className="library-grid">{designs.map(item => <article key={item.id} className="library-card panel"><Link href="/design" onClick={() => loadDesign(item)} aria-label={`${item.title} 이어 만들기`}><LibraryThumbnail item={item} /></Link><div className="library-card-body"><h2>{item.title}</h2><p>{garmentName(item.design)} · {date(item.createdAt)}</p><Link href="/design" onClick={() => loadDesign(item)} className="outline wide">이어서 만들기 <ArrowRight size={16} /></Link></div></article>)}{!designs.length && status !== "error" && <div className="empty-state"><FolderOpen size={32} /><h2>저장한 디자인이 없어요.</h2><p>마음에 드는 결과에서 ‘디자인 저장’을 눌러주세요.</p><Link href="/design" className="primary">디자인 만들기 <ArrowRight size={16} /></Link></div>}</div>}
    </section> : <section aria-label="견적 대기 도안"><p className="library-footnote">체험용 대기 내역이에요. 실제 업체 전송이나 견적 회신은 이루어지지 않아요.</p><div className="request-list">{requests.map(record => <article key={record.id} className="panel request-card"><div className="request-card-title"><h2>{getSupplier(record.supplierId)?.name}</h2><span className="request-status"><Clock3 size={15} />견적 대기 · 체험</span></div><p>{record.order.group} · {record.quantity}벌 · {record.design.text || record.filename}</p><div className="request-card-bottom"><span>{date(record.createdAt)}</span><Link href={`/quotes/${record.id}`} className="outline">전달 도안 보기 <ArrowRight size={16} /></Link></div></article>)}{!requests.length && <div className="empty-state"><Clock3 size={32} /><h2>대기 중인 도안이 없어요.</h2><p>디자인을 만들고 업체 맞춤 도안을 전달해보세요.</p><Link href="/design" className="primary">디자인 만들기 <ArrowRight size={16} /></Link></div>}</div></section>}
    <p className="library-footnote">저장한 내용은 현재 브라우저에서 다시 볼 수 있어요.</p>
  </main>;
}
