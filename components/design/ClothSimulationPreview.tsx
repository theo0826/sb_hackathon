"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
// 삭제금지: ClothSim 연동 — 생성 기능은 홈 대신 디자인 화면에서 사용.
import ClothSim, { type ClothSimDesignerHandle, type Progress } from "../ClothSim";

const stages: Record<Progress["stage"], string> = {
  translate: "옷 설명을 읽고 있어요.",
  choose: "옷의 형태와 소재를 고르고 있어요.",
  number: "옷의 치수를 정하고 있어요.",
  build: "입체 의상을 만들고 있어요.",
  done: "의상 미리보기를 준비하고 있어요.",
};

export type ClothSimulationControls = { generate: (text: string) => Promise<boolean>; cancel: () => void };

export default function ClothSimulationPreview({ controllerRef, active = true }: {
  controllerRef: Ref<ClothSimulationControls>;
  active?: boolean;
}) {
  const simulator = useRef<ClothSimDesignerHandle>(null);
  const request = useRef(0);
  const running = useRef(false);
  // 삭제금지: ClothSim clothRepresentText — 왼쪽 공통 입력창에서 제출한 의상 설명.
  const [clothRepresentText, setClothRepresentText] = useState("");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => { request.current++; }, []);
  useEffect(() => {
    if (ready && active) simulator.current?.play();
    else simulator.current?.pause();
  }, [ready, active]);

  async function generate(text: string) {
    if (running.current || !text.trim() || !simulator.current) return false;
    if (!("gpu" in navigator) || !navigator.gpu) {
      setError("이 브라우저에서는 의상 미리보기를 지원하지 않아요. 최신 Chrome 또는 Edge에서 열어주세요.");
      return false;
    }
    const id = ++request.current;
    running.current = true;
    setClothRepresentText(text.trim()); setError(""); setReady(false); setStatus("옷 생성을 시작하고 있어요.");
    try {
      const result = await simulator.current.generate(text.trim());
      if (id !== request.current) return false;
      if (result) setStatus("의상 미리보기를 준비하고 있어요.");
      return !!result;
    } catch {
      if (id === request.current) setError("의상을 만들지 못했어요. 연결을 확인하고 다시 시도해주세요.");
      return false;
    } finally {
      if (id === request.current) running.current = false;
    }
  }

  function cancel() {
    request.current++;
    simulator.current?.cancel();
    running.current = false;
    setStatus("생성을 취소했어요. 설명을 바꾸고 다시 만들 수 있어요.");
  }

  useImperativeHandle(controllerRef, () => ({ generate, cancel }));

  return <>
    <div className="wf-stage studio-generated-stage" data-preview-mode="design">
      <div className="studio-cloth-layer" style={{ visibility: ready ? "visible" : "hidden" }} aria-hidden={!ready} inert={!ready}>
        {/* 삭제금지: ClothSim clothRepresentText 전달 — 생성은 외부 폼의 명시적 제출로 실행. */}
        <ClothSim ref={simulator} showInput={false} clothRepresentText={clothRepresentText}
          autoplay options={{ strain: false, tear: false }}
          onProgress={progress => setStatus(stages[progress.stage] || "옷을 만들고 있어요.")}
          onReady={() => { setReady(true); setError(""); setStatus("의상 미리보기가 준비됐어요. 드래그해서 돌려보세요."); }}
          onError={() => { setReady(false); setStatus(""); setError("의상 미리보기를 만들지 못했어요. 생성 연결을 확인하고 다시 시도해주세요."); }}
          style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
    {(status || error) && <div className="studio-simulation-controls" aria-label="디자인 생성 상태">
      {status && <p className="wf-muted" role="status">{status}</p>}
      {error && <p className="wf-alert" role="alert">{error}</p>}
    </div>}
  </>;
}
