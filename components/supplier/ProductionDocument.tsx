"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Check, Copy, Download, FileText, LoaderCircle, Mail } from "lucide-react";
import type { Design } from "@/lib/design";
import { emailTemplate, orderRows, type OrderDraft, type QuoteDocument } from "@/lib/quote";
import type { Supplier } from "@/lib/suppliers";
import { downloadText, downloadURL, exportProductionPDF } from "@/lib/production-export";
import Artwork from "@/components/design/Artwork";
import PatternComparison, { type PatternHandle } from "./PatternComparison";
import { textArtworkSVG } from "@/lib/print-artwork";

export default function ProductionDocument({ supplier, design, order, filename, document, expandSpecs = false }: { supplier: Supplier; design: Design; order: OrderDraft; filename: string; document?: QuoteDocument; expandSpecs?: boolean }) {
  const artwork = useRef<SVGSVGElement>(null);
  const patterns = useRef<PatternHandle>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const textOnly=design.placements?.every(p=>p.content==="text");
  const firstText=design.placements?.find(p=>p.content==="text");
  const literalSource=firstText?textArtworkSVG(firstText.text||design.text,firstText.ink||design.ink,1024,1024*firstText.heightCm/firstText.widthCm):"";
  const email = document ? { subject: document.emailSubject, body: document.emailBody } : emailTemplate(supplier, design, order, filename);

  async function exportDocument() {
    setError(""); setMessage("");
    if (supplier.format === "email") {
      downloadText(`seongbuk-fit-${supplier.id}-email.txt`, `받는 업체: ${supplier.name} (가상 업체)\n제목: ${email.subject}\n\n${email.body}`);
      setMessage("이메일 제목과 본문을 내려받았어요. 원본 도안은 아래에서 따로 내려받으세요."); return;
    }
    setBusy(true);
    try {
      const patternPNGs = document?.production ? await patterns.current?.pngs() : undefined;
      if (document?.production && !patternPNGs) throw new Error("고객 UV와 봉제 패턴이 준비된 뒤 다시 내려받아주세요.");
      await exportProductionPDF({ supplier, design: textOnly?{...design,image:null}:design, order, artworkSVG: textOnly?literalSource:artwork.current ? new XMLSerializer().serializeToString(artwork.current) : textArtworkSVG(design.text,design.ink), document, patternPNGs });
      setMessage(`${supplier.name} 양식의 PDF 도안서를 내려받았어요.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "PDF를 만들지 못했어요. 다시 시도해주세요."); }
    finally { setBusy(false); }
  }
  function downloadArtwork() {
    if(textOnly){downloadTexts();return;}
    if (design.image) downloadURL("seongbuk-fit-artwork.png", design.image);
    else if (artwork.current) downloadText("seongbuk-fit-artwork.svg", new XMLSerializer().serializeToString(artwork.current), "image/svg+xml;charset=utf-8");
  }
  function downloadTexts(){for(const p of design.placements||[])if(p.content==="text")downloadText(`seongbuk-fit-${p.id}.svg`,textArtworkSVG(p.text||design.text,p.ink||design.ink,1024,1024*p.heightCm/p.widthCm),"image/svg+xml;charset=utf-8");}
  async function copyEmail() {
    try { await navigator.clipboard.writeText(`제목: ${email.subject}\n\n${email.body}`); setMessage("이메일 제목과 본문을 복사했어요."); }
    catch { setError("복사하지 못했어요. 이메일 양식 내려받기를 이용해주세요."); }
  }
  return <section className="panel production-document" data-format={supplier.format} data-supplier={supplier.id} aria-label="업체별 맞춤 제작자료">
    <div className="document-heading"><span className={`format-badge ${supplier.format}`}>{supplier.format === "pdf" ? <FileText size={14} /> : <Mail size={14} />}{supplier.format === "pdf" ? "PDF 도안서" : "이메일 양식"}</span><h2>{supplier.documentTitle}</h2><p>{document?.production?.converter === "sample" ? "유료 AI 호출 없이 확인하는 업체 도안 변환 목업이에요." : document ? "AI가 고객 UV를 업체 도안 양식에 맞춰 변환한 초안이에요." : "현재 업체 정보로 구성한 제작자료 미리보기예요."}</p></div>
    {document?.production && <PatternComparison packet={document.production} design={design} exportRef={patterns}/>}
    {document && <div className="document-checklist"><h3>{document.production?.converter === "sample" ? "목업 변환 설명" : "AI 제작 설명"}</h3><p>{document.summary}</p><ul>{document.productionNotes.map((note, index) => <li key={index}><Check size={13} />{note}</li>)}</ul><h3>제작 전 확인할 사항</h3><ul>{document.checks.map((note, index) => <li key={index}>{note}</li>)}</ul></div>}
    <div className="document-artifacts" style={{ gridTemplateColumns: "minmax(0,1fr)" }}><div><h3>{textOnly?"인쇄 문구 원본":"인쇄 도안 원본"}</h3><div className="document-art" style={{ backgroundColor: design.color }}>{textOnly ? <Image src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(literalSource)}`} width={800} height={800} alt={firstText?.text||design.text} unoptimized className="artwork-image"/> : design.image ? <Image src={design.image} width={800} height={800} alt={filename || "선택 도안"} unoptimized className="artwork-image" /> : <Artwork design={design} exportRef={artwork} />}</div>{textOnly&&<p>각 배치의 문구 원본은 문구 SVG로 모두 내려받을 수 있어요.</p>}</div></div>
    <details className="flow-disclosure production-specs" open={expandSpecs}><summary>주문 정보와 업체 규격 확인</summary>
    {supplier.format === "email" ? <div className="email-document"><div className="email-subject"><span>받는 업체</span><strong>{supplier.name} <small>실제 이메일 주소 등록 전</small></strong></div><div className="email-subject"><span>제목</span><strong>{email.subject}</strong></div><pre>{email.body}</pre></div> : <dl className="document-rows">{orderRows(supplier, design, order).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}<div><dt>추가 요청</dt><dd>{order.memo.trim() || "없음"}</dd></div></dl>}
    <div className="document-checklist"><strong>함께 전달할 자료</strong><p>{supplier.attachmentTypes.join(" · ")}</p><ul>{supplier.requirements.map((item) => <li key={item}><Check size={13} />{item}</li>)}</ul><p>인쇄 영역은 최대 {supplier.maxPrintWidthCm} × {supplier.maxPrintHeightCm}cm예요. 첨부 이미지는 최대 800px의 편집용 파일로, 실제 인쇄용 해상도 검수는 별도예요.</p></div>
    </details>
    <details className="flow-disclosure document-file-options"><summary>제작자료 다운로드</summary><div className="document-downloads"><button className="outline" onClick={downloadArtwork}><Download size={14} />원본 도안</button>{design.placements?.some(p=>p.content==="text")&&<button className="outline" onClick={downloadTexts}>문구 SVG</button>}{design.fabricImage&&<button className="outline" onClick={()=>downloadURL("seongbuk-fit-fabric.png",design.fabricImage!)}>원단 무늬 PNG</button>}<button className="outline" onClick={exportDocument} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}{busy ? "PDF 준비 중…" : supplier.format === "pdf" ? "업체 맞춤 PDF 내려받기" : "이메일 양식 내려받기"}</button>{supplier.format === "email" && <button className="outline" onClick={copyEmail}><Copy size={15} />제목·본문 복사</button>}</div></details>
    <div className="document-feedback" aria-live="polite">{error && <p className="error" role="alert">{error}</p>}{message && <p className="success"><Check size={14} />{message}</p>}</div>
  </section>;
}
