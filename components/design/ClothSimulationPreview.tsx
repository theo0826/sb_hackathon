"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
// 삭제금지: 팀 ClothSim 엔진·재단 도안 편집기를 같은 장면으로 사용합니다.
import ClothSim, { type ClothLogo, type ClothSimDesignerHandle, type Progress, type Scene } from "../ClothSim";
import { getClothData, useClothData } from "../ClothSim/clothdata/store";
import { readyClothCapture } from "@/lib/cloth-capture";
import ClothCapturePreview from "./ClothCapturePreview";

const stages: Record<Progress["stage"], string> = {
  translate: "옷 설명을 읽고 있어요.", choose: "형태와 소재를 고르고 있어요.",
  number: "치수를 정하고 있어요.", build: "입체 의상을 만들고 있어요.", done: "옷의 형태를 정리하고 있어요.",
};
// 같은 탭에서 주문서를 다녀와도 장면을 다시 편집합니다. 새로고침은 저장한 이미지를 표시합니다.
let cachedScene: { scene: Scene; text: string } | null = null;
export type ClothSimulationControls = { generate: (text: string) => Promise<boolean>; cancel: () => void };

export default function ClothSimulationPreview({ controllerRef, logo = null, view = "3d", onLogoChange }: {
  controllerRef: Ref<ClothSimulationControls>;
  logo?: ClothLogo | null;
  view?: "3d" | "pattern";
  onLogoChange?: (logo: ClothLogo | null) => void;
}) {
  const data = useClothData();
  const simulator = useRef<ClothSimDesignerHandle>(null);
  const request = useRef(0);
  const running = useRef(false);
  const textRef = useRef(getClothData().text);
  const [initialScene] = useState(() => cachedScene?.text === getClothData().text && getClothData().text ? cachedScene.scene : undefined);
  const [hasScene, setHasScene] = useState(!!initialScene);
  const [clothRepresentText, setClothRepresentText] = useState(() => getClothData().text);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const captureReady = readyClothCapture(data);

  useEffect(() => () => { request.current++; }, []);

  async function generate(text: string) {
    if (running.current || !text.trim() || !simulator.current) return false;
    if (!("gpu" in navigator) || !navigator.gpu) {
      setError("최신 Chrome 또는 Edge에서 열어주세요. 이 브라우저에서는 3D 의상 생성을 지원하지 않아요.");
      return false;
    }
    const id = ++request.current;
    running.current = true; cachedScene = null; textRef.current = text.trim();
    setHasScene(false); setClothRepresentText(text.trim()); setError(""); setReady(false); setStatus("옷 생성을 시작하고 있어요.");
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
      {!hasScene && <div className="studio-empty-preview">
        {captureReady ? <><ClothCapturePreview capture={data}/><p>저장한 앞·뒷면이에요. 로고를 다시 편집하려면 같은 설명으로 의상을 생성해주세요.</p></>
          : <><strong>{view === "pattern" ? "로고를 놓을 도안을 준비해요" : "우리 모임의 옷을 만들어보세요"}</strong><p>왼쪽에 옷 설명을 입력하고 AI 시안 만들기를 눌러주세요.</p></>}
      </div>}
      <div id="studio-artwork-editor" className="studio-cloth-layer" style={{ visibility: ready ? "visible" : "hidden" }} aria-hidden={!ready} inert={!ready}>
        <ClothSim ref={simulator} scene={initialScene} showInput={false} clothRepresentText={clothRepresentText}
          llm={{ backend: "worker", workerUrl: process.env.NEXT_PUBLIC_CLOTH_WORKER_URL || "https://clothsim-api.set35230.workers.dev", timeoutMs: 90000 }}
          logo={logo} view={view} patternEditor="none" onLogoChange={onLogoChange}
          autoplay options={{ strain: false, tear: false }}
          onScene={scene => { cachedScene = { scene, text: textRef.current }; setHasScene(true); }}
          onProgress={progress => setStatus(stages[progress.stage])}
          onReady={() => { setHasScene(true); setReady(true); setError(""); setStatus("앞·뒷면 이미지를 준비하고 있어요."); }}
          onError={() => { setReady(false); setHasScene(false); setStatus(""); setError("의상 미리보기를 만들지 못했어요. 연결과 브라우저의 그래픽 가속 설정을 확인한 뒤 다시 시도해주세요."); }}
          style={{ width: "100%", height: "100%" }}/>
      </div>
    </div>
    <div className="studio-simulation-controls" aria-label="디자인 생성 상태">
      <p className="wf-muted" role="status">{error ? "생성을 완료하지 못했어요." : captureReady ? "앞·뒷면이 준비됐어요. 주문서로 이동할 수 있어요." : status || "생성한 옷은 디자인에서 돌려보고, 도안에서 로고를 배치해요."}</p>
      {error && <p className="wf-alert" role="alert">{error}</p>}
      {data.imagesInMemoryOnly && <p className="wf-alert" role="status">저장 공간이 부족해 이미지가 현재 화면에만 남아 있어요. 새로고침 전에 앞·뒷면을 내려받아주세요.</p>}
      {view === "pattern" && <p className="wf-muted">로고를 끌어 옮기면 3D에도 반영돼요. 크기와 회전은 아래에서 조절하세요.</p>}
    </div>
  </>;
}
