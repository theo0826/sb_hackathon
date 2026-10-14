"use client";

import { Check, FileText, Mail, MapPin, Store } from "lucide-react";
import type { Supplier } from "@/lib/suppliers";

export default function SupplierCard({ supplier, selected, onSelect }: { supplier: Supplier; selected: boolean; onSelect: () => void }) {
  return <article className={`supplier-card panel ${selected ? "selected" : ""}`} data-supplier={supplier.id}>
    <div className="supplier-top"><span className="shop-icon" style={{ color: supplier.accent, backgroundColor: `${supplier.accent}12` }}><Store size={25} /></span><div><h2>{supplier.name}</h2><p><MapPin size={12} />성북구 {supplier.region} · 가상 업체</p></div><span className={`format-badge ${supplier.format}`}>{supplier.format === "pdf" ? <FileText size={13} /> : <Mail size={13} />}{supplier.format === "pdf" ? "PDF 도안서" : "이메일 양식"}</span></div>
    <p className="supplier-description">{supplier.description}</p>
    <dl className="supplier-stats"><div><dt>최소 주문</dt><dd>{supplier.minOrder}벌부터</dd></div><div><dt>제작 방식</dt><dd>{supplier.methods.join(" · ")}</dd></div><div><dt>예시 제작 기간</dt><dd>{supplier.leadDays}</dd></div></dl>
    <div className="supplier-requirements"><strong>이 업체에 전달할 자료</strong><p>{supplier.attachmentTypes.join(" + ")}</p><p>예시 인쇄 영역: 최대 {supplier.maxPrintWidthCm} × {supplier.maxPrintHeightCm}cm</p></div>
    <div className="supplier-actions"><button className={selected ? "outline selected-button" : "outline"} onClick={onSelect} aria-pressed={selected}>{selected && <Check size={14} />}{selected ? "선택한 업체" : "이 업체 선택"}</button></div>
  </article>;
}
