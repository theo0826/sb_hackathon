"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState } from "react";
import { Check, Copy, Download, FileText, LoaderCircle, Mail } from "lucide-react";
import type { Design } from "@/lib/design";
import { emailTemplate, orderRows, type OrderDraft } from "@/lib/quote";
import type { Supplier } from "@/lib/suppliers";
import { downloadText, downloadURL, exportProductionPDF } from "@/lib/production-export";
import Artwork from "@/components/design/Artwork";
import type { CanvasHandle } from "@/components/design/DesignCanvas";

const Canvas = dynamic(() => import("@/components/design/GarmentPreview3D"), { ssr: false, loading: () => <div className="canvas-loading"><LoaderCircle className="animate-spin" size={20} /></div> });

export default function ProductionDocument({ supplier, design, order, filename }: { supplier: Supplier; design: Design; order: OrderDraft; filename: string }) {
  const artwork = useRef<SVGSVGElement>(null);
  const canvas = useRef<CanvasHandle>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const email = emailTemplate(supplier, design, order, filename);

  async function exportDocument() {
    setError(""); setMessage("");
    if (supplier.format === "email") {
      downloadText(`seongbuk-fit-${supplier.id}-email.txt`, `받는 업체: ${supplier.name} (가상 업체)\n제목: ${email.subject}\n\n${email.body}`);
      setMessage("이메일 제목과 본문을 내려받았어요. 도안과 미리보기는 아래에서 따로 내려받으세요."); return;
    }
    setBusy(true);
    try {
      const previewPNG = canvas.current?.previewPNG();
      if (!previewPNG) throw new Error("도안과 미리보기가 준비된 뒤 다시 눌러주세요.");
      await exportProductionPDF({ supplier, design, order, artworkSVG: artwork.current ? new XMLSerializer().serializeToString(artwork.current) : null, previewPNG });
      setMessage(`${supplier.name} 양식의 PDF 도안서를 내려받았어요.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "PDF를 만들지 못했어요. 다시 시도해주세요."); }
    finally { setBusy(false); }
  }
  function downloadArtwork() {
    if (design.image) downloadURL("seongbuk-fit-artwork.png", design.image);
    else if (artwork.current) downloadText("seongbuk-fit-artwork.svg", new XMLSerializer().serializeToString(artwork.current), "image/svg+xml;charset=utf-8");
  }
  function downloadPreview() {
    const preview = canvas.current?.previewPNG();
    if (!preview) { setError("미리보기가 준비된 뒤 다시 눌러주세요."); return; }
    downloadURL("seongbuk-fit-3d-preview.png", preview);
  }
  async function copyEmail() {
    try { await navigator.clipboard.writeText(`제목: ${email.subject}\n\n${email.body}`); setMessage("이메일 제목과 본문을 복사했어요."); }
    catch { setError("복사하지 못했어요. 이메일 양식 내려받기를 이용해주세요."); }
  }
  return <section className="panel production-document" data-format={supplier.format} data-supplier={supplier.id} aria-label="업체별 맞춤 제작자료">
    <div className="document-heading"><span className={`format-badge ${supplier.format}`}>{supplier.format === "pdf" ? <FileText size={14} /> : <Mail size={14} />}{supplier.format === "pdf" ? "PDF 도안서" : "이메일 양식"}</span><h2>{supplier.documentTitle}</h2><p>선택한 업체의 제출 방식으로 자동 구성한 체험용 제작자료예요.</p></div>
    <div className="document-artifacts"><div><h3>인쇄 도안</h3><div className="document-art" style={{ backgroundColor: design.color }}>{design.image ? <Image src={design.image} width={800} height={800} alt={filename || "선택 도안"} unoptimized className="artwork-image" /> : <Artwork design={design} exportRef={artwork} />}</div></div><div><h3>의류에 적용한 모습</h3><div className="document-shirt"><Canvas design={design} exportRef={canvas} /></div></div></div>
    <details className="flow-disclosure production-specs"><summary>주문 정보와 업체 규격 확인</summary>
    {supplier.format === "email" ? <div className="email-document"><div className="email-subject"><span>받는 업체</span><strong>{supplier.name} <small>실제 이메일 주소 등록 전</small></strong></div><div className="email-subject"><span>제목</span><strong>{email.subject}</strong></div><pre>{email.body}</pre></div> : <dl className="document-rows">{orderRows(supplier, design, order).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}<div><dt>추가 요청</dt><dd>{order.memo.trim() || "없음"}</dd></div></dl>}
    <div className="document-checklist"><strong>함께 전달할 자료</strong><p>{supplier.attachmentTypes.join(" · ")}</p><ul>{supplier.requirements.map((item) => <li key={item}><Check size={13} />{item}</li>)}</ul><p>인쇄 영역은 최대 {supplier.maxPrintWidthCm} × {supplier.maxPrintHeightCm}cm예요. 첨부 이미지는 최대 800px의 편집용 파일로, 실제 인쇄용 해상도 검수는 별도예요.</p></div>
    </details>
    <details className="flow-disclosure document-file-options"><summary>제작자료 다운로드</summary><div className="document-downloads"><button className="outline" onClick={downloadArtwork}><Download size={14} />원본 도안</button><button className="outline" onClick={downloadPreview}><Download size={14} />의류 미리보기</button><button className="outline" onClick={exportDocument} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}{busy ? "PDF 준비 중…" : supplier.format === "pdf" ? "업체 맞춤 PDF 내려받기" : "이메일 양식 내려받기"}</button>{supplier.format === "email" && <button className="outline" onClick={copyEmail}><Copy size={15} />제목·본문 복사</button>}</div></details>
    <div className="document-feedback" aria-live="polite">{error && <p className="error" role="alert">{error}</p>}{message && <p className="success"><Check size={14} />{message}</p>}</div>
  </section>;
}
