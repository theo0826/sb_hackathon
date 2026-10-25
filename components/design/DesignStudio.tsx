"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, Check, ImagePlus, LoaderCircle, Plus, Save, Sparkles, X } from "lucide-react";
import { isDesign, mockDesign, type Design } from "@/lib/design";
import { useDesignSession } from "@/lib/design-session";
import { saveLibraryItem } from "@/lib/library";
import { generateAIDesign } from "@/lib/ai-client";
import { totalQuantity } from "@/lib/quote";
import { estimate, won } from "@/lib/order-workflow";
import { SUPPLIERS } from "@/lib/suppliers";
import { GARMENT_PRICING, pricingGarment } from "@/lib/garment-pricing";
import { resetOrderDetails, useOrderDetails } from "@/lib/order-workflow-client";
import FlowSteps from "@/components/layout/FlowSteps";
import type { ClothSimulationControls } from "./ClothSimulationPreview";

const ClothSimulation = dynamic(() => import("./ClothSimulationPreview"), { ssr: false });

export default function DesignStudio() {
  const { design, setDesign, prompt, setPrompt, filename, setFilename, messages, setMessages, resetSession, hasResult, setHasResult, order, setOrder } = useDesignSession();
  const { update: updateDetails } = useOrderDetails();
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewVersion, setPreviewVersion] = useState(0);
  const requestActive = useRef(false);
  const generationId = useRef(0);
  const generationAbort = useRef<AbortController | null>(null);
  const simulation = useRef<ClothSimulationControls>(null);
  const saveActive = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const promptInput = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const patch = (value: Partial<Design>) => { setDesign((current) => ({ ...current, ...value })); setMessage(""); updateDetails({ confirmed: false }); };
  const lastPrompt = [...messages].reverse().find((item) => item.role === "user")?.text || prompt;

  useEffect(() => { if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight; }, [messages, generating]);
  useEffect(() => { if (promptInput.current) { promptInput.current.style.height = "auto"; promptInput.current.style.height = `${Math.min(126, promptInput.current.scrollHeight)}px`; } }, [prompt]);
  useEffect(() => {
    if (showResult && window.matchMedia("(max-width: 640px)").matches) {
      document.querySelector(".ai-stage")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }, [showResult]);

  useEffect(() => () => { generationId.current++; generationAbort.current?.abort(); }, []);

  async function generate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (requestActive.current || uploading || saving) return;
    const instruction = prompt.trim();
    if (!instruction) { setError("원하는 의상을 한 문장으로 입력해주세요."); promptInput.current?.focus(); return; }
    if (!simulation.current) { setError("미리보기를 준비하고 있어요. 잠시 후 다시 눌러주세요."); return; }
    const id = ++generationId.current;
    const controller = new AbortController(); generationAbort.current = controller;
    requestActive.current = true; setError(""); setMessage(""); setGenerating(true); setShowResult(false);
    setMessages(current => [...current, { id: crypto.randomUUID(), role: "user", text: instruction }]);
    try {
      const [garment, artwork] = await Promise.allSettled([
        simulation.current.generate(instruction),
        process.env.NEXT_PUBLIC_AI_DESIGN_URL?.trim()
          ? generateAIDesign({ prompt: instruction, currentDesign: design }, crypto.randomUUID(), controller.signal)
          : Promise.resolve(null),
      ]);
      if (id !== generationId.current) return;
      const garmentReady = garment.status === "fulfilled" && garment.value;
      let reply = garmentReady ? "설명한 의상을 디자인 미리보기에 반영했어요." : "";
      if (artwork.status === "fulfilled" && artwork.value) {
        if (!isDesign(artwork.value.design)) throw new Error("생성 결과를 확인할 수 없어요. 다시 요청해주세요.");
        setDesign(artwork.value.design); updateDetails({ confirmed: false }); setHasResult(true);
        setFilename(artwork.value.design.image ? "AI 디자인.png" : "");
        reply = artwork.value.reply || "요청한 디자인을 반영했어요.";
      } else if (artwork.status === "rejected") {
        if (!garmentReady) throw artwork.reason;
        setError(artwork.reason instanceof Error ? artwork.reason.message : "인쇄 시안 서버 연결을 확인해주세요.");
      }
      if (!reply) throw new Error("의상을 만들지 못했어요. 생성 연결을 확인하고 다시 시도해주세요.");
      setShowResult(true); setMessage(reply);
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", text: reply }]);
    } catch (cause) {
      if (id !== generationId.current) return;
      setError(cause instanceof Error ? cause.message : "연결을 확인하고 다시 시도해주세요.");
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", text: "이번 요청을 완료하지 못했어요. 설명을 바꾸거나 다시 시도해주세요." }]);
    } finally {
      if (id === generationId.current) { requestActive.current = false; generationAbort.current = null; setGenerating(false); }
    }
  }

  function cancelGeneration() {
    generationId.current++; generationAbort.current?.abort(); generationAbort.current = null;
    simulation.current?.cancel(); requestActive.current = false; setGenerating(false);
    setMessage("생성을 취소했어요. 입력한 설명은 그대로 남겨뒀어요.");
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
      await saveLibraryItem({ kind: "design", design, prompt: lastPrompt, filename, title: design.text || filename || "우리 단체티" });
      setMessage("디자인을 저장했어요.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "저장하지 못했어요."); }
    finally { saveActive.current = false; setSaving(false); }
  }
  function newDesign() { if (!generating && !uploading && !saving) { resetSession(); resetOrderDetails(); setPreviewVersion(current => current + 1); setMessage(""); setError(""); } }

  const busy = generating || uploading || saving;
  function sample() {
    setDesign(current => ({ ...current, ...mockDesign(prompt || '문구는 "OUR CLUB"', current) }));
    setHasResult(true); setShowResult(true); updateDetails({ confirmed: false }); setError("");
    setMessage("예시 디자인을 적용했어요. 주문서와 도안을 확인할 수 있어요.");
  }
  const price = estimate(SUPPLIERS[0], order);
  const selectedGarment = pricingGarment(order.pricingGarment);
  return <main id="main-content" className="wf-page wf-studio"><FlowSteps current={1} />
    <h1 className="sr-only">디자인 스튜디오</h1>
    <div className="wf-studio-grid">
      <section className="wf-studio-input" aria-label="디자인 입력">
        <div className="studio-garment-pricing">
          <h2 id="pricing-garment-label">의류 종류</h2>
          <div className="wf-garments" role="group" aria-labelledby="pricing-garment-label">
            {GARMENT_PRICING.map(item => <button type="button" key={item.id} aria-pressed={selectedGarment.id === item.id} disabled={busy} onClick={() => { setOrder(current => ({ ...current, pricingGarment: item.id })); updateDetails({ confirmed: false }); }}>{item.label}</button>)}
          </div>
          <p className="wf-muted">예상 가격을 비교할 의류를 선택해주세요.</p>
        </div>
        <div className="wf-input-top"><h2>로고 / 참고 이미지</h2><button className="wf-icon" aria-label="새 디자인" onClick={newDesign} disabled={busy}><Plus size={17}/></button></div>
        <button className="wf-upload" onClick={() => fileInput.current?.click()} disabled={busy}>{design.image ? <Image src={design.image} width={64} height={64} alt="첨부한 로고" unoptimized/> : <ImagePlus size={26}/>}<span>{uploading ? "이미지 준비 중…" : filename || "모임 로고 · 참고 이미지"}</span></button>
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="참고 이미지 선택" onChange={upload}/>
        <div className="wf-upload-note"><span>PNG · JPG · WEBP / 최대 8MB</span>{design.image && <button className="text-link" disabled={busy} onClick={() => { patch({ image: null }); setFilename(""); }}><X size={13}/>삭제</button>}</div>
        <form onSubmit={generate} className="wf-prompt-form"><label htmlFor="prompt">원하는 느낌을 한 문장으로</label><textarea ref={promptInput} id="prompt" rows={5} maxLength={300} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={'초록색 오버핏 후드티에 캥거루 주머니를 넣어줘'} disabled={busy}/>
          <div className="wf-prompt-hints">{["클래식","미니멀","스트리트"].map(word => <button type="button" key={word} disabled={busy} onClick={() => setPrompt(current => (current + " " + word + " 느낌으로").trim().slice(0,300))}>{word}</button>)}</div>
          <button className="wf-dark-button wide" type="submit" disabled={busy}>{generating ? <LoaderCircle className="animate-spin" size={16}/> : <Sparkles size={16}/>} {generating ? "시안을 만들고 있어요…" : "AI 시안 만들기"}</button>
          {generating && <button type="button" className="outline wide" onClick={cancelGeneration}>생성 취소</button>}
          <button type="button" className="outline wide" onClick={sample} disabled={busy}>예시 시안으로 시작</button>
        </form>
        {messages.length > 0 && <details className="wf-chat-history"><summary>AI 대화 내역</summary><div ref={conversation} role="log" aria-label="AI 디자인 대화">{messages.map(item => <p key={item.id}><strong>{item.role === "user" ? "나" : "AI"}</strong>{item.text}</p>)}</div></details>}
      </section>
      <section className="wf-studio-preview ai-stage" aria-label="디자인 미리보기">
        <div className="wf-preview-toolbar"><div className="wf-segments" role="group" aria-label="인쇄 면"><button aria-pressed={design.side === "front"} onClick={() => patch({ side: "front" })} disabled={busy}>앞면</button><button aria-pressed={design.side === "back"} onClick={() => patch({ side: "back" })} disabled={busy}>뒷면</button></div><button className="text-link" onClick={save} disabled={busy || !(hasResult || design.image)}><Save size={15}/>{saving ? "저장 중…" : "저장"}</button></div>
        <h2 className="studio-preview-heading">디자인 미리보기</h2>
        <ClothSimulation key={previewVersion} controllerRef={simulation}/>
      </section>
      <aside className="wf-studio-summary"><h2>이 디자인, 얼마에 만들 수 있을까?</h2><section className="wf-price"><div><span>예상 단가 · 1벌</span><span>수량 <b>{totalQuantity(order)}벌</b></span></div><strong aria-live="polite" aria-atomic="true">{won(price.unit)} ~ {won(price.unit + 5000)}</strong><p>의류·수량·제작 방식에 따른 시연용 예상 금액</p><dl><div><dt>선택 의류</dt><dd>{selectedGarment.label}</dd></div><div><dt>비교할 수 있는 예시 업체</dt><dd>{SUPPLIERS.length}곳</dd></div><div><dt>예상 제작 기간</dt><dd>7–14일</dd></div></dl></section><div className="wf-trust-note"><Check size={16}/><span>주문서와 도안을 한 번에 확인해요</span></div><div className="wf-studio-next">{hasResult || design.image ? <Link id="design-next" className="primary wide" href="/quotes/new" aria-disabled={busy} onClick={e => { if (busy) e.preventDefault(); }}>주문서와 도안 확인하기 <ArrowRight size={16}/></Link> : <button className="primary wide" disabled>시안을 먼저 선택해주세요</button>}<p className="wf-muted">명단 · 납기 · 수령 정보를 다음 화면에서 입력해요.</p><Link href="/my" className="text-link">저장한 디자인 보기</Link></div></aside>
    </div>
    <div className="wf-feedback" aria-live="polite">{error && <p className="wf-alert" role="alert">{error}</p>}{message && <p className="wf-success"><Check size={16}/>{message}</p>}</div>
  </main>;
}
