"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, ArrowUp, Check, ChevronDown, ImagePlus, LoaderCircle, PenLine, Plus, Save, UserRound, X } from "lucide-react";
import { isDesign, type Design } from "@/lib/design";
import { useDesignSession } from "@/lib/design-session";
import { getLibraryItem, saveLibraryItem } from "@/lib/library";
import { getClothScene, restoreClothScene, savedClothDesign, setClothScene, snapshotClothDesign } from "@/lib/cloth-scene-session";
import { generateAIDesign } from "@/lib/ai-client";
import { totalQuantity } from "@/lib/quote";
import { estimate, won } from "@/lib/order-workflow";
import { SUPPLIERS } from "@/lib/suppliers";
import { GARMENT_PRICING, pricingGarment } from "@/lib/garment-pricing";
import { resetOrderDetails, useOrderDetails } from "@/lib/order-workflow-client";
import { clearClothData, subscribeClothData, updateClothData, useClothData } from "@/components/ClothSim/clothdata/store";
import { readyClothCapture } from "@/lib/cloth-capture";
import type { ClothSimulationControls } from "./ClothSimulationPreview";
import GarmentOutline from "./GarmentOutline";
import type { Scene } from "../ClothSim";

const ClothSimulation = dynamic(() => import("./ClothSimulationPreview"), { ssr: false });
const PatternThumbnail = dynamic(() => import("../ClothSim").then(module => module.ClothPatternEditor), { ssr: false });
const EXAMPLES = [
  "네이비 반팔 등판에 학과명 ‘STATISTICS’ 크게",
  "검정 후드티 가슴에 팀명 ‘CREW’ 작게",
  "바람막이, 뒷면에 ‘SEONGBUK’ 아치형으로",
];
const REFINEMENTS = ["흰색 티셔츠로", "뒷면에 문구 추가", "후드로 바꿔줘"];
const mobileQuery = "(max-width: 700px)";
const subscribeMobile = (listener: () => void) => { const media = window.matchMedia(mobileQuery); media.addEventListener("change", listener); return () => media.removeEventListener("change", listener); };
const getMobile = () => window.matchMedia(mobileQuery).matches;

export default function DesignStudio() {
  const { design, setDesign, prompt, setPrompt, filename, setFilename, messages, setMessages, resetSession, setHasResult, order, setOrder, restoredDesignId, restoredPreview, detachSavedDesign, rememberSavedDesign } = useDesignSession();
  const { update: updateDetails } = useOrderDetails();
  const [generating, setGenerating] = useState(false);
  const [awaitingCapture, setAwaitingCapture] = useState(false);
  const [refining, setRefining] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewVersion, setPreviewVersion] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [patternScene, setPatternScene] = useState<Scene | null>(null);
  const [patternFocus, setPatternFocus] = useState<"front" | "back" | "sleeve" | "all">("front");
  const mobile = useSyncExternalStore(subscribeMobile, getMobile, () => false);
  const clothData = useClothData();
  const captureReady = readyClothCapture(clothData);
  const requestActive = useRef(false);
  const waitingForCapture = useRef(false);
  const generationId = useRef(0);
  const generationAbort = useRef<AbortController | null>(null);
  const simulation = useRef<ClothSimulationControls>(null);
  const saveActive = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const promptInput = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const composerDock = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLElement>(null);
  const editorClose = useRef<HTMLButtonElement>(null);
  const patch = (value: Partial<Design>) => {
    const logoChanged = ("image" in value && value.image !== design.image)
      || ("logoPlacement" in value && JSON.stringify(value.logoPlacement) !== JSON.stringify(design.logoPlacement));
    if (logoChanged && getClothScene(clothData.text)) updateClothData({ completed: 0 });
    setDesign((current) => ({ ...current, ...value })); setMessage(""); updateDetails({ confirmed: false });
  };
  const lastPrompt = clothData.text || [...messages].reverse().find((item) => item.role === "user")?.text || prompt;

  useEffect(() => {
    if (!clothData.text || getClothScene(clothData.text)) return;
    let active = true;
    void (async () => {
      const cached = await restoreClothScene(clothData.text);
      const item = !cached && restoredDesignId ? await getLibraryItem(restoredDesignId) : null;
      const saved = savedClothDesign(item?.cloth);
      const scene = cached || (saved?.data.text === clothData.text ? saved.scene : undefined);
      if (!active || !scene) return;
      setClothScene(scene, clothData.text);
      setPreviewVersion(current => current + 1);
    })().catch(() => { /* Keep the stored preview visible if scene restoration is unavailable. */ });
    return () => { active = false; };
  }, [restoredDesignId, clothData.text]);

  useEffect(() => { if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight; }, [messages, generating]);
  useEffect(() => subscribeClothData(data => {
    if (waitingForCapture.current && readyClothCapture(data)) {
      waitingForCapture.current = false; setAwaitingCapture(false); setPrompt("");
    }
  }), [setPrompt]);
  useEffect(() => {
    if (!awaitingCapture) return;
    const timer = setTimeout(() => { waitingForCapture.current = false; setAwaitingCapture(false); setError("미리보기 준비가 지연되고 있어요. 다시 생성해주세요."); }, 120000);
    return () => clearTimeout(timer);
  }, [awaitingCapture]);
  useEffect(() => { if (promptInput.current) { promptInput.current.style.height = "auto"; promptInput.current.style.height = `${Math.min(126, promptInput.current.scrollHeight)}px`; } }, [prompt]);
  useEffect(() => {
    const dock = composerDock.current;
    if (!dock) return;
    let previousWidth = 0;
    const observer = new ResizeObserver(() => {
      const width = dock.getBoundingClientRect().width;
      if (width !== previousWidth && promptInput.current) {
        previousWidth = width;
        promptInput.current.style.height = "auto";
        promptInput.current.style.height = `${Math.min(126, promptInput.current.scrollHeight)}px`;
      }
      dock.closest<HTMLElement>(".handdam-studio")?.style.setProperty("--studio-dock-height", `${Math.ceil(dock.getBoundingClientRect().height)}px`);
    });
    observer.observe(dock);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!editorOpen && !quoteOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = editorOpen ? editor.current : document.getElementById("studio-quote-dialog");
    (editorOpen ? editorClose.current : dialog?.querySelector<HTMLButtonElement>("button"))?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { setEditorOpen(false); setQuoteOpen(false); }
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [editorOpen, quoteOpen]);

  useEffect(() => () => { generationId.current++; generationAbort.current?.abort(); }, []);
  useEffect(() => {
    const recognized = GARMENT_PRICING.find(item => item.id === clothData.category?.id);
    if (recognized && recognized.id !== order.pricingGarment) setOrder(current => ({ ...current, pricingGarment: recognized.id }));
  }, [clothData.category?.id, order.pricingGarment, setOrder]);

  async function generate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (requestActive.current || awaitingCapture || uploading || saving) return;
    const instruction = prompt.trim();
    if (!instruction) { setError("원하는 의상을 한 문장으로 입력해주세요."); promptInput.current?.focus(); return; }
    if (!simulation.current) { setError("미리보기를 준비하고 있어요. 잠시 후 다시 눌러주세요."); return; }
    detachSavedDesign();
    const id = ++generationId.current;
    setRefining(captureReady && canEdit); waitingForCapture.current = true; setAwaitingCapture(true);
    setEditorOpen(false);
    const controller = new AbortController(); generationAbort.current = controller;
    requestActive.current = true; setError(""); setMessage(""); setGenerating(true);
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
      if (garmentReady) { setHasResult(true); updateDetails({ confirmed: false }); }
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
      setMessage("");
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", text: reply }]);
    } catch (cause) {
      if (id !== generationId.current) return;
      waitingForCapture.current = false; setAwaitingCapture(false);
      setError(cause instanceof Error ? cause.message : "연결을 확인하고 다시 시도해주세요.");
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", text: "이번 요청을 완료하지 못했어요. 설명을 바꾸거나 다시 시도해주세요." }]);
    } finally {
      if (id === generationId.current) { requestActive.current = false; generationAbort.current = null; setGenerating(false); }
    }
  }

  function cancelGeneration() {
    generationId.current++; generationAbort.current?.abort(); generationAbort.current = null;
    simulation.current?.cancel(); requestActive.current = false; waitingForCapture.current = false; setGenerating(false); setAwaitingCapture(false);
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
    if (saveActive.current || generating || awaitingCapture || uploading || !captureReady) return;
    saveActive.current = true; setSaving(true); setError(""); setMessage("");
    try {
      const scene = getClothScene(clothData.text);
      if (!scene) throw new Error("이 저장본에는 3D 장면이 없어요. 디자인을 다시 생성한 뒤 저장해주세요.");
      const preview = clothData.front;
      const saved = await saveLibraryItem({
        kind: "design",
        design,
        prompt: lastPrompt,
        filename,
        order,
        cloth: snapshotClothDesign(clothData, scene),
        title: design.text || filename || "우리 단체티",
        ...(preview ? { preview } : {}),
      });
      rememberSavedDesign(saved.id, saved.preview);
      setMessage("디자인을 저장했어요.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "저장하지 못했어요."); }
    finally { saveActive.current = false; setSaving(false); }
  }
  function newDesign() {
    if (!generating && !uploading && !saving) {
      clearClothData(); resetSession(); resetOrderDetails(); setPreviewVersion(current => current + 1); setPatternScene(null); setEditorOpen(false); setQuoteOpen(false); setCanEdit(false); setAwaitingCapture(false); setRefining(false); setMessage(""); setError("");
    }
  }

  const processing = generating || awaitingCapture;
  const busy = processing || uploading || saving;
  function sample(text: string) {
    setPrompt(text);
    setError(""); setMessage("");
    promptInput.current?.focus();
  }
  const price = estimate(SUPPLIERS[0], order);
  const selectedGarment = pricingGarment(order.pricingGarment);
  const clothLogo = useMemo(() => design.image ? { src: design.image, ...(design.logoPlacement ?? {}) } : null, [design.image, design.logoPlacement]);

  const hasGarment = !!restoredPreview || (!!clothData.text && (canEdit || captureReady || (refining && processing)));
  const firstLoading = processing && !refining;
  const modalOpen = editorOpen || quoteOpen;
  const garmentLabel = clothData.category?.label || selectedGarment.label;
  function changeQuantity(delta: number) {
    if (busy) return;
    setOrder(current => {
      const quantity = totalQuantity(current);
      if (quantity + delta < 1 || quantity + delta > 999) return current;
      const sizes = { ...current.sizes };
      const size = delta > 0 ? "M" : (["M", "L", "S", "XL"] as const).find(key => sizes[key] > 0)!;
      sizes[size] += delta;
      return { ...current, sizes };
    });
    updateDetails({ confirmed: false });
  }
  const removeLogo = () => { patch({ image: null, logoPlacement: undefined }); setFilename(""); };
  const nextStep = captureReady && !busy
    ? <Link id="design-next" className="studio-primary" href="/quotes/new">주문서 작성하기 <ArrowRight size={16}/></Link>
    : <button id="design-next" className="studio-primary" disabled>{processing ? "주문서 작성하기" : clothData.text ? "앞·뒷면 준비 중…" : "주문서 작성하기"}</button>;

  return <main id="main-content" className="handdam-studio" data-has-design={hasGarment} data-processing={processing} data-first-loading={firstLoading}>
    <header className="handdam-header" inert={modalOpen}>
      <Link href="/" className="handdam-wordmark" aria-label="한땀 홈">한땀<span/></Link>
      <div className="studio-header-actions">
        <button type="button" className="studio-header-button" onClick={save} disabled={busy || !captureReady}>{saving ? <LoaderCircle size={15} className="animate-spin"/> : <Save size={15}/>}<span>{saving ? "저장 중" : "저장하기"}</span></button>
        <Link href="/my" className="studio-account" aria-label="마이페이지"><UserRound size={19}/></Link>
      </div>
    </header>
    <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="참고 이미지 선택" onChange={upload}/>
    <div className="studio-workspace">
      <div className="studio-canvas-column">
        <div className="studio-canvas-label" inert={modalOpen}>{canEdit && <button type="button" className="studio-mobile-edit" disabled={busy} onClick={() => setEditorOpen(true)}><PenLine size={14}/>로고 편집</button>}</div>

        {/* Keep this exact component mounted when the editor opens: the live 3D scene and capture pipeline are shared. */}
        <section ref={editor} className={`studio-scene-shell${editorOpen ? " is-editing" : ""}`} role={editorOpen ? "dialog" : undefined} aria-modal={editorOpen || undefined} aria-labelledby={editorOpen ? "studio-editor-title" : undefined} aria-label={editorOpen ? undefined : "3D 디자인 미리보기"} inert={quoteOpen}>
          {editorOpen && <div className="studio-editor-heading"><div><h2 id="studio-editor-title">로고 편집</h2><p>로고를 원하는 곳에 놓아보세요. 3D 디자인에도 바로 반영돼요.</p></div><button ref={editorClose} type="button" className="studio-icon-button" aria-label="로고 편집 닫기" onClick={() => setEditorOpen(false)}><X size={20}/></button>{mobile && <button type="button" className="studio-primary studio-editor-done" onClick={() => setEditorOpen(false)}>완료</button>}</div>}
          {editorOpen && mobile && <div className="studio-mobile-panels" role="group" aria-label="편집할 의류 부위">{([ ["front", "앞판"], ["back", "뒤판"], ["sleeve", "소매"], ["all", "전체"] ] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={patternFocus === id} onClick={() => setPatternFocus(id)}>{label}</button>)}</div>}
          <div className="studio-editor-layout">
            <div id="studio-preview-panel" className="studio-live-preview">
              <ClothSimulation key={previewVersion} controllerRef={simulation} savedPreview={restoredPreview} logo={clothLogo} view={editorOpen ? "pattern" : "3d"} patternFocus={editorOpen && mobile ? patternFocus : "all"} generating={processing} refining={refining} onFailure={() => { waitingForCapture.current = false; setAwaitingCapture(false); }} onEditableChange={setCanEdit} onSceneChange={setPatternScene}
                emptyContent={<div className="studio-welcome"><h1>어떤 옷을 <span>만들고 싶으세요?</span></h1><p>자유롭게 설명하거나, 예시로 시작해 보세요</p><div className="studio-examples">{EXAMPLES.map(text => <button type="button" key={text} disabled={busy} onClick={() => sample(text)}><span>{text}</span></button>)}</div></div>}
                onLogoChange={logo => patch({ logoPlacement: logo ? { panel: logo.panel ?? "front", x: logo.x ?? 0, y: logo.y ?? 0, width: logo.width ?? 10, rotation: logo.rotation ?? 0 } : undefined })}/>
              {canEdit && !editorOpen && !processing && <div className="studio-orbit-guide"><span/><p>드래그해서 돌려보세요</p></div>}
            </div>
            {editorOpen && <aside className="studio-logo-panel" aria-label="로고 설정">
              <p className="studio-mobile-editor-hint">{design.image ? "로고를 끌어 옮기세요. 다른 부위에서는 원하는 위치를 눌러주세요." : "로고를 추가해 원하는 위치에 놓아보세요."}</p><h3>로고</h3>
              <button type="button" className={`studio-logo-upload${design.image ? " has-image" : ""}`} disabled={busy} onClick={() => fileInput.current?.click()}>{design.image ? <Image src={design.image} alt="첨부한 로고" width={42} height={42} unoptimized/> : <ImagePlus size={22}/>}<span>{uploading ? "이미지 준비 중…" : filename || "로고 추가하기"}<small>PNG · JPG · WEBP / 최대 8MB</small></span>{design.image && <Plus size={15}/>}</button>
              {design.image ? <>
                <div className="studio-logo-file-actions"><span>파일을 누르면 교체할 수 있어요</span><button type="button" disabled={busy} onClick={removeLogo} aria-label="로고 삭제">삭제</button></div>
                {design.logoPlacement && <div className="studio-logo-controls" aria-label="로고 크기와 회전">
                  <label>로고 너비<span className="studio-number-field"><input aria-label="로고 너비 직접 입력" type="number" min="1" max="30" step="0.1" value={Number(design.logoPlacement.width.toFixed(1))} disabled={busy} onChange={event => { const width = event.currentTarget.valueAsNumber; if (Number.isFinite(width) && width >= 1 && width <= 30) patch({ logoPlacement: { ...design.logoPlacement!, width } }); }}/><span>cm</span></span><input aria-label="로고 너비" type="range" min="1" max="30" step="0.1" value={Math.min(30,design.logoPlacement.width)} disabled={busy} onChange={event => patch({ logoPlacement: { ...design.logoPlacement!, width: Number(event.target.value) } })}/></label>
                  <label>로고 회전<span className="studio-number-field"><input aria-label="로고 회전 직접 입력" type="number" min="-180" max="180" step="1" value={Math.round(design.logoPlacement.rotation > 180 ? design.logoPlacement.rotation - 360 : design.logoPlacement.rotation)} disabled={busy} onChange={event => { const rotation = event.currentTarget.valueAsNumber; if (Number.isFinite(rotation) && rotation >= -180 && rotation <= 180) patch({ logoPlacement: { ...design.logoPlacement!, rotation } }); }}/><span>°</span></span><input aria-label="로고 회전" type="range" min="-180" max="180" step="1" value={design.logoPlacement.rotation > 180 ? design.logoPlacement.rotation - 360 : design.logoPlacement.rotation} disabled={busy} onChange={event => patch({ logoPlacement: { ...design.logoPlacement!, rotation: Number(event.target.value) } })}/></label>
                </div>}
              </> : <div className="studio-logo-controls studio-disabled-controls" aria-label="로고를 추가하면 사용할 수 있는 설정"><label>로고 너비<output>—</output><input type="range" aria-label="로고 너비" min="1" max="30" value="1" disabled/></label><label>로고 회전<output>—</output><input type="range" aria-label="로고 회전" min="-180" max="180" value="-180" disabled/></label></div>}
              {!mobile && <button type="button" className="studio-primary studio-editor-done" onClick={() => setEditorOpen(false)}>완료</button>}
            </aside>}
          </div>
        </section>

        <div ref={composerDock} className="studio-composer-dock" inert={modalOpen}>
          {hasGarment && !processing && <div className="studio-refinements" aria-label="디자인 수정 예시">{REFINEMENTS.map(text => <button type="button" key={text} disabled={busy} onClick={() => sample(`${clothData.text.slice(0,250)}. ${text}`)}>{text}</button>)}</div>}
          <div className="studio-feedback" aria-live="polite">{error && <p className="studio-error" role="alert">{error}</p>}{message && !error && <p className="studio-notice"><Check size={14}/>{message}</p>}</div>
          <form onSubmit={generate} className={`studio-composer${prompt.trim() ? " has-prompt" : ""}`} data-ui>
            {design.image && <div className="studio-attached-file"><Image src={design.image} alt="첨부 이미지" width={27} height={27} unoptimized/><span>{filename || "로고 이미지"}</span><button type="button" disabled={busy} aria-label="첨부 이미지 삭제" onClick={removeLogo}><X size={13}/></button></div>}
            <label className="sr-only" htmlFor="prompt">원하는 옷을 설명해주세요</label>
            <textarea ref={promptInput} id="prompt" rows={1} maxLength={300} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={hasGarment ? "바꾸고 싶은 부분을 말해주세요" : "원하는 디자인을 말해주세요"} disabled={busy}/>
            <div className="studio-composer-bottom"><button type="button" className="studio-attach" onClick={() => fileInput.current?.click()} disabled={busy}><Plus size={16}/>{uploading ? "이미지 준비 중" : "로고 · 이미지"}</button><span className="studio-prompt-count">{prompt.length}/300</span>{processing ? <button type="button" className="studio-submit is-cancel" aria-label="생성 취소" title="생성 취소" onClick={cancelGeneration}><span/></button> : <button type="submit" className="studio-submit" aria-label="AI 시안 만들기" title="AI 시안 만들기" disabled={busy || !prompt.trim()}>{uploading ? <LoaderCircle size={17} className="animate-spin"/> : <ArrowUp size={18}/>}</button>}</div>
          </form>
          <div className="studio-dock-caption">{messages.length > 0 && <details className="studio-conversation"><summary>대화 내역 <ChevronDown size={12}/></summary><div ref={conversation} role="log" aria-label="AI 디자인 대화">{messages.map(item => <p key={item.id}><strong>{item.role === "user" ? "나" : "한땀"}</strong>{item.text}</p>)}<button type="button" className="studio-secondary" onClick={newDesign} disabled={busy}>새 디자인 시작</button></div></details>}</div>
        </div>
      </div>

      <aside className="studio-sidebar" inert={editorOpen}>
        <section className="studio-pattern-card" inert={quoteOpen}><div className="studio-card-heading"><h2>도안</h2></div><p>{firstLoading ? "도안 만드는 중…" : hasGarment ? "로고를 추가하거나 원하는 곳에 배치해 보세요" : "디자인이 나오면 여기에 도안이 보여요."}</p>{patternScene && !firstLoading ? <div className="studio-pattern-miniature" role="img" aria-label="생성한 의류의 재단 도안과 로고 위치"><PatternThumbnail scene={patternScene} logo={clothLogo} preview background="#f8f9fc"/></div> : <div className="studio-pattern-pair">{(["front", "back"] as const).map((side, index) => <figure key={side}>{captureReady && clothData[side] ? <Image src={clothData[side]} alt={`생성한 의상 ${index === 0 ? "앞면" : "뒷면"}`} width={200} height={200} unoptimized/> : <GarmentOutline back={index === 1}/>}<figcaption>{index === 0 ? "앞" : "뒤"}</figcaption></figure>)}</div>}<button type="button" className="studio-secondary" disabled={!canEdit || busy} onClick={() => setEditorOpen(true)}><Plus size={15}/>로고 편집</button>{captureReady && !canEdit && <p className="studio-restore-note">로고를 다시 편집하려면 같은 설명으로 생성해주세요.</p>}</section>
        <section id="studio-quote-dialog" className={`studio-estimate-card${quoteOpen ? " is-open" : ""}`} role={quoteOpen ? "dialog" : undefined} aria-modal={quoteOpen || undefined} aria-labelledby="studio-estimate-title">
          <div className="studio-card-heading"><h2 id="studio-estimate-title">이 디자인, 얼마일까?</h2><button type="button" className="studio-icon-button studio-quote-close" aria-label="견적 상세 닫기" onClick={() => setQuoteOpen(false)}><X size={20}/></button></div><p className="studio-estimate-intro">옷 종류 · 디자인 · 수량에 따라 달라져요</p>
          {quoteOpen && captureReady && clothData.front && <div className="studio-quote-garment"><Image src={clothData.front} alt="생성한 의상 앞면" width={56} height={56} unoptimized/><div><strong>{garmentLabel}</strong><span>디자인과 도안을 확인했어요</span></div></div>}
          <dl className="studio-design-facts"><div><dt>의류</dt><dd>{hasGarment && !firstLoading ? garmentLabel : firstLoading ? <span className="studio-placeholder-line"/> : "고르면 표시돼요"}</dd></div><div><dt>수량</dt><dd className="studio-quantity"><button type="button" aria-label="수량 줄이기" disabled={busy || totalQuantity(order) <= 1} onClick={() => changeQuantity(-1)}>−</button><output aria-label="주문 수량">{totalQuantity(order)}</output><button type="button" aria-label="수량 늘리기" disabled={busy || totalQuantity(order) >= 999} onClick={() => changeQuantity(1)}>+</button></dd></div></dl>
          <div className="studio-estimate-bottom"><dl className="studio-production-facts"><div><dt>총 금액 ({totalQuantity(order)}벌)</dt><dd>{firstLoading ? <span className="studio-placeholder-line"/> : hasGarment ? `${won(price.total)} ~ ${won((price.unit + 5000) * totalQuantity(order))}` : "—"}</dd></div><div><dt>제작 예상 기간</dt><dd>{firstLoading ? <span className="studio-placeholder-line"/> : hasGarment ? "7–14일" : "—"}</dd></div></dl><div className="studio-price-caption"><span>예상 단가 · 1벌</span></div><div className="studio-price-row"><strong aria-live="polite" aria-atomic="true">{hasGarment && !firstLoading ? <>{won(price.unit)}<span> ~ </span>{won(price.unit + 5000)}</> : firstLoading ? <span className="studio-price-loading" aria-label="가격 계산 중"/> : <span className="studio-price-pending">—</span>}</strong><button type="button" className="studio-mobile-quote" aria-label="예상 견적 자세히 보기" onClick={() => setQuoteOpen(true)}><ChevronDown size={16}/></button></div>{hasGarment && <p className="studio-price-note">시연용 예상가 · 실제 견적은 업체 확인 후 확정돼요.</p>}{nextStep}</div>
        </section>
      </aside>
    </div>
    {modalOpen && <div className="studio-modal-backdrop" aria-hidden="true" onClick={() => { setEditorOpen(false); setQuoteOpen(false); }}/>}
    <div className="sr-only" aria-live="polite">{generating ? "AI가 디자인을 만들고 있어요." : captureReady ? "디자인 앞·뒷면이 준비됐어요." : ""}</div>
  </main>;
}
