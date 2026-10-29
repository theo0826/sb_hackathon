"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowRight, ChevronDown, ChevronRight, Download, Plus, Shirt, Upload, X } from "lucide-react";
import FlowSteps from "@/components/layout/FlowSteps";
import { useDesignSession } from "@/lib/design-session";
import { useOrderDetails } from "@/lib/order-workflow-client";
import { estimate, parseRosterCSV, reviewIssues, rosterIssues, rosterSizes, won, type Participant } from "@/lib/order-workflow";
import { SIZES, todayKST, totalQuantity, type OrderDraft } from "@/lib/quote";
import { SUPPLIERS } from "@/lib/suppliers";
import { pricingGarment } from "@/lib/garment-pricing";
import { getClothData, useClothData } from "@/components/ClothSim/clothdata/store";
import { readyClothCapture } from "@/lib/cloth-capture";
import ClothCapturePreview from "@/components/design/ClothCapturePreview";
import { resetSupplierBids } from "@/lib/supplier-bids-client";

const subscribeMobile = (listener: () => void) => {
  const media = window.matchMedia("(max-width: 800px)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
const getMobile = () => window.matchMedia("(max-width: 800px)").matches;
const methodLabel = (method: string) => method === "DTF" ? "DTF 전사" : method;

export default function OrderReview() {
  const router = useRouter();
  const { order, setOrder, hasResult, design } = useDesignSession();
  const { details, update } = useOrderDetails();
  const clothData = useClothData();
  const captureReady = readyClothCapture(clothData);
  const mobile = useSyncExternalStore(subscribeMobile, getMobile, () => false);
  const [submitted, setSubmitted] = useState(false);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [pendingRoster, setPendingRoster] = useState<Participant[] | null>(null);
  const [editing, setEditing] = useState<Participant | null>(null);
  const [newParticipant, setNewParticipant] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rowSubmitted, setRowSubmitted] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const summary = useRef<HTMLElement>(null);
  const rowDialog = useRef<HTMLDialogElement>(null);
  const importDialog = useRef<HTMLDialogElement>(null);
  const rowTrigger = useRef<HTMLElement | null>(null);
  const dragDepth = useRef(0);
  const quantity = totalQuantity(order);
  const price = estimate(SUPPLIERS[0], order);
  const invalidRows = details.roster.filter(row => rosterIssues(row, details.requireInitials).length).length;
  // Requesting estimates confirms this form; final artwork approval happens later.
  const issues = reviewIssues(order, { ...details, confirmed: true });
  const errors = submitted ? issues : [];
  const rowErrors = editing && rowSubmitted ? rosterIssues(editing, details.requireInitials) : [];
  const garmentLabel = clothData.category?.label || pricingGarment(order.pricingGarment).label;
  const editingId = editing?.id;

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => setKeyboardOpen(viewport.height < window.innerHeight * .75);
    viewport.addEventListener("resize", resize);
    return () => viewport.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    const dialog = rowDialog.current;
    if (!editingId || !dialog) return;
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>("#participant-edit-name")?.focus({ preventScroll: true });
    return () => { dialog.close(); if (rowTrigger.current?.isConnected) rowTrigger.current.focus(); else document.querySelector<HTMLButtonElement>(".order-add-row")?.focus(); };
  }, [editingId]);
  useEffect(() => {
    const dialog = importDialog.current;
    if (!pendingRoster || !dialog) return;
    dialog.showModal();
    return () => { dialog.close(); };
  }, [pendingRoster]);

  function patch(value: Partial<OrderDraft>) {
    setOrder(current => ({ ...current, ...value }));
    update({ confirmed: false, ...(value.sizes && !details.useRoster ? { manualSizes: value.sizes } : {}) });
  }
  function setRoster(roster: Participant[]) {
    update({ roster, useRoster: true });
    setOrder(current => ({ ...current, sizes: rosterSizes(roster) }));
  }
  function selectMode(useRoster: boolean) {
    if (useRoster === details.useRoster) return;
    update({ useRoster, ...(!details.useRoster ? { manualSizes: { ...order.sizes } } : {}) });
    setOrder(current => ({ ...current, sizes: useRoster ? rosterSizes(details.roster) : details.manualSizes || current.sizes }));
  }
  function editRow(id: string, value: Partial<Participant>) { setRoster(details.roster.map(row => row.id === id ? { ...row, ...value } : row)); }
  function closeEditor() { setEditing(null); setDeleting(false); setRowSubmitted(false); }
  function openEditor(row: Participant, isNew: boolean, trigger: HTMLElement) {
    rowTrigger.current = trigger;
    setNewParticipant(isNew); setRowSubmitted(false); setDeleting(false); setEditing({ ...row });
  }
  function addParticipant(trigger: HTMLElement) {
    if (details.roster.length >= 500) return;
    const row = { id: crypto.randomUUID(), name: "", size: "M", initials: "" };
    if (mobile) { openEditor(row, true, trigger); return; }
    setRoster([...details.roster, row]);
    if (details.roster.length >= 4) setShowAll(true);
    requestAnimationFrame(() => {
      const input = document.getElementById(`participant-${row.id}-name`);
      input?.scrollIntoView({ block: "nearest" }); input?.focus();
    });
  }
  function saveParticipant(event: FormEvent) {
    event.preventDefault(); setRowSubmitted(true);
    if (!editing) return;
    if (rosterIssues(editing, details.requireInitials).length) {
      requestAnimationFrame(() => rowDialog.current?.querySelector<HTMLInputElement>("[aria-invalid=true]")?.focus()); return;
    }
    setRoster(newParticipant ? [...details.roster, editing] : details.roster.map(row => row.id === editing.id ? editing : row));
    closeEditor();
  }
  async function upload(selected?: File) {
    if (!selected) return;
    setFileError("");
    if (!/\.csv$/i.test(selected.name)) { setFileError("CSV 파일을 선택해 주세요. 엑셀에서는 CSV UTF-8 형식으로 저장할 수 있어요."); return; }
    if (selected.size > 1_000_000) { setFileError("1MB 이하 CSV 파일을 선택해 주세요."); return; }
    try {
      const roster = parseRosterCSV(await selected.text());
      if (details.roster.length) setPendingRoster(roster);
      else { setRoster(roster); setShowAll(false); }
    } catch (cause) { setFileError(cause instanceof Error ? cause.message : "명단을 읽지 못했어요."); }
  }
  function template() {
    const blob = new Blob(["\uFEFF이름,사이즈,이니셜\r\n김성북,M,SB\r\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = "한땀-명단양식.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function next(event: FormEvent) {
    event.preventDefault(); setSubmitted(true);
    if (!readyClothCapture(getClothData())) return;
    if (issues.length) {
      if (details.useRoster && invalidRows) setShowAll(true);
      requestAnimationFrame(() => {
        const invalid = Array.from(form.current?.querySelectorAll<HTMLElement>("[aria-invalid=true], [data-empty-invalid=true]") || []).find(element => element.getClientRects().length > 0);
        if (invalid) { invalid.scrollIntoView({ block: "center", behavior: "smooth" }); invalid.focus({ preventScroll: true }); }
      }); return;
    }
    resetSupplierBids(); update({ confirmed: true }); router.push("/suppliers");
  }
  function toggleSummary() {
    setSummaryOpen(!summaryOpen);
    if (!summaryOpen) requestAnimationFrame(() => summary.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }
  const quantityInvalid = submitted && quantity < 1;
  const dateInvalid = submitted && issues.some(issue => issue.includes("수령일"));
  const addressInvalid = submitted && details.delivery === "shipping" && !details.address.trim();
  const groupInvalid = submitted && !order.group.trim();
  const emailInvalid = submitted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.contactEmail);

  return <main id="main-content" className="wf-page order-review" data-ui data-keyboard={keyboardOpen}>
    <div className="order-review-inner"><FlowSteps current={2} />
      {!captureReady || (!hasResult && !design.image) ? <section className="wf-empty"><h1>도안 준비를 먼저 마쳐주세요.</h1><p>디자인 화면에서 앞·뒷면 이미지가 준비되면 주문서를 작성할 수 있어요.</p><Link href="/design" className="primary">디자인하러 가기 <ArrowRight size={16} /></Link></section> : <>
        <header className="order-review-title"><h1>주문서를 작성해 주세요</h1><p>수량과 수령 정보를 확인하면 업체별 견적을 비교할 수 있어요.</p></header>
        <form ref={form} onSubmit={next} noValidate className="order-review-layout" id="order-review-form">
          <div className="order-review-fields"><div className="order-review-card order-review-inputs">
            <section className="order-review-section" aria-labelledby="roster-heading"><h2 id="roster-heading">명단</h2>
              <div className="order-roster-tabs" role="tablist" aria-label="주문 수량 입력 방식">{[false, true].map((roster, i) => <button type="button" role="tab" id={`roster-tab-${i}`} key={String(roster)} aria-selected={details.useRoster === roster} aria-controls="order-roster-panel" tabIndex={details.useRoster === roster ? 0 : -1} onClick={() => selectMode(roster)} onKeyDown={event => {
                if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const target = event.key === "Home" ? false : event.key === "End" ? true : !details.useRoster; selectMode(target); document.getElementById(`roster-tab-${target ? 1 : 0}`)?.focus(); }
              }}>{roster ? "개인별 명단" : "사이즈별 수량"}</button>)}</div>
              <div id="order-roster-panel" role="tabpanel" aria-labelledby={`roster-tab-${details.useRoster ? 1 : 0}`} tabIndex={details.useRoster ? 0 : undefined} data-empty-invalid={details.useRoster && quantityInvalid || undefined} aria-describedby={details.useRoster && quantityInvalid ? "quantity-error" : undefined}>
                <input ref={file} type="file" accept=".csv,text/csv" hidden aria-label="명단 CSV 업로드" onChange={event => { const selected = event.target.files?.[0]; event.target.value = ""; void upload(selected); }} />
                {!details.useRoster ? <div className="order-size-inputs">{SIZES.map(size => <label key={size} htmlFor={`quantity-${size}`}>{size}<input id={`quantity-${size}`} aria-label={`${size} 수량`} aria-invalid={quantityInvalid || undefined} aria-describedby={quantityInvalid ? "quantity-error" : undefined} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0" value={order.sizes[size] || ""} onChange={event => {
                  const value = event.target.value; if (/^[0-9]*$/.test(value)) patch({ sizes: { ...order.sizes, [size]: Math.min(999, Number(value)) } });
                }} /></label>)}</div> : <>
                  {details.roster.length > 0 ? <>
                    <div className="order-roster-toolbar"><span>총 {details.roster.length}명 · 1인 1벌</span><div><button type="button" onClick={template}><Download size={14} />양식 내려받기</button><button type="button" className="order-small-button" onClick={() => file.current?.click()}><Upload size={14} /><span className="order-desktop-only">CSV 다시 불러오기</span><span className="order-mobile-only">CSV로 명단 불러오기</span></button></div></div>
                    {invalidRows > 0 && <p className="order-field-error" role="status">명단에서 {invalidRows}명의 이름·사이즈{details.requireInitials ? "·인쇄 문구" : ""}를 확인해 주세요.</p>}
                    <div className="order-roster-desktop"><table><thead><tr><th scope="col"><span className="sr-only">번호</span></th><th scope="col">이름</th><th scope="col">인쇄 문구 <span>{details.requireInitials ? "필수" : "선택"}</span></th><th scope="col">사이즈</th><th scope="col"><span className="sr-only">삭제</span></th></tr></thead><tbody>{(showAll ? details.roster : details.roster.slice(0, 4)).map((row, i) => <tr key={row.id} data-invalid={rosterIssues(row, details.requireInitials).length > 0}>
                      <td>{i + 1}</td><td><input id={`participant-${row.id}-name`} aria-label={`${i + 1}행 이름`} aria-invalid={!row.name.trim() || undefined} value={row.name} maxLength={50} placeholder="이름" onChange={event => editRow(row.id, { name: event.target.value })} />{!row.name.trim() && <span className="order-field-error">이름 누락</span>}</td>
                      <td><input aria-label={`${i + 1}행 인쇄 문구`} aria-invalid={details.requireInitials && !row.initials.trim() || undefined} value={row.initials} maxLength={30} placeholder={details.requireInitials ? "필수 입력" : "선택 입력"} onChange={event => editRow(row.id, { initials: event.target.value })} />{details.requireInitials && !row.initials.trim() && <span className="order-field-error">인쇄 문구 누락</span>}</td>
                      <td><select aria-label={`${i + 1}행 사이즈`} aria-invalid={!(SIZES as readonly string[]).includes(row.size) || undefined} value={row.size} onChange={event => editRow(row.id, { size: event.target.value })}><option value="">선택</option>{!(SIZES as readonly string[]).includes(row.size) && row.size && <option value={row.size}>{row.size} (확인)</option>}{SIZES.map(size => <option key={size}>{size}</option>)}</select>{!(SIZES as readonly string[]).includes(row.size) && <span className="order-field-error">사이즈 확인</span>}</td>
                      <td><button type="button" className="order-icon-button" aria-label={`${i + 1}행 삭제`} onClick={() => setRoster(details.roster.filter(item => item.id !== row.id))}><X size={16} /></button></td>
                    </tr>)}</tbody></table>{details.roster.length > 4 && <button type="button" className="order-show-all" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "명단 접기" : `전체 ${details.roster.length}명 보기`}<ChevronDown size={15} className={showAll ? "is-open" : ""} /></button>}</div>
                    <div className="order-roster-mobile"><ol>{(showAll ? details.roster : details.roster.slice(0, 4)).map((row, i) => <li key={row.id}><button type="button" data-invalid={rosterIssues(row, details.requireInitials).length > 0} aria-invalid={rosterIssues(row, details.requireInitials).length > 0 || undefined} aria-label={`${i + 1}번 ${row.name || "이름 없음"} 명단 편집`} onClick={event => openEditor(row, false, event.currentTarget)}><span className="order-roster-number">{i + 1}</span><span className="order-participant-name"><strong>{row.name || "이름을 입력해 주세요"}</strong>{row.initials && <small>인쇄 문구 · {row.initials}</small>}{rosterIssues(row, details.requireInitials).length > 0 && <small className="order-field-error">{rosterIssues(row, details.requireInitials).join(" · ")}</small>}</span><span className="order-participant-size">{row.size || "선택"}</span><ChevronRight size={16} /></button></li>)}</ol>{details.roster.length > 4 && <button type="button" className="order-show-all" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "명단 접기" : `전체 ${details.roster.length}명 보기`}<ChevronDown size={15} className={showAll ? "is-open" : ""} /></button>}</div>
                    <button type="button" className="order-add-row" disabled={details.roster.length >= 500} onClick={event => addParticipant(event.currentTarget)}><Plus size={15} />한 명 추가</button>
                  </> : <>
                    <div className="order-upload-empty" data-dragging={dragging} onDragEnter={event => { event.preventDefault(); dragDepth.current++; setDragging(true); }} onDragOver={event => event.preventDefault()} onDragLeave={event => { event.preventDefault(); if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } }} onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); void upload(event.dataTransfer.files[0]); }}>
                      <span className="order-upload-icon"><Upload size={20} /></span><strong>아직 명단이 없어요</strong><p><span className="order-desktop-only">CSV 파일을 끌어다 놓거나 </span><span className="order-mobile-only">한 번에 간편하게 </span><button type="button" onClick={() => file.current?.click()}>불러와서 채워보세요</button></p><small>이름 · 사이즈 · 인쇄 문구 / 1인 1벌 기준</small><button type="button" className="order-small-button order-upload-mobile" onClick={() => file.current?.click()}><Upload size={15} />CSV로 명단 불러오기</button>
                    </div><div className="order-empty-actions"><button type="button" className="order-small-button" onClick={event => addParticipant(event.currentTarget)}><Plus size={15} />한 명씩 직접 추가</button><span>양식이 없나요? <button type="button" onClick={template}>양식 내려받기</button></span></div>
                  </>}
                </>}
                {fileError && <p className="order-field-error" role="alert">{fileError}</p>}
                {quantityInvalid && <p id="quantity-error" className="order-field-error">주문 수량을 1벌 이상 입력해 주세요.</p>}
                <div className="order-quantity-total"><span>{details.useRoster ? "사이즈별 수량" : "사이즈별 수량을 입력하면 자동으로 합산해요"}{details.useRoster && <small>{SIZES.map(size => `${size} ${order.sizes[size]}`).join(" · ")}</small>}</span><strong aria-live="polite" aria-atomic="true">총 {quantity}벌</strong></div>
              </div>
            </section>
            <section className="order-review-section" aria-labelledby="delivery-heading"><h2 id="delivery-heading">납기 · 수령</h2>
              <div className="order-field-grid"><label className="order-field" htmlFor="order-date">희망 수령일<input id="order-date" type="date" min={todayKST()} value={order.desiredDeliveryDate} aria-invalid={dateInvalid || undefined} aria-describedby={dateInvalid ? "date-error" : "date-note"} onChange={event => patch({ desiredDeliveryDate: event.target.value })} required /></label><label className="order-field" htmlFor="order-method">제작 방식<select id="order-method" value={order.method} onChange={event => patch({ method: event.target.value })}>{["DTF", "실크스크린", "자수"].map(method => <option key={method} value={method}>{methodLabel(method)}</option>)}</select></label></div>
              {dateInvalid ? <p id="date-error" className="order-field-error">희망 수령일을 오늘 이후로 선택해 주세요.</p> : <p id="date-note" className="order-field-note">제작 일정은 업체 확인 후 확정돼요.</p>}
              <fieldset className="order-field"><legend>수령 방법</legend><div className="order-radio-group">{([["shipping", "택배 배송", "원하는 주소로 배송"], ["pickup", "업체 방문 수령", "제작 업체에서 직접 수령"]] as const).map(([value, label, note]) => <label key={value}><input type="radio" name="order-delivery" value={value} checked={details.delivery === value} onChange={() => update({ delivery: value })} /><span><strong>{label}</strong><small>{note}</small></span></label>)}</div></fieldset>
              <label className="order-field" htmlFor={details.delivery === "shipping" ? "order-address" : undefined}>{details.delivery === "shipping" ? "배송 주소" : "수령 장소"}{details.delivery === "shipping" ? <input id="order-address" value={details.address} maxLength={300} autoComplete="street-address" placeholder="예: 서울시 성북구 OO로 12, 3층" aria-invalid={addressInvalid || undefined} aria-describedby={addressInvalid ? "address-error" : undefined} onChange={event => update({ address: event.target.value })} required /> : <span className="order-pickup-note">선택한 제작 업체와 협의 후 방문 수령해요.</span>}</label>{addressInvalid && <p id="address-error" className="order-field-error">배송받을 주소를 입력해 주세요.</p>}
            </section>
            <section className="order-review-section" aria-labelledby="contact-heading"><h2 id="contact-heading">담당자 · 결제</h2>
              <label className="order-field" htmlFor="order-group">단체 이름<input id="order-group" value={order.group} maxLength={50} placeholder="예: 성북대학교 의류학과" aria-invalid={groupInvalid || undefined} aria-describedby={groupInvalid ? "group-error" : undefined} onChange={event => patch({ group: event.target.value })} required /></label>{groupInvalid && <p id="group-error" className="order-field-error">단체 이름을 입력해 주세요.</p>}
              <div className="order-field-grid"><label className="order-field" htmlFor="order-email">연락 이메일<input id="order-email" type="email" autoComplete="email" value={order.contactEmail} maxLength={254} placeholder="hello@example.com" aria-invalid={emailInvalid || undefined} aria-describedby={emailInvalid ? "email-error" : undefined} onChange={event => patch({ contactEmail: event.target.value })} required />{emailInvalid && <span id="email-error" className="order-field-error">연락 이메일을 확인해 주세요.</span>}</label><label className="order-field" htmlFor="order-phone"><span>연락처 <span className="order-optional">(선택)</span></span><input id="order-phone" type="tel" autoComplete="tel" value={details.phone} maxLength={30} placeholder="010-0000-0000" onChange={event => update({ phone: event.target.value })} /></label></div>
              <fieldset className="order-field"><legend>결제 방식</legend><div className="order-radio-group">{([["group", "대표자 결제", "한 번에 결제"], ["individual", "개별 결제", "각자 결제"]] as const).map(([value, label, note]) => <label key={value}><input type="radio" name="order-payment" value={value} checked={details.payment === value} onChange={() => update({ payment: value })} /><span><strong>{label}</strong><small>{note}</small></span></label>)}</div></fieldset><p className="order-field-note">이 단계에서는 실제 결제가 발생하지 않아요.</p>
            </section>
          </div></div>
          <aside className="order-review-aside">
            <section ref={summary} className="order-review-card order-review-summary"><div className="order-summary-heading order-desktop-only"><h2>내 주문 요약</h2><Link href="/design">디자인 수정</Link></div>
              <button type="button" className="order-summary-toggle order-mobile-only" aria-expanded={summaryOpen} aria-controls="order-summary-body" onClick={toggleSummary}><Shirt size={24} /><span><strong>주문 내용 확인</strong><small>{garmentLabel} · {quantity}벌 · {methodLabel(order.method)} · {details.delivery === "shipping" ? "택배 배송" : "방문 수령"}</small></span><ChevronDown size={17} className={summaryOpen ? "is-open" : ""} /></button>
              <div id="order-summary-body" hidden={mobile && !summaryOpen}><p className="order-summary-intro order-desktop-only">입력한 정보가 여기에 함께 담겨요</p><div className="order-summary-preview"><ClothCapturePreview capture={clothData} /></div><Link href="/design" className="order-small-button order-summary-edit order-mobile-only">디자인 수정</Link>
                <dl className="order-summary-facts"><div><dt>의류</dt><dd>{garmentLabel}</dd></div><div><dt>수량</dt><dd>{quantity}벌</dd></div><div><dt>사이즈</dt><dd>{SIZES.filter(size => order.sizes[size] > 0).map(size => `${size} ${order.sizes[size]}`).join(" · ") || "입력 전"}</dd></div><div><dt>제작 방식</dt><dd>{methodLabel(order.method)}</dd></div><div><dt>수령 방법</dt><dd>{details.delivery === "shipping" ? "택배 배송" : "업체 방문 수령"}</dd></div><div><dt>희망 수령일</dt><dd data-empty={!order.desiredDeliveryDate}>{order.desiredDeliveryDate || "선택 전"}</dd></div></dl>
              </div>
            </section>
            <section className="order-review-card order-review-estimate" aria-labelledby="order-estimate-heading"><h2 id="order-estimate-heading">예상 금액</h2><p>최종 금액은 업체 견적 후 확정돼요.</p><dl><div><dt>예상 단가 · 1벌</dt><dd>{won(price.unit)} ~ {won(price.unit + 5000)}</dd></div><div><dt>예상 총액 · {quantity}벌</dt><dd aria-live="polite" aria-atomic="true">{won(price.total)} ~ {won((price.unit + 5000) * quantity)}</dd></div></dl><div className="order-review-next"><button type="submit" className="order-primary">업체별 견적 받기 <ArrowRight size={16} /></button></div></section>
            {errors.length > 0 && <p className="order-submit-error" role="alert">입력이 필요한 항목을 확인해 주세요.</p>}
          </aside>
        </form>
      </>}
    </div>
    {editing && <dialog ref={rowDialog} className="order-roster-dialog" aria-labelledby="participant-editor-title" onCancel={closeEditor} onClick={event => { if (event.target === event.currentTarget) closeEditor(); }}><div className="order-sheet-handle" />{deleting ? <div className="order-delete-confirm"><h2 id="participant-editor-title">명단에서 삭제할까요?</h2><p>{editing.name || "이 참여자"}님의 명단을 삭제하면 총 주문 수량도 함께 바뀌어요.</p><div><button type="button" className="order-small-button" onClick={() => setDeleting(false)}>취소</button><button type="button" className="order-danger-button" onClick={() => { setRoster(details.roster.filter(row => row.id !== editing.id)); closeEditor(); }}>삭제</button></div></div> : <form onSubmit={saveParticipant} noValidate><div className="order-sheet-heading"><h2 id="participant-editor-title">{newParticipant ? "명단 추가" : "개별 명단 수정"}</h2><button type="button" className="order-icon-button" aria-label="명단 편집 닫기" onClick={closeEditor}><X size={21} /></button></div>
      <label className="order-field" htmlFor="participant-edit-name">이름<input id="participant-edit-name" autoComplete="off" value={editing.name} maxLength={50} aria-invalid={rowSubmitted && !editing.name.trim() || undefined} onChange={event => setEditing({ ...editing, name: event.target.value })} required /></label>
      <fieldset className="order-field"><legend>사이즈</legend><div className="order-size-choices">{SIZES.map(size => <label key={size}><input type="radio" name="participant-size" value={size} checked={editing.size === size} onChange={() => setEditing({ ...editing, size })} /><span>{size}</span></label>)}</div></fieldset>
      <label className="order-field" htmlFor="participant-edit-initials"><span>인쇄 문구 <span className="order-optional">{details.requireInitials ? "필수" : "선택"}</span></span><input id="participant-edit-initials" value={editing.initials} maxLength={30} placeholder="예: KIM" aria-invalid={rowSubmitted && details.requireInitials && !editing.initials.trim() || undefined} onChange={event => setEditing({ ...editing, initials: event.target.value })} /></label><p className="order-field-note">개별 이니셜이나 이름을 인쇄할 때 입력해 주세요.</p>{rowErrors.length > 0 && <p className="order-field-error" role="alert">{rowErrors.join(" · ")}</p>}<button type="submit" className="order-primary">저장</button>{!newParticipant && <button type="button" className="order-delete-participant" onClick={() => setDeleting(true)}>명단에서 삭제</button>}</form>}</dialog>}
    {pendingRoster && <dialog ref={importDialog} className="order-import-dialog" aria-labelledby="roster-import-title" onCancel={() => setPendingRoster(null)}><h2 id="roster-import-title">명단을 바꿀까요?</h2><p>기존 명단 {details.roster.length}명을 새 CSV 명단 {pendingRoster.length}명으로 바꿔요. 직접 입력한 내용도 함께 바뀝니다.</p><div><button type="button" className="order-small-button" onClick={() => setPendingRoster(null)}>취소</button><button type="button" className="order-primary" onClick={() => { setRoster(pendingRoster); setPendingRoster(null); setShowAll(false); }}>바꾸기</button></div></dialog>}
  </main>;
}
