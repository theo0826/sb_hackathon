"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
// 삭제금지: ClothSim 연동 — 생성 기능은 홈 대신 디자인 화면에서 사용.
import ClothSim, { type ClothSimDesignerHandle, type Progress } from "../ClothSim";

const stages: Record<Progress["stage"], string> = {
  translate: "옷 설명을 읽고 있어요.",
  choose: "옷의 형태와 소재를 고르고 있어요.",
  number: "옷의 치수를 정하고 있어요.",
  build: "입체 의상을 만들고 있어요.",
  done: "의상 시뮬레이션을 준비하고 있어요.",
};

export default function ClothSimulationPreview({ active, fallback, overlay }: {
  active: boolean;
  fallback: ReactNode;
  overlay?: ReactNode;
}) {
  const simulator = useRef<ClothSimDesignerHandle>(null);
  const request = useRef(0);
  const running = useRef(false);
  // 삭제금지: ClothSim clothRepresentText 입력 — 인쇄 문구와 별도의 옷 형태 설명.
  const [clothRepresentText, setClothRepresentText] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("옷의 형태와 소재를 설명하고 시뮬레이션을 만들어보세요.");
  const [error, setError] = useState("");

  useEffect(() => () => { request.current++; }, []);
  useEffect(() => {
    if (active && ready) simulator.current?.play();
    else simulator.current?.pause();
  }, [active, ready]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current || !clothRepresentText.trim() || !simulator.current) return;
    if (!("gpu" in navigator) || !navigator.gpu) {
      setError("이 브라우저에서는 의상 시뮬레이션을 지원하지 않아요. 최신 Chrome 또는 Edge에서 열어주세요.");
      return;
    }
    const id = ++request.current;
    running.current = true;
    setBusy(true); setError(""); setReady(false); setStatus("옷 생성을 시작하고 있어요.");
    try {
      const result = await simulator.current.generate(clothRepresentText.trim());
      if (id !== request.current) return;
      if (result) setStatus("의상 시뮬레이션을 준비하고 있어요.");
    } catch {
      if (id === request.current) setError("의상을 만들지 못했어요. 연결을 확인하고 다시 시도해주세요.");
    } finally {
      if (id === request.current) { running.current = false; setBusy(false); }
    }
  }

  function cancel() {
    request.current++;
    simulator.current?.cancel();
    running.current = false;
    setBusy(false); setStatus("생성을 취소했어요. 설명을 바꾸고 다시 만들 수 있어요.");
  }

  return <>
    <div className="wf-stage" data-preview-mode={active ? "simulation" : "design"}>
      <div style={{ visibility: active && ready ? "hidden" : "visible" }} aria-hidden={active && ready}>{fallback}</div>
      <div className="studio-cloth-layer" style={{ visibility: active && ready ? "visible" : "hidden" }} aria-hidden={!active || !ready} inert={!active || !ready}>
        {/* 삭제금지: ClothSim clothRepresentText 전달 — 생성은 외부 폼의 명시적 제출로 실행. */}
        <ClothSim ref={simulator} showInput={false} clothRepresentText={clothRepresentText}
          autoplay={active} options={{ strain: false, tear: false }}
          onProgress={progress => setStatus(stages[progress.stage] || "옷을 만들고 있어요.")}
          onReady={() => { setReady(true); setError(""); setStatus("의상 시뮬레이션이 준비됐어요. 드래그해서 돌려보세요."); }}
          onError={() => { setReady(false); setStatus("현재 디자인 미리보기를 표시하고 있어요."); setError("의상 시뮬레이션을 만들지 못했어요. 생성 연결을 확인하고 다시 시도해주세요. 디자인 미리보기는 계속 사용할 수 있어요."); }}
          style={{ width: "100%", height: "100%" }} />
      </div>
      {overlay}
    </div>
    <form className="studio-simulation-controls" onSubmit={generate} hidden={!active} aria-label="의상 시뮬레이션 생성" aria-busy={busy}>
      <label htmlFor="cloth-represent-text">만들 옷 설명</label>
      <textarea id="cloth-represent-text" className="form-input" rows={3} maxLength={500} value={clothRepresentText} onChange={event => setClothRepresentText(event.target.value)} placeholder="예: 초록색 오버핏 후드티, 캥거루 주머니" disabled={busy} aria-describedby="cloth-simulation-note" />
      <p id="cloth-simulation-note" className="wf-muted">옷의 형태·소재를 시험하는 미리보기예요. 인쇄 디자인과 주문 자료에는 반영되지 않아요. 생성하려면 이 기기의 Ollama 연결이 필요해요.</p>
      <div className="studio-simulation-actions">
        <button className="wf-dark-button" type="submit" disabled={busy || !clothRepresentText.trim()}>{busy && <LoaderCircle className="animate-spin" size={16}/>} {busy ? "의상 생성 중…" : "의상 시뮬레이션 만들기"}</button>
        {busy && <button className="outline" type="button" onClick={cancel}>생성 취소</button>}
      </div>
      <p className="wf-muted" role="status">{status}</p>
      {error && <p className="wf-alert" role="alert">{error}</p>}
    </form>
  </>;
}
