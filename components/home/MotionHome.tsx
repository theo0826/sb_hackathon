"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Pause, Play } from "lucide-react";
import ShirtPreview from "@/components/design/ShirtPreview";

const Runway = dynamic(() => import("./RunwayScene"), {
  ssr: false,
  loading: () => <div className="handdam-home-placeholder"><ShirtPreview color="#082348" ink="#edf1f7" text="OUR CLUB"/></div>,
});

export default function MotionHome() {
  const [paused, setPaused] = useState(false);
  return <main id="main-content" className="handdam-home">
    <section className="handdam-home-hero" aria-labelledby="handdam-home-title">
      <div className="handdam-home-copy">
        <h1 id="handdam-home-title">상상한 옷을,<br/>한 땀씩 현실로.</h1>
        <p>원하는 옷을 말하면 AI가 디자인으로.<br/>로고 배치부터 제작 준비까지 한곳에서.</p>
        <div className="handdam-home-actions">
          <Link href="/design" className="handdam-home-start">디자인 시작하기<ArrowRight size={19}/></Link>
          <Link href="/my" className="handdam-home-saved">저장한 디자인 보기</Link>
        </div>
      </div>
      <div className="handdam-home-visual">
        <div className="handdam-home-runway"><Runway color="#082348" paused={paused}/></div>
        <div className="handdam-home-visual-caption"><span>한 문장으로 시작하는 우리만의 옷</span><button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? "의류 모션 재생" : "의류 모션 일시정지"}>{paused ? <Play size={14}/> : <Pause size={14}/>}</button></div>
      </div>
    </section>
  </main>;
}
