"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, ArrowUp, Check, ImagePlus, LoaderCircle, Plus, Save, Sparkles, X } from "lucide-react";
import { GARMENTS, garmentName, isDesign, type Design } from "@/lib/design";
import { useDesignSession } from "@/lib/design-session";
import { saveLibraryItem } from "@/lib/library";
import FlowSteps from "@/components/layout/FlowSteps";
import type { CanvasHandle } from "./DesignCanvas";

const Canvas = dynamic(() => import("./GarmentPreview3D"), { ssr: false, loading: () => <div className="canvas-loading"><LoaderCircle className="animate-spin" size={24} /><span>미리보기를 준비하고 있어요</span></div> });

export default function DesignStudio() {
  const { design, setDesign, prompt, setPrompt, filename, setFilename, messages, setMessages, resetSession, hasResult, setHasResult } = useDesignSession();
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const requestActive = useRef(false);
  const saveActive = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const promptInput = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const canvas = useRef<CanvasHandle>(null);
  const patch = (value: Partial<Design>) => { setDesign((current) => ({ ...current, ...value })); setMessage(""); };
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
    if (requestActive.current || uploading) return;
    const instruction = prompt.trim();
    if (!instruction) { setError("원하는 디자인을 한 문장으로 입력해주세요."); promptInput.current?.focus(); return; }
    requestActive.current = true; setError(""); setMessage(""); setGenerating(true); setShowResult(false);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: instruction }]); setPrompt("");
    try {
      const response = await fetch("/api/designs/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: instruction, currentDesign: design }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "디자인을 준비하지 못했어요.");
      if (!isDesign(result.design)) throw new Error("생성 결과를 확인할 수 없어요. 다시 요청해주세요.");
      setDesign(result.design);
      setHasResult(true);
      setShowResult(true);
      if (!result.design.image) setFilename("");
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
      await saveLibraryItem({ kind: "design", design, prompt: lastPrompt, filename, title: design.text || filename || "우리 반티", preview });
      setMessage("디자인을 저장했어요.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "저장하지 못했어요."); }
    finally { saveActive.current = false; setSaving(false); }
  }
  function newDesign() { if (!generating && !uploading && !saving) { resetSession(); setMessage(""); setError(""); } }

  return <main id="main-content" className="shell ai-studio">
    <FlowSteps current={1} />
    <div className="ai-studio-heading"><div><h1>어떤 반티를 만들까요?</h1><p>떠오른 아이디어를 말하면, 디자인이 시작돼요.</p></div><button className="outline" onClick={newDesign} disabled={generating || uploading || saving}><Plus size={16} />새로 만들기</button></div>
    <div className="creation-layout">
      <section className="panel stage ai-stage" aria-label="디자인 미리보기"><div className="stage-head"><strong>{garmentName(design)}</strong><span className="preview-mode">3D 미리보기</span></div><div className="scene"><Canvas design={design} exportRef={canvas} showArtwork={hasResult || !!design.image} />{generating && <div className="generation-overlay" role="status"><LoaderCircle className="animate-spin" size={28} /><strong>디자인을 반영하고 있어요</strong></div>}</div><div className="ai-stage-actions">{hasResult || design.image ? <><button className="outline" onClick={save} disabled={saving || generating || uploading}><Save size={16} />{saving ? "저장 중…" : "디자인 저장"}</button>{generating || uploading ? <button className="primary" disabled>디자인 생성 중…</button> : <Link id="design-next" className="primary" href="/suppliers">업체 선택하기<ArrowRight size={16} /></Link>}</> : <p>완성한 디자인이 여기에 보여요.</p>}</div></section>
      <section className="creation-chat" aria-label="디자인 생성">
        <div className="garment-picker" role="group" aria-label="의류 종류">{GARMENTS.map(item => <button key={item.id} aria-pressed={item.id === (design.garment || "tee")} className={item.id === (design.garment || "tee") ? "active" : ""} onClick={() => patch({ garment: item.id })} disabled={generating || uploading}>{item.label}</button>)}</div>
        <div ref={conversation} className="ai-conversation" role="log" aria-label="AI 디자인 대화" aria-live="polite">{!messages.length ? <div className="prompt-welcome"><Sparkles size={28} /><h2>우리 팀의 느낌을<br />한 문장으로.</h2><p>색상, 문구, 분위기를 자유롭게 적어주세요.</p><div className="prompt-examples">{["네이비 반팔에 CAMPUS CLUB 배지를 넣어줘", "그린 후드에 파도 느낌의 크루 로고를 그려줘"].map(text => <button key={text} onClick={() => { setPrompt(text); promptInput.current?.focus(); }}>{text}<ArrowUp size={15} /></button>)}</div></div> : messages.map(item => <div key={item.id} className={`chat-message ${item.role}`}><span className="chat-avatar">{item.role === "assistant" ? <Sparkles size={15} /> : "나"}</span><p>{item.text}</p></div>)}{generating && <p className="generating-note"><LoaderCircle className="animate-spin" size={16} />디자인을 만들고 있어요…</p>}</div>
        {design.image && <div className="reference-attachment"><Image src={design.image} width={40} height={40} alt="첨부 이미지" unoptimized /><span>{filename}</span><button className="icon-button" aria-label="첨부 이미지 삭제" disabled={generating || uploading} onClick={() => { patch({ image: null }); setFilename(""); }}><X size={16} /></button></div>}
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="참고 이미지 선택" onChange={upload} />
        <form className="ai-composer" onSubmit={generate}><label htmlFor="prompt" className="sr-only">원하는 디자인</label><textarea ref={promptInput} id="prompt" rows={2} maxLength={300} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder={hasResult ? "바꾸고 싶은 부분을 말해주세요…" : "예: 화이트 반팔에 우리 동아리 이름을 크게…"} disabled={generating} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void generate(); } }} /><div className="composer-bottom"><button type="button" className="composer-attach" onClick={() => fileInput.current?.click()} disabled={generating || uploading}><ImagePlus size={18} />{uploading ? "첨부 중…" : "이미지 첨부"}</button><button type="submit" className="composer-send" aria-label="디자인 생성" disabled={generating || uploading || !prompt.trim()}>{generating ? <LoaderCircle className="animate-spin" size={20} /> : <ArrowUp size={20} />}</button></div></form>
        <p className="creation-note">예시 생성 모드 · Enter로 생성, Shift+Enter로 줄바꿈</p>
      </section>

    </div>
    <div className="ai-feedback" aria-live="polite">{error && <p className="error" role="alert">{error}</p>}{message && <p className="success"><Check size={15} />{message}<Link href="/my">저장한 디자인 보기</Link></p>}</div>
  </main>;
}
