"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, Check, ImagePlus, LoaderCircle, Plus, Save, Sparkles, X } from "lucide-react";
import { COLORS, defaultClubPlacements, isDesign, mockDesign, type Design } from "@/lib/design";
import { useDesignSession } from "@/lib/design-session";
import { saveLibraryItem } from "@/lib/library";
import { aiRequest, useAIAvailability } from "@/lib/backend-client";
import { totalQuantity } from "@/lib/quote";
import { estimate, won } from "@/lib/order-workflow";
import { SUPPLIERS } from "@/lib/suppliers";
import { resetOrderDetails, useOrderDetails } from "@/lib/order-workflow-client";
import { DesignThumbnail } from "@/components/quote/DesignSummary";
import FlowSteps from "@/components/layout/FlowSteps";
import DesignSettings from "./DesignSettings";
import type { CanvasHandle } from "./DesignCanvas";

const Canvas = dynamic(() => import("./GarmentPreview3D"), { ssr: false, loading: () => <div className="canvas-loading"><LoaderCircle className="animate-spin" size={24} /><span>미리보기를 준비하고 있어요</span></div> });
const ClothSimulation = dynamic(() => import("./ClothSimulationPreview"), { ssr: false });

export default function DesignStudio() {
  const aiEnabled = useAIAvailability();
  const { design, setDesign, prompt, setPrompt, filename, setFilename, messages, setMessages, resetSession, hasResult, setHasResult, order } = useDesignSession();
  const { update: updateDetails } = useOrderDetails();
  const variant = design.style === "type" ? 1 : design.style === "wave" ? 2 : 0;
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState<"design" | "simulation">("design");
  const [simulationStatus, setSimulationStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const requestActive = useRef(false);
  const saveActive = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const promptInput = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const canvas = useRef<CanvasHandle>(null);
  const patch = (value: Partial<Design>) => { setDesign((current) => ({ ...current, ...value })); setMessage(""); updateDetails({ confirmed: false }); };
  const lastPrompt = [...messages].reverse().find((item) => item.role === "user")?.text || prompt;

  useEffect(() => { if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight; }, [messages, generating]);
  useEffect(() => { if (promptInput.current) { promptInput.current.style.height = "auto"; promptInput.current.style.height = `${Math.min(126, promptInput.current.scrollHeight)}px`; } }, [prompt]);
  useEffect(() => {
    if (showResult && window.matchMedia("(max-width: 640px)").matches) {
      document.querySelector(".ai-stage")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }, [showResult]);

  async function generate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (aiEnabled !== true) { setError("AI 생성이 현재 비활성화돼 있어요."); return; }
    if (requestActive.current || uploading) return;
    const instruction = prompt.trim();
    if (!instruction) { setError("원하는 디자인을 한 문장으로 입력해주세요."); promptInput.current?.focus(); return; }
    requestActive.current = true; setError(""); setMessage(""); setGenerating(true); setShowResult(false);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: instruction }]); setPrompt("");
    try {
      const result = await aiRequest("/api/designs/generate", { prompt: instruction, currentDesign: design }, crypto.randomUUID());
      if (!isDesign(result.design)) throw new Error("생성 결과를 확인할 수 없어요. 다시 요청해주세요.");
      setDesign(result.design);
      updateDetails({ confirmed: false });
      setHasResult(true);
      setShowResult(true);
      setFilename(result.design.image ? "AI 디자인.png" : "");
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text: result.reply || "요청한 디자인을 반영했어요. 더 바꾸고 싶은 부분을 말해주세요." }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "연결을 확인하고 다시 시도해주세요.");
      setPrompt(instruction);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text: "이번 요청을 완료하지 못했어요. 입력한 내용은 다시 보낼 수 있도록 남겨뒀어요." }]);
    } finally { requestActive.current = false; setGenerating(false); }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || generating || uploading) return;
    setError(""); setMessage("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("PNG, JPG, WEBP 이미지를 선택해주세요."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("8MB 이하 이미지를 선택해주세요."); return; }
    setUploading(true); const url = URL.createObjectURL(file);
    try {
      const image = new window.Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("이미지를 읽지 못했어요.")); image.src = url; });
      if (image.width > 8000 || image.height > 8000) throw new Error("가로·세로 8,000px 이하 이미지를 선택해주세요.");
      const bitmap = document.createElement("canvas");
      let ratio = Math.min(1, 800 / Math.max(image.width, image.height)); let data = "";
      do {
        bitmap.width = Math.max(1, Math.round(image.width * ratio)); bitmap.height = Math.max(1, Math.round(image.height * ratio));
        const context = bitmap.getContext("2d"); if (!context) throw new Error("이미지 미리보기를 준비할 수 없어요.");
        context.drawImage(image, 0, 0, bitmap.width, bitmap.height); data = bitmap.toDataURL("image/png"); ratio *= .8;
      } while (data.length > 3_000_000);
      patch({ image: data }); setFilename(file.name); setMessage("이미지를 첨부했어요. AI에게 배치와 분위기를 요청해보세요.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "이미지를 적용하지 못했어요."); }
    finally { URL.revokeObjectURL(url); setUploading(false); }
  }

  async function save() {
    if (saveActive.current || generating || uploading) return;
    saveActive.current = true; setSaving(true); setError(""); setMessage("");
    try {
      const preview = canvas.current?.previewPNG();
      if (!preview) throw new Error("미리보기가 준비된 뒤 다시 저장해주세요.");
      await saveLibraryItem({ kind: "design", design, prompt: lastPrompt, filename, title: design.text || filename || "우리 단체티", preview });
      setMessage("디자인을 저장했어요.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "저장하지 못했어요."); }
    finally { saveActive.current = false; setSaving(false); }
  }
  function newDesign() { if (!generating && !uploading && !saving) { resetSession(); resetOrderDetails(); setMessage(""); setError(""); } }

  const busy = generating || uploading || saving;
  function variantDesign(index: number): Design {
    const [chest, back] = defaultClubPlacements();
    const placements = index === 0 ? [chest] : index === 1 ? [{ ...back, id: "front-main", side: "front" as const, widthCm: 18, heightCm: 18 }] : [chest, back];
    return { ...design, style: (["campus", "type", "wave"] as const)[index], placements, side: "front" };
  }
  function sample() {
    setDesign(current => ({ ...current, ...mockDesign(prompt || '문구는 "OUR CLUB"', current) }));
    setHasResult(true); setShowResult(true); updateDetails({ confirmed: false }); setError("");
    setMessage("예시 디자인을 적용했어요. 아래 시안을 선택하고 색상과 배치를 바꿔보세요.");
  }
  const price = estimate(SUPPLIERS[0], order);
  return <main id="main-content" className="wf-page wf-studio"><FlowSteps current={1} />
    <h1 className="sr-only">디자인 스튜디오</h1>
    <div className="wf-studio-grid">
      <section className="wf-studio-input" aria-label="디자인 입력">
        <div className="wf-input-top"><h2>의류 선택</h2><button className="wf-icon" aria-label="새 디자인" onClick={newDesign} disabled={busy}><Plus size={17}/></button></div>
        <div className="wf-garments">{["과잠","후드","맨투맨","반팔","바람막이","패딩"].map(label => <button key={label} type="button" disabled={label !== "반팔" || busy} aria-pressed={label === "반팔"} title={label !== "반팔" ? "지원 준비 중" : "스탠다드 반팔"}>{label}</button>)}</div>
        <p className="wf-muted">현재 반팔 디자인을 지원해요.</p>
        <h2>로고 / 참고 이미지</h2>
        <button className="wf-upload" onClick={() => fileInput.current?.click()} disabled={busy}>{design.image ? <Image src={design.image} width={64} height={64} alt="첨부한 로고" unoptimized/> : <ImagePlus size={26}/>}<span>{uploading ? "이미지 준비 중…" : filename || "모임 로고 · 참고 이미지"}</span></button>
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="참고 이미지 선택" onChange={upload}/>
        <div className="wf-upload-note"><span>PNG · JPG · WEBP / 최대 8MB</span>{design.image && <button className="text-link" disabled={busy} onClick={() => { patch({ image: null }); setFilename(""); }}><X size={13}/>삭제</button>}</div>
        <form onSubmit={generate} className="wf-prompt-form"><label htmlFor="prompt">원하는 느낌을 한 문장으로</label><textarea ref={promptInput} id="prompt" rows={5} maxLength={300} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={'초록색 단체티에 우리 모임 로고를 넣고, 등판에는 모임 이름을 크게'} disabled={busy}/>
          <div className="wf-prompt-hints">{["클래식","미니멀","스트리트"].map(word => <button type="button" key={word} disabled={busy} onClick={() => setPrompt(current => (current + " " + word + " 느낌으로").trim().slice(0,300))}>{word}</button>)}</div>
          <button className="wf-dark-button wide" type="submit" disabled={busy || aiEnabled !== true}>{generating ? <LoaderCircle className="animate-spin" size={16}/> : <Sparkles size={16}/>} {generating ? "시안을 만들고 있어요…" : "AI 시안 만들기"}</button>
          {aiEnabled === false && <p className="wf-muted">AI 생성이 꺼져 있어요. 예시 시안으로 체험할 수 있어요.</p>}
          <button type="button" className="outline wide" onClick={sample} disabled={busy}>예시 시안으로 시작</button>
        </form>
        <DesignSettings design={design} onChange={patch} disabled={busy}/>
        {messages.length > 0 && <details className="wf-chat-history"><summary>AI 대화 내역</summary><div ref={conversation} role="log" aria-label="AI 디자인 대화">{messages.map(item => <p key={item.id}><strong>{item.role === "user" ? "나" : "AI"}</strong>{item.text}</p>)}</div></details>}
      </section>
      <section className="wf-studio-preview ai-stage" aria-label="디자인 미리보기">
        <div className="wf-preview-toolbar"><div className="wf-segments" role="group" aria-label="인쇄 면"><button aria-pressed={design.side === "front"} onClick={() => patch({ side: "front" })} disabled={busy}>앞면</button><button aria-pressed={design.side === "back"} onClick={() => patch({ side: "back" })} disabled={busy}>뒷면</button></div><button className="text-link" onClick={save} disabled={busy || !(hasResult || design.image)}><Save size={15}/>{saving ? "저장 중…" : "저장"}</button></div>
        <div className="studio-preview-modes wf-segments" role="group" aria-label="미리보기 방식"><button type="button" aria-pressed={previewMode === "design"} onClick={() => setPreviewMode("design")}>디자인 미리보기</button><button type="button" aria-pressed={previewMode === "simulation"} onClick={() => { if (previewMode !== "simulation") setSimulationStatus("loading"); setPreviewMode("simulation"); }}>의상 시뮬레이션</button></div>
        <div className="wf-stage" data-preview-mode={previewMode}>
          <div style={{ visibility: previewMode === "simulation" && simulationStatus === "ready" ? "hidden" : "visible" }}><Canvas design={design} exportRef={canvas} showArtwork={hasResult || !!design.image}/></div>
          {previewMode === "simulation" && <ClothSimulation clothRepresentText={design.text} ready={simulationStatus === "ready"} onReady={() => setSimulationStatus("ready")} onUnavailable={() => setSimulationStatus("unavailable")} />}
          {generating && <div className="generation-overlay" role="status"><LoaderCircle className="animate-spin" size={28}/><strong>디자인을 반영하고 있어요</strong></div>}
        </div>
        {previewMode === "simulation" && <div className="studio-simulation-controls">
          {/* 삭제금지: ClothSim clothRepresentText 입력 — 디자인 초안과 함께 보관. */}
          <label htmlFor="cloth-represent-text">옷에 넣을 문구</label><input id="cloth-represent-text" className="form-input" type="text" maxLength={36} value={design.text} placeholder="예: OUR CLUB" onChange={event => patch({ text: event.target.value })} disabled={busy} />
          {simulationStatus !== "ready" && <p className="wf-muted" role="status">{simulationStatus === "loading" ? "의상 시뮬레이션을 불러오고 있어요." : "의상 시뮬레이션을 준비 중이에요. 현재는 디자인 미리보기를 표시합니다."}</p>}
        </div>}
        <div className="wf-colors" role="group" aria-label="의류 색상">{COLORS.map(color => <button key={color.hex} style={{ backgroundColor: color.hex }} aria-label={color.name} aria-pressed={design.color === color.hex} onClick={() => patch({ color: color.hex })} disabled={busy}/>)}</div>
        <div className="wf-variants" role="group" aria-label="시안 배치 선택">{["A 클래식","B 미니멀","C 스트리트"].map((label,index) => <button key={label} aria-pressed={variant === index && hasResult} disabled={busy} onClick={() => { patch(variantDesign(index)); setHasResult(true); }}><DesignThumbnail design={variantDesign(index)}/><span><strong>{label}</strong><small>{index === variant && hasResult ? "적용 중" : ["가슴 로고","앞면 중앙","가슴 + 등판"][index]}</small></span></button>)}</div>
        <p className="wf-muted wf-variant-note">시안 카드는 같은 디자인의 스타일·배치 예시예요.</p>
      </section>
      <aside className="wf-studio-summary"><h2>이 디자인, 얼마에 만들 수 있을까?</h2><section className="wf-price"><div><span>예상 단가 · 1벌</span><span>수량 <b>{totalQuantity(order)}벌</b></span></div><strong>{won(price.unit)} ~ {won(price.unit + 5000)}</strong><p>수량·제작 방식에 따라 달라지는 시연용 예상 금액</p><dl><div><dt>비교할 수 있는 예시 업체</dt><dd>{SUPPLIERS.length}곳</dd></div><div><dt>예상 제작 기간</dt><dd>7–14일</dd></div></dl></section><div className="wf-trust-note"><Check size={16}/><span>주문서와 도안을 한 번에 확인해요</span></div><div className="wf-studio-next">{hasResult || design.image ? <Link id="design-next" className="primary wide" href="/quotes/new" aria-disabled={busy} onClick={e => { if (busy) e.preventDefault(); }}>주문서와 도안 확인하기 <ArrowRight size={16}/></Link> : <button className="primary wide" disabled>시안을 먼저 선택해주세요</button>}<p className="wf-muted">명단 · 납기 · 수령 정보를 다음 화면에서 입력해요.</p><Link href="/my" className="text-link">저장한 디자인 보기</Link></div></aside>
    </div>
    <div className="wf-feedback" aria-live="polite">{error && <p className="wf-alert" role="alert">{error}</p>}{message && <p className="wf-success"><Check size={16}/>{message}</p>}</div>
  </main>;
}
