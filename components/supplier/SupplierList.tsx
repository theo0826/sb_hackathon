"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Info, Search } from "lucide-react";
import { SUPPLIERS, getSupplier } from "@/lib/suppliers";
import { useDesignSession } from "@/lib/design-session";
import { COLORS, garmentName } from "@/lib/design";
import Artwork from "@/components/design/Artwork";
import Image from "next/image";
import FlowSteps from "@/components/layout/FlowSteps";
import SupplierCard from "./SupplierCard";

export default function SupplierList() {
  const { design, filename, supplierId, selectSupplier, hasResult } = useDesignSession();
  const [region, setRegion] = useState("all");
  const [method, setMethod] = useState("all");
  const [format, setFormat] = useState("all");
  const [smallOnly, setSmallOnly] = useState(false);
  const suppliers = SUPPLIERS.filter((supplier) => (region === "all" || region === supplier.region) && (method === "all" || supplier.methods.includes(method)) && (format === "all" || format === supplier.format) && (!smallOnly || supplier.minOrder <= 10));
  const selected = getSupplier(supplierId);

  return <main id="main-content" className="shell studio-main"><div className="intro"><div><h1>제작할 업체를 골라주세요.</h1><p>업체를 고르면 PDF·이메일 도안은 해당 업체 양식으로 자동 준비돼요.</p></div><FlowSteps current={2} /></div>
    {!(hasResult || design.image) ? <section className="panel empty-state"><Info size={26} /><h2>먼저 우리 디자인을 만들어주세요.</h2><p>완성한 디자인으로 업체를 비교하고 맞춤 도안을 준비해요.</p><Link href="/design" className="primary">디자인 만들기</Link></section> : <>
    <div className="supplier-summary"><div className="summary-art" style={{ backgroundColor: design.color }}>{design.image ? <Image src={design.image} width={80} height={80} alt="선택 도안" unoptimized /> : <Artwork design={design} />}</div><div><strong>{design.image ? filename : design.text}</strong><p>{COLORS.find((color) => color.hex === design.color)?.name} {garmentName(design)} · {design.side === "front" ? "앞면" : "뒷면"} · {design.scale}%</p></div><Link href="/design" className="outline">디자인 수정</Link></div>
    <div className="demo-notice"><Info size={17} /><span>모든 업체는 화면 검증용 가상 데이터예요. 실제 연락·견적 전송은 하지 않아요.</span></div>
    <details className="flow-disclosure"><summary>조건으로 업체 찾기</summary><div className="filter-row"><label>지역<select id="region-filter" value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">성북구 전체</option>{SUPPLIERS.map((supplier) => <option key={supplier.region}>{supplier.region}</option>)}</select></label><label>제작 방식<select id="method-filter" value={method} onChange={(event) => setMethod(event.target.value)}><option value="all">모든 제작 방식</option>{["DTF", "실크스크린", "자수"].map((item) => <option key={item}>{item}</option>)}</select></label><label>제출 양식<select id="format-filter" value={format} onChange={(event) => setFormat(event.target.value)}><option value="all">모든 양식</option><option value="pdf">PDF 도안서</option><option value="email">이메일 양식</option></select></label><button className={`chip ${smallOnly ? "active" : ""}`} aria-pressed={smallOnly} onClick={() => setSmallOnly(!smallOnly)}>소량 주문 가능</button><span className="result-count" aria-live="polite">{suppliers.length}개 업체</span></div></details>
    <div className="supplier-grid">{suppliers.map((supplier) => <SupplierCard key={supplier.id} supplier={supplier} selected={supplierId === supplier.id} onSelect={() => selectSupplier(supplier.id)} />)}{!suppliers.length && <div className="panel empty-state"><Search size={25} /><h2>조건에 맞는 예시 업체가 없어요.</h2><p>필터를 바꿔서 다시 확인해보세요.</p><button className="outline" onClick={() => { setRegion("all"); setMethod("all"); setFormat("all"); setSmallOnly(false); }}>필터 초기화</button></div>}</div>
    <div className="bottom-action flow-next"><div><strong>{selected ? `${selected.name}를 선택했어요.` : "우리 디자인에 맞는 업체를 선택해주세요."}</strong><p>{selected ? `${selected.format === "pdf" ? "PDF 도안서" : "이메일 제목·본문"}으로 도안과 주문 조건을 준비해요.` : "업체마다 필요한 제작자료와 최소 수량이 달라요."}</p></div><div className="actions"><Link href="/design" className="outline"><ArrowLeft size={15} />디자인으로</Link>{selected ? <Link id="supplier-next" href="/quotes/new" className="primary">맞춤 도안 생성하기 <ArrowRight size={15} /></Link> : <button className="primary" disabled>업체를 먼저 선택해주세요</button>}</div></div>
    </>}
  </main>;
}
