"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Download, FileText, LoaderCircle, Save } from "lucide-react";
import { downloadLibraryFile, downloadLibraryAttachment, updateLibraryItem, useLibrary } from "@/lib/library";
import { useDesignSession } from "@/lib/design-session";
import { COLORS, garmentName, printSummary } from "@/lib/design";
import { getSupplier } from "@/lib/suppliers";
import { isOrderDraft } from "@/lib/quote";
import Artwork from "@/components/design/Artwork";
import { resetOrderDetails } from "@/lib/order-workflow-client";
import ProductionDocument from "@/components/supplier/ProductionDocument";
export default function LibraryDetail({ id }: { id: string }) {
  const { items, status, error: libraryError } = useLibrary();
  const item = items.find((value) => value.id === id);
  const preview = item?.preview || item?.design.image;
  const { loadDesign, selectSupplier, setOrder } = useDesignSession();
  const [title, setTitle] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileText, setFileText] = useState("");
  const [pdfURL, setPDFURL] = useState("");
  useEffect(() => { let active = true; if (item?.file?.type.startsWith("text/")) void item.file.text().then((text) => { if (active) setFileText(text); }); return () => { active = false; }; }, [item]);
  useEffect(() => () => { if (pdfURL) URL.revokeObjectURL(pdfURL); }, [pdfURL]);
  async function rename() {
    if (!item || busy) return;
    const next = (title ?? item.title).trim();
    if (!next) { setError("저장 이름을 입력해주세요."); return; }
    setBusy(true); setError("");
    try { await updateLibraryItem(id, { title: next }); setTitle(null); setMessage("저장 이름을 변경했어요."); }
    catch { setError("이름을 변경하지 못했어요."); } finally { setBusy(false); }
  }
  function load() { if (item) { loadDesign(item); if (item.kind === "design") resetOrderDetails(); else { if (item.supplierId) selectSupplier(item.supplierId); if (item.order) setOrder(item.order); } } }
  return <main id="main-content" className="shell studio-main library-detail"><Link href="/my" className="text-link"><ArrowLeft size={14} />마이페이지로 돌아가기</Link>{status === "loading" ? <div className="panel empty-state"><LoaderCircle size={24} className="animate-spin" />항목을 불러오고 있어요.</div> : !item ? <div className="panel empty-state"><h1>보관한 항목을 찾지 못했어요.</h1><p>{libraryError || "보관함에서 다시 확인해주세요."}</p><Link href="/my" className="primary">보관함 보기</Link></div> : <><div className="intro"><div><span className="eyebrow">SAVED IN YOUR SPACE</span><h1>{item.title}</h1><p>{item.kind === "design" ? "저장 당시의 디자인과 편집 정보를 그대로 보관했어요." : item.kind === "artwork" ? "티셔츠 배경을 제외한 도안을 파일로 보관했어요." : "업체 제출 양식과 주문 정보, 첨부 도안을 한곳에서 확인해요."}</p></div><div className="actions"><button className="primary" onClick={() => downloadLibraryFile(item)}><Download size={15} />{item.file ? "보관한 파일 다운로드" : "디자인 파일 다운로드"}</button></div></div>
      {item.trashedAt && <div className="demo-notice"><span>이 항목은 휴지통에 있어요.</span><button className="text-link" onClick={() => updateLibraryItem(id, { trashedAt: null }).catch(() => setError("복원하지 못했어요."))}>보관함으로 복원</button></div>}
      <div className="library-detail-layout"><section className="panel"><div className="panel-title"><h2>{item.kind === "design" ? "디자인 미리보기" : "도안 미리보기"}</h2><span>{item.format || "디자인"}</span></div><div className="detail-artboard" style={{ backgroundColor: item.design.color }}>{preview ? <Image src={preview} alt={item.title} width={800} height={800} unoptimized /> : <Artwork design={item.design} />}</div>
        {item.format === "PDF" && item.file && <><button className="outline pdf-preview-button" onClick={() => setPDFURL(URL.createObjectURL(item.file!))}><FileText size={15} />보관한 PDF 열기</button>{pdfURL && <iframe className="saved-pdf-frame" title="보관한 PDF 미리보기" src={pdfURL} />}</>}{item.format === "EMAIL" && fileText && <pre className="saved-email">{fileText}</pre>}
        {!!item.attachments?.length && <div className="saved-attachments"><h3>함께 보관한 파일</h3>{item.attachments.map((attachment) => <button key={attachment.fileName} className="outline" onClick={() => downloadLibraryAttachment(attachment)}><Download size={15} />{attachment.label}<small>{attachment.fileName}</small></button>)}</div>}
        {item.prompt && <div className="saved-instruction"><h3>이 디자인에 사용한 지시사항</h3><p>{item.prompt}</p></div>}
      </section><aside className="panel"><div className="panel-title"><h2>저장 정보</h2><span>{item.kind === "design" ? "디자인" : "도안·제작자료"}</span></div><label htmlFor="saved-title" className="field-label">저장 이름</label><div className="rename-form"><input id="saved-title" className="form-input" maxLength={100} value={title ?? item.title} onChange={(event) => setTitle(event.target.value)} /><button className="outline" onClick={rename} disabled={busy}><Save size={14} />변경</button></div><dl className="design-summary"><div><dt>의류</dt><dd>{garmentName(item.design)}</dd></div><div><dt>원단 / 인쇄 색상</dt><dd>{COLORS.find((color) => color.hex === item.design.color)?.name || item.design.color} / {item.design.ink}</dd></div><div><dt>인쇄 면 / 도안 크기 / 회전</dt><dd>{printSummary(item.design)}</dd></div><div><dt>저장 시각</dt><dd>{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</dd></div>{item.file && <div><dt>파일 / 용량</dt><dd>{item.fileName} · {(item.file.size / 1024).toFixed(1)} KB</dd></div>}{item.supplierId && <div><dt>제작 업체</dt><dd>{getSupplier(item.supplierId)?.name}</dd></div>}</dl><Link href="/design" onClick={load} className="primary wide">불러와서 AI와 이어 만들기 <ArrowRight size={15} /></Link><Link href={item.supplierId ? "/quotes/new" : "/suppliers"} onClick={load} className="outline wide">업체 맞춤 자료 준비하기</Link></aside></div>
      {item.kind === "document" && getSupplier(item.supplierId) && isOrderDraft(item.order) && <ProductionDocument supplier={getSupplier(item.supplierId)!} design={item.design} order={item.order} filename={item.filename} />}
      <div className="studio-feedback" aria-live="polite">{error && <p className="error" role="alert">{error}</p>}{message && <p className="success"><Check size={14} />{message}</p>}</div>
    </>}</main>;
}
