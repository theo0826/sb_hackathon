"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, Check, Download, Plus, Trash2, Upload, AlertCircle } from "lucide-react";
import FlowSteps from "@/components/layout/FlowSteps";
import { useDesignSession } from "@/lib/design-session";
import { useOrderDetails } from "@/lib/order-workflow-client";
import { parseRosterCSV, reviewIssues, rosterIssues, rosterSizes, type Participant } from "@/lib/order-workflow";
import { SIZES, todayKST, totalQuantity, type OrderDraft } from "@/lib/quote";
import DesignSummary from "./DesignSummary";

export default function OrderReview() {
  const router = useRouter();
  const { design, order, setOrder, hasResult } = useDesignSession();
  const { details, update } = useOrderDetails();
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? reviewIssues(order, details) : [];
  const [fileError, setFileError] = useState("");
  const file = useRef<HTMLInputElement>(null), errorBox = useRef<HTMLDivElement>(null);
  const invalidRows = details.roster.filter(row => rosterIssues(row, details.requireInitials).length).length;
  function patch(value: Partial<OrderDraft>) { setOrder(current => ({ ...current, ...value })); update({ confirmed: false }); }
  function setRoster(roster: Participant[]) { update({ roster, useRoster: true }); setOrder(current => ({ ...current, sizes: rosterSizes(roster) })); }
  function editRow(id: string, value: Partial<Participant>) { setRoster(details.roster.map(row => row.id === id ? { ...row, ...value } : row)); }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]; event.target.value = ""; if (!selected) return;
    setFileError("");
    if (selected.size > 1_000_000) { setFileError("1MB 이하 CSV 파일을 선택해주세요."); return; }
    try { setRoster(parseRosterCSV(await selected.text())); } catch (cause) { setFileError(cause instanceof Error ? cause.message : "명단을 읽지 못했어요."); }
  }
  function template() {
    const blob = new Blob(["\uFEFF이름,사이즈,이니셜\r\n김성북,M,SB\r\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = "성북핏-명단양식.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function next(event: FormEvent) {
    event.preventDefault(); const issues = reviewIssues(order, details); setSubmitted(true);
    if (issues.length) { requestAnimationFrame(() => errorBox.current?.focus()); return; }
    router.push("/suppliers");
  }
  return <main id="main-content" className="wf-page"><FlowSteps current={2} />
    {!hasResult && !design.image ? <section className="wf-empty"><h1>먼저 디자인을 만들어주세요.</h1><p>완성한 시안으로 주문서와 도안을 준비해요.</p><Link href="/design" className="primary">디자인하러 가기 <ArrowRight size={16} /></Link></section> : <form onSubmit={next} noValidate className="wf-content">
      <div className="wf-title"><h1>디자인은 끝났어요. 3가지만 채워주세요</h1><p>명단 · 납기와 수령 · 대표자와 결제</p></div>
      <div className="wf-two-column"><div className="wf-main-column">
        <section className="wf-card wf-design-ready"><span className="wf-check"><Check size={18} /></span><div><strong>디자인 · AI 작업 완료</strong><p>선택한 시안과 인쇄 위치를 주문서에 담았어요.</p></div><Link href="/design" className="text-link">디자인 수정</Link></section>
        {details.useRoster && invalidRows > 0 && <div className="wf-alert" role="status"><AlertCircle size={18} /><div><strong>명단에서 {invalidRows}개 행을 확인해주세요.</strong><p>이름·사이즈{details.requireInitials ? "·이니셜" : ""}를 채우면 다음 단계로 넘어갈 수 있어요.</p></div></div>}
        <section className="wf-card wf-roster"><div className="wf-card-heading"><h2>명단</h2><div className="wf-inline-actions"><button type="button" className="text-link" onClick={template}><Download size={14} />양식 내려받기</button><button type="button" className="wf-dark-button" onClick={() => file.current?.click()}><Upload size={14} />CSV 업로드</button></div></div>
          <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={upload} aria-label="명단 CSV 업로드" />
          <p className="wf-muted">엑셀에서 CSV UTF-8로 저장한 명단을 올리거나, 수량을 직접 입력하세요.</p>
          <div className="wf-toggle-row"><label><input type="checkbox" checked={details.useRoster} onChange={e => { update({ useRoster: e.target.checked }); if (e.target.checked) setOrder(current => ({ ...current, sizes: rosterSizes(details.roster) })); }} />개인별 명단 사용</label>{details.useRoster && <label><input type="checkbox" checked={details.requireInitials} onChange={e => update({ requireInitials: e.target.checked })} />이니셜 필수</label>}</div>
          {fileError && <p className="field-error" role="alert">{fileError}</p>}
          {details.useRoster ? <><div className="wf-table-scroll"><table className="wf-roster-table"><thead><tr><th scope="col">이름</th><th scope="col">사이즈</th><th scope="col">이니셜</th><th scope="col">확인</th><th scope="col"><span className="sr-only">삭제</span></th></tr></thead><tbody>{details.roster.map((row, i) => { const issues = rosterIssues(row, details.requireInitials); return <tr key={row.id} data-invalid={issues.length > 0}><td><input aria-label={`${i + 1}행 이름`} value={row.name} maxLength={50} onChange={e => editRow(row.id, { name: e.target.value })} /></td><td><select aria-label={`${i + 1}행 사이즈`} value={row.size} onChange={e => editRow(row.id, { size: e.target.value })}><option value="">선택</option>{!(SIZES as readonly string[]).includes(row.size) && row.size && <option value={row.size}>{row.size} (확인)</option>}{SIZES.map(s => <option key={s}>{s}</option>)}</select></td><td><input aria-label={`${i + 1}행 이니셜`} value={row.initials} maxLength={30} onChange={e => editRow(row.id, { initials: e.target.value })} /></td><td>{issues.length ? issues.join(" · ") : <span className="wf-ok">확인</span>}</td><td><button type="button" className="wf-icon" aria-label={`${i + 1}행 삭제`} onClick={() => setRoster(details.roster.filter(r => r.id !== row.id))}><Trash2 size={14} /></button></td></tr>; })}</tbody></table></div><button type="button" className="text-link wf-add-row" disabled={details.roster.length >= 500} onClick={() => setRoster([...details.roster, { id: crypto.randomUUID(), name: "", size: "M", initials: "" }])}><Plus size={16} />명단 추가</button></> : <div className="wf-size-inputs">{SIZES.map(size => <label key={size}>{size}<input aria-label={`${size} 수량`} type="number" min={0} max={999} value={order.sizes[size]} onChange={e => patch({ sizes: { ...order.sizes, [size]: Math.max(0, Math.min(999, Math.trunc(Number(e.target.value)))) } })} /></label>)}</div>}
          <div className="wf-quantity"><span>총 주문 수량</span><strong>{totalQuantity(order)}벌</strong></div>
        </section>
        <div className="wf-form-columns"><section className="wf-card"><h2>납기 · 수령</h2><label className="wf-field">희망 수령일<input type="date" min={todayKST()} value={order.desiredDeliveryDate} onChange={e => patch({ desiredDeliveryDate: e.target.value })} required /></label><p className="wf-muted">실제 제작 일정은 업체 확인 후 확정돼요.</p><fieldset className="wf-field"><legend>수령 방법</legend><div className="wf-choices">{([['shipping','택배 배송'],['pickup','방문 수령']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={details.delivery === value} onClick={() => update({ delivery: value })}>{label}</button>)}</div></fieldset>{details.delivery === "shipping" && <label className="wf-field">배송 주소<input value={details.address} maxLength={300} autoComplete="street-address" placeholder="우편번호 · 기본 주소 · 상세 주소" onChange={e => update({ address: e.target.value })} required /></label>}<label className="wf-field">제작 방식<select value={order.method} onChange={e => patch({ method: e.target.value })}>{['DTF','실크스크린','자수'].map(m => <option key={m}>{m}</option>)}</select></label><label className="wf-field">추가 요청<textarea rows={3} value={order.memo} maxLength={500} placeholder="포장, 일정 등 전달할 내용을 적어주세요." onChange={e => patch({ memo: e.target.value })} /></label></section>
          <section className="wf-card"><h2>대표자 · 결제</h2><label className="wf-field">단체 이름<input value={order.group} maxLength={50} placeholder="예: 성북마을 걷기 모임" onChange={e => patch({ group: e.target.value })} required /></label><label className="wf-field">연락 이메일<input type="email" autoComplete="email" value={order.contactEmail} maxLength={254} placeholder="hello@example.com" onChange={e => patch({ contactEmail: e.target.value })} required /></label><label className="wf-field">연락처 <span className="wf-optional">선택</span><input type="tel" autoComplete="tel" value={details.phone} maxLength={30} placeholder="010-0000-0000" onChange={e => update({ phone: e.target.value })} /></label><fieldset className="wf-field"><legend>결제 방식</legend><div className="wf-choices">{([['group','대표자 결제'],['individual','개별 결제']] as const).map(([value,label]) => <button type="button" key={value} aria-pressed={details.payment === value} onClick={() => update({ payment: value })}>{label}</button>)}</div></fieldset><p className="wf-muted">희망 결제 방식만 선택해요. 시연에서는 결제가 발생하지 않아요.</p></section></div>
      </div><aside className="wf-aside"><DesignSummary design={design} order={order} title="한눈에 보는 작업지시서" /><div className="wf-card wf-confirm"><label><input type="checkbox" checked={details.confirmed} onChange={e => update({ confirmed: e.target.checked })} />주문서와 도안을 확인했어요.</label><button type="submit" className="primary wide">업체별 견적 요청하기 <ArrowRight size={16} /></button><p className="wf-muted">다음 화면에서 예시 업체 견적을 비교해요.</p></div></aside></div>
      {errors.length > 0 && <div ref={errorBox} tabIndex={-1} className="wf-alert wf-validation" role="alert"><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
    </form>}
  </main>;
}
