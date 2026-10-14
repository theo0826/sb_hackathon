"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Info, LoaderCircle } from "lucide-react";
import { useDesignSession } from "@/lib/design-session";
import { getSupplier } from "@/lib/suppliers";
import { SIZES, isQuoteRecord, todayKST, totalQuantity, validateOrder, type OrderDraft } from "@/lib/quote";
import { saveQuote } from "@/lib/quote-history";
import FlowSteps from "@/components/layout/FlowSteps";
import ProductionDocument from "@/components/supplier/ProductionDocument";

export default function QuoteForm() {
  const router = useRouter();
  const { design, filename, supplierId, order, setOrder, hasResult } = useDesignSession();
  const supplier = getSupplier(supplierId);
  const [review, setReview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submissionActive = useRef(false);
  function update(patch: Partial<OrderDraft>) { setOrder((current) => ({ ...current, ...patch })); setError(""); }

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supplier) return;
    const fields = validateOrder(order, supplier); setErrors(fields);
    if (Object.keys(fields).length) { document.getElementById(Object.keys(fields)[0])?.focus(); return; }
    setError(""); setReview(true); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit() {
    if (!supplier || submissionActive.current) return;
    const fields = validateOrder(order, supplier);
    if (Object.keys(fields).length) { setErrors(fields); setReview(false); return; }
    submissionActive.current = true;
    let completed = false;
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId, design, filename, order }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) { if (result.fields) setErrors(result.fields); throw new Error(result.error || "견적 요청을 준비하지 못했어요."); }
      if (!isQuoteRecord(result.quote)) throw new Error("요청 결과를 확인할 수 없어요. 다시 시도해주세요.");
      try { saveQuote(result.quote); }
      catch { throw new Error("요청 내역을 이 브라우저에 저장하지 못했어요. 입력은 유지되어 있으니 저장 공간을 확인한 뒤 다시 시도해주세요."); }
      completed = true;
      router.push(`/quotes/${result.quote.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "연결을 확인하고 다시 시도해주세요."); }
    finally { if (!completed) { submissionActive.current = false; setSubmitting(false); } }
  }
  const fieldError = (name: string) => errors[name] ? <p id={`${name}-error`} className="field-error" role="alert">{errors[name]}</p> : null;

  return <main id="main-content" className="shell studio-main"><div className="intro"><div><h1>{review ? "업체 맞춤 도안을 확인해요." : "맞춤 도안을 준비해요."}</h1><p>{review ? "업체 양식, 도안과 주문 정보가 모두 맞으면 예시 견적 요청을 완료해요." : "입력 후 업체에 맞춘 PDF·이메일 도안을 확인하고 요청해요."}</p></div><FlowSteps current={3} /></div>
    {!(hasResult || design.image) ? <section className="panel empty-state"><Info size={28} /><h2>먼저 디자인을 만들어주세요.</h2><Link href="/design" className="primary">디자인 만들기</Link></section> : !supplier ? <section className="panel empty-state"><Info size={28} /><h2>견적을 요청할 업체를 먼저 선택해주세요.</h2><p>PDF 또는 이메일 양식을 선택한 업체 기준으로 준비해요.</p><Link href="/suppliers" className="primary">업체 선택하기</Link></section> : <>
      <div className="demo-notice"><Info size={17} /><span>체험용 견적 요청이에요. 실제 업체에 전송되지 않고, 완료 내역은 현재 브라우저에 저장돼요.</span></div>
      {review ? <><ProductionDocument supplier={supplier} design={design} order={order} filename={filename} /><div className="bottom-action flow-next"><div><strong>{supplier.name} · 총 {totalQuantity(order)}벌</strong><p>{supplier.format === "pdf" ? "PDF 도안서" : "이메일 제목·본문"}과 첨부 도안을 확인한 뒤 완료해주세요.</p></div><div className="actions"><button className="outline" onClick={() => setReview(false)} disabled={submitting}>주문 정보 수정</button><button id="submit-quote" className="primary" onClick={submit} disabled={submitting}>{submitting ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}{submitting ? "요청 내역 저장 중…" : "도안 전달하고 견적 대기"}</button></div></div></> : <div className="quote-layout"><form id="quote-form" className="panel quote-form" onSubmit={prepare} noValidate>
        <div className="panel-title"><h2>주문 정보</h2><span>* 필수 입력</span></div>
        <div className="field"><label className="field-label" htmlFor="group">단체 이름 *</label><input id="group" className="form-input" value={order.group} maxLength={50} placeholder="예: 고려대학교 캠퍼스 동아리" onChange={(event) => update({ group: event.target.value })} required aria-invalid={!!errors.group} aria-describedby={errors.group ? "group-error" : undefined} />{fieldError("group")}</div>
        <div className="field"><label className="field-label" htmlFor="contactEmail">연락 이메일 *</label><input id="contactEmail" className="form-input" type="email" value={order.contactEmail} maxLength={254} placeholder="team@example.com" onChange={(event) => update({ contactEmail: event.target.value })} required aria-invalid={!!errors.contactEmail} aria-describedby={errors.contactEmail ? "contactEmail-error" : undefined} />{fieldError("contactEmail")}</div>
        <fieldset className="field"><legend className="field-label">사이즈별 수량 *</legend><div className="size-grid" id="sizes" tabIndex={-1}>{SIZES.map((size) => <label key={size} htmlFor={`size-${size}`}>{size}<input id={`size-${size}`} type="number" min={0} max={999} step={1} value={order.sizes[size]} onChange={(event) => update({ sizes: { ...order.sizes, [size]: Math.max(0, Math.min(999, Math.trunc(Number(event.target.value)))) } })} aria-invalid={!!errors.sizes} /></label>)}</div><div className="quantity-total"><span>총 주문 수량 <small>최소 {supplier.minOrder}벌</small></span><strong>{totalQuantity(order)}벌</strong></div>{fieldError("sizes")}</fieldset>
        <div className="form-row"><div className="field"><label className="field-label" htmlFor="desiredDeliveryDate">희망 수령일 *</label><input id="desiredDeliveryDate" className="form-input" type="date" min={todayKST()} value={order.desiredDeliveryDate} onChange={(event) => update({ desiredDeliveryDate: event.target.value })} required aria-invalid={!!errors.desiredDeliveryDate} />{fieldError("desiredDeliveryDate")}</div><div className="field"><label className="field-label" htmlFor="method">제작 방식 *</label><select id="method" className="form-input" value={order.method} onChange={(event) => update({ method: event.target.value })}>{supplier.methods.map((method) => <option key={method}>{method}</option>)}</select>{fieldError("method")}</div></div>
        <details className="flow-disclosure" open={errors.printWidthCm || errors.printHeightCm ? true : undefined}><summary>인쇄 크기·추가 요청 수정</summary>
        <div className="form-row"><div className="field"><label className="field-label" htmlFor="printWidthCm">인쇄 가로 (cm) *</label><input id="printWidthCm" type="number" className="form-input" min={.1} max={supplier.maxPrintWidthCm} step={.1} value={order.printWidthCm} onChange={(event) => update({ printWidthCm: Number(event.target.value) })} required aria-invalid={!!errors.printWidthCm} />{fieldError("printWidthCm")}</div><div className="field"><label className="field-label" htmlFor="printHeightCm">인쇄 세로 (cm) *</label><input id="printHeightCm" type="number" className="form-input" min={.1} max={supplier.maxPrintHeightCm} step={.1} value={order.printHeightCm} onChange={(event) => update({ printHeightCm: Number(event.target.value) })} required aria-invalid={!!errors.printHeightCm} />{fieldError("printHeightCm")}</div></div>
        <div className="note-bar"><Info size={15} /><span>이 업체의 예시 인쇄 영역은 최대 {supplier.maxPrintWidthCm} × {supplier.maxPrintHeightCm}cm예요. 실제 배치와 크기는 업체 확인 후 확정해요.</span></div>
        <div className="field memo-field"><label className="field-label" htmlFor="memo">추가 요청 사항 <small>{order.memo.length} / 500</small></label><textarea id="memo" className="form-input" rows={4} maxLength={500} value={order.memo} placeholder="원단, 포장, 일정 등 전달할 내용을 적어주세요." onChange={(event) => update({ memo: event.target.value })} /></div>
        </details>
        <button className="primary wide" type="submit">업체 맞춤 도안 확인 <ArrowRight size={16} /></button>
      </form><aside className="panel quote-side"><h2>{supplier.name}</h2><span className={`format-badge ${supplier.format}`}>{supplier.format === "pdf" ? "PDF 도안서 제출" : "이메일 양식 제출"}</span><dl className="design-summary"><div><dt>디자인</dt><dd>{design.image ? filename : design.text}</dd></div><div><dt>인쇄 면</dt><dd>{design.side === "front" ? "앞면" : "뒷면"}</dd></div><div><dt>예시 제작 기간</dt><dd>{supplier.leadDays}</dd></div></dl><p className="quote-format-note">선택한 업체 규격에 맞춰 도안과 제작자료를 준비해요.</p><Link href="/suppliers" className="text-link">업체 변경하기</Link></aside></div>}
      {error && <p className="error submit-error" role="alert">{error}</p>}
    </>}
  </main>;
}
