"use client";

import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import Image from "next/image";
// 삭제금지: 팀 ClothSim 엔진·재단 도안 편집기를 같은 장면으로 사용합니다.
import ClothSim, { type ClothLogo, type ClothSimDesignerHandle, type Progress, type Scene } from "../ClothSim";
import { getClothData, useClothData } from "../ClothSim/clothdata/store";
import { readyClothCapture } from "@/lib/cloth-capture";
import ClothCapturePreview from "./ClothCapturePreview";
import GarmentOutline from "./GarmentOutline";
import { getClothScene, setClothScene } from "@/lib/cloth-scene-session";

const stages: Record<Progress["stage"], string> = {
  translate: "옷 설명을 읽고 있어요.", choose: "형태와 소재를 고르고 있어요.",
  number: "치수를 정하고 있어요.", build: "입체 의상을 만들고 있어요.", done: "옷의 형태를 정리하고 있어요.",
};
export type ClothSimulationControls = { generate: (text: string) => Promise<boolean>; cancel: () => void };

export default function ClothSimulationPreview({ controllerRef, savedPreview = null, logo = null, view = "3d", patternFocus = "all", onLogoChange, onEditableChange, onSceneChange, onFailure, emptyContent, generating = false, refining = false }: {
  controllerRef: Ref<ClothSimulationControls>;
  savedPreview?: string | null;
  logo?: ClothLogo | null;
  view?: "3d" | "pattern";
  patternFocus?: "all" | "front" | "back" | "sleeve";
  onLogoChange?: (logo: ClothLogo | null) => void;
  onEditableChange?: (editable: boolean) => void;
  onSceneChange?: (scene: Scene | null) => void;
  emptyContent?: ReactNode;
  generating?: boolean;
  refining?: boolean;
  onFailure?: () => void;
}) {
  const data = useClothData();
  const simulator = useRef<ClothSimDesignerHandle>(null);
  const request = useRef(0);
  const running = useRef(false);
  const textRef = useRef(getClothData().text);
  const [initialScene] = useState(() => getClothScene(getClothData().text));
  const [hasScene, setHasScene] = useState(!!initialScene);
  const [clothRepresentText, setClothRepresentText] = useState(() => getClothData().text);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const captureReady = readyClothCapture(data);

  useEffect(() => () => { request.current++; }, []);
  useEffect(() => { onEditableChange?.(hasScene && ready && !generating); }, [hasScene, ready, generating, onEditableChange]);
  useEffect(() => { if (initialScene) onSceneChange?.(initialScene); }, [initialScene, onSceneChange]);

  async function generate(text: string) {
    if (running.current || !text.trim() || !simulator.current) return false;
    if (!("gpu" in navigator) || !navigator.gpu) {
      setError("최신 Chrome 또는 Edge에서 열어주세요. 이 브라우저에서는 3D 의상 생성을 지원하지 않아요.");
      return false;
    }
    const id = ++request.current;
    running.current = true; setClothScene(null); textRef.current = text.trim();
    if (!hasScene) { setHasScene(false); onSceneChange?.(null); setReady(false); }
    setClothRepresentText(text.trim()); setError(""); setStatus("옷 생성을 시작하고 있어요.");
    try {
      const result = await simulator.current.generate(text.trim());
      if (id !== request.current) return false;
      if (result) setStatus("앞·뒷면 이미지를 준비하고 있어요. 잠시만 기다려주세요.");
      return !!result;
    } catch {
      if (id === request.current) setError("의상을 만들지 못했어요. 연결을 확인하고 다시 시도해주세요.");
      return false;
    } finally { if (id === request.current) running.current = false; }
  }

  function cancel() {
    request.current++; simulator.current?.cancel(); running.current = false;
    setStatus("생성을 취소했어요. 설명을 바꾸고 다시 만들 수 있어요.");
  }
  useImperativeHandle(controllerRef, () => ({ generate, cancel }));

  return <>
    <div className="wf-stage studio-generated-stage" data-preview-mode={view} aria-busy={!!status && !captureReady && !error}>
      {(!hasScene || !ready || (generating && !refining)) && <div className={`studio-empty-preview${generating ? " is-generating" : ""}`}>
        {hasScene && !ready && !generating && !error ? <div className="studio-generation-placeholder" role="status"><GarmentOutline shimmer/><strong>저장한 3D 모델을 불러오고 있어요…</strong></div> : captureReady ? <><ClothCapturePreview capture={data}/><p>저장한 앞·뒷면이에요. 로고를 다시 편집하려면 같은 설명으로 의상을 생성해주세요.</p></>
          : generating ? <div className="studio-generation-placeholder"><GarmentOutline shimmer/><strong>디자인 만드는 중…</strong><p>보통 10초 정도 걸려요</p></div>
          : savedPreview ? <Image className="studio-saved-preview" src={savedPreview} alt="저장한 디자인" width={1024} height={1024} unoptimized />
          : emptyContent || <><strong>{view === "pattern" ? "로고를 놓을 도안을 준비해요" : "우리 모임의 옷을 만들어보세요"}</strong><p>아래에 옷 설명을 입력하고 만들기 버튼을 눌러주세요.</p></>}
      </div>}
      <div id="studio-artwork-editor" className="studio-cloth-layer" style={{ visibility: ready && (!generating || refining) ? "visible" : "hidden" }} aria-hidden={!ready || (generating && !refining)} inert={!ready || generating}>
        <ClothSim ref={simulator} scene={initialScene} showInput={false} clothRepresentText={clothRepresentText}
          llm={{ backend: "worker", workerUrl: process.env.NEXT_PUBLIC_CLOTH_WORKER_URL || "https://clothsim-api.set35230.workers.dev", timeoutMs: 90000 }}
          logo={logo} view={view} patternFocus={patternFocus} patternEditor="none" onLogoChange={onLogoChange}
          autoplay options={{ strain: false, tear: false, body: false }}
          look={{ background: [0, 0, 0, 0] }}
          onScene={scene => { setClothScene(scene, textRef.current); setHasScene(true); onSceneChange?.(scene); }}
          onProgress={progress => setStatus(stages[progress.stage])}
          onReady={() => { setHasScene(true); setReady(true); setError(""); setStatus("앞·뒷면 이미지를 준비하고 있어요."); }}
          onError={() => { setReady(false); setHasScene(false); setStatus(""); onFailure?.(); setError("의상 미리보기를 만들지 못했어요. 연결과 브라우저의 그래픽 가속 설정을 확인한 뒤 다시 시도해주세요."); }}
          style={{ width: "100%", height: "100%" }}/>
      </div>
      {generating && refining && <div className="studio-refining-overlay" role="status"><span/>수정 중…</div>}
    </div>
    <div className="studio-simulation-controls" aria-label="디자인 생성 상태">
      <p className="wf-muted" role="status">{error ? "생성을 완료하지 못했어요." : captureReady ? "앞·뒷면이 준비됐어요. 주문서로 이동할 수 있어요." : status || "생성한 옷은 디자인에서 돌려보고, 도안에서 로고를 배치해요."}</p>
      {error && <p className="wf-alert" role="alert">{error}</p>}
      {data.imagesInMemoryOnly && <p className="wf-alert" role="status">저장 공간이 부족해 이미지가 현재 화면에만 남아 있어요. 새로고침 전에 앞·뒷면을 내려받아주세요.</p>}
      {view === "pattern" && <p className="wf-muted">로고를 끌어 옮기면 3D에도 반영돼요. 크기와 회전은 아래에서 조절하세요.</p>}
    </div>
  </>;
}
