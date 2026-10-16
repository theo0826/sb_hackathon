"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check, Pause, Play } from "lucide-react";
import { DEFAULT_DESIGN } from "@/lib/design";
import Artwork from "@/components/design/Artwork";
import ShirtPreview from "@/components/design/ShirtPreview";
// 삭제금지: ClothSim 연동
import ClothSim from "../ClothSim";

const Runway = dynamic(() => import("./RunwayScene"), { ssr: false, loading: () => <div className="runway-placeholder"><ShirtPreview text="OUR CLUB" /></div> });
const stages = [
  { title: "생각을 말하면, 디자인으로.", text: "색상, 문구, 원하는 분위기. 한 문장으로 시작하고 3D로 돌려보세요.", label: "디자인 생성" },
  { title: "우리에게 맞는 업체로.", text: "수량과 제작 방식에 맞춰 성북 지역의 예시 업체를 비교해요.", label: "업체 선택" },
  { title: "제작할 수 있는 도안으로.", text: "선택한 업체의 인쇄 크기와 파일 형식에 맞춰 도안을 확인해요.", label: "맞춤 도안 확인" },
  { title: "전달 준비는 한곳에서.", text: "도안과 주문 정보를 정리하고, 마이페이지에서 대기 상태를 확인해요.", label: "전달 · 견적 대기" },
];

export default function MotionHome() {
  const root = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  // 삭제금지: ClothSim clothRepresentText state
  const [clothRepresentText, setClothRepresentText] = useState("");

  useEffect(() => {
    const element = root.current; if (!element) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const animations: Animation[] = [];
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (!reduced.matches && !paused) {
        const target = entry.target as HTMLElement;
        const image = target.hasAttribute("data-picture");
        animations.push(target.animate(image ? [{ transform: "translateY(64px) rotate(4deg)", opacity: .4 }, { transform: "none", opacity: 1 }] : [{ transform: "translateY(42px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: image ? 1500 : 1100, delay: Number(target.dataset.delay || 0), easing: "cubic-bezier(.16,1,.3,1)", fill: "both" }));
      }
      reveal.unobserve(entry.target);
    }), { threshold: .12 });
    element.querySelectorAll("[data-reveal]").forEach(node => reveal.observe(node));
    const panels = Array.from(element.querySelectorAll<HTMLElement>(".motion-stack-panel"));
    let frame = 0;
    const update = () => {
      frame = 0;
      panels.forEach((panel, index) => {
        const next = panels[index + 1];
        const top = parseFloat(getComputedStyle(panel).top) || 0;
        const progress = next ? Math.min(1, Math.max(0, 1 - (next.getBoundingClientRect().top - top) / Math.max(panel.offsetHeight, 1))) : 0;
        panel.style.setProperty("--stack-progress", String(reduced.matches || paused ? 0 : progress));
      });
      const hero = element.querySelector<HTMLElement>(".motion-hero");
      if (hero) hero.style.setProperty("--hero-scroll", String(reduced.matches || paused ? 0 : Math.min(1, scrollY / Math.max(hero.offsetHeight, 1))));
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const change = () => { if (reduced.matches) animations.forEach(animation => animation.cancel()); scroll(); };
    window.addEventListener("scroll", scroll, { passive: true }); window.addEventListener("resize", scroll); reduced.addEventListener("change", change); update();
    return () => { reveal.disconnect(); animations.forEach(animation => animation.cancel()); cancelAnimationFrame(frame); window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); reduced.removeEventListener("change", change); };
  }, [paused]);

  return <main id="main-content" ref={root} className="motion-home" data-paused={paused}>
    <section className="motion-hero" aria-labelledby="motion-title">
      <div className="motion-hero-heading">
        <h1 id="motion-title"><span><span>우리다운 생각을,</span></span><span><span>우리만의 반티로.</span></span></h1>
        <div className="motion-hero-intro"><p>아이디어는 가볍게.<br />디자인부터 제작 준비까지, 성북핏.</p></div>
        {/* 삭제금지: ClothSim clothRepresentText 임시 입력 */}
        <label className="sr-only" htmlFor="cloth-represent-text">옷에 넣을 문구 (임시)</label>
        <input id="cloth-represent-text" className="form-input" type="text" maxLength={36} value={clothRepresentText} placeholder="예: OUR CLUB (임시)" onChange={(event) => setClothRepresentText(event.target.value)} />
      </div>
      <div className="runway-wrap"><Runway color="#253952" paused={paused} /></div>
      {/* 삭제금지: ClothSim clothRepresentText 전달 */}
      <ClothSim scene="/cloth" clothRepresentText={clothRepresentText} style={{ width: 800, height: 600 }} />
      <div className="motion-hero-bottom">
        <a href="#process" className="motion-scroll">아래로, 더 만나보기 <ArrowDown size={18} /></a>
        <button className="motion-pause" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? <Play size={15} /> : <Pause size={15} />}{paused ? "모션 재생" : "모션 멈추기"}</button>
      </div>
    </section>

    <section id="process" className="motion-process" aria-labelledby="process-title">
      <div className="motion-section-intro"><h2 id="process-title" data-reveal>한 문장에서<br />한 장의 도안까지.</h2><p data-reveal>복잡한 준비는 덜고,<br />우리가 고를 것만 남겼어요.</p></div>
      <ol className="motion-stack" aria-label="디자인부터 제작 준비까지">
        {stages.map((item, index) => <li key={item.label} className="motion-stack-panel" style={{ "--stack-index": index } as CSSProperties}>
          <div className="motion-stack-copy"><h3>{item.title}</h3><p>{item.text}</p></div>
          <div className="motion-document" data-ui>
            <div className="motion-document-top"><span>성북핏</span><span>{item.label}</span></div>
            <div className="motion-document-content">
              {index === 0 ? <><div className="motion-prompt">“우리 동아리 이름이 들어간<br />네이비 반팔티를 만들고 싶어.”</div><ShirtPreview text="OUR CLUB" /></> : index === 1 ? <><h3>어디서 만들까요?</h3><p>제작 방식과 수량으로 비교해요.</p><div className="motion-supplier"><span>장위 스튜디오</span><Check size={20} /></div><div className="motion-supplier"><span>월곡 크래프트</span><span>자수 · 인쇄</span></div><div className="motion-supplier"><span>종암 메이커스</span><span>단체 제작</span></div><small>업체 정보는 시연용 예시입니다.</small></> : index === 2 ? <><h3>우리의 제작 도안</h3><div className="motion-art"><Artwork design={{ ...DEFAULT_DESIGN, text: "OUR CLUB", ink: "#253952" }} /></div><div className="motion-spec"><span>앞면 중앙</span><span>최대 28 × 35 cm</span><span>PDF 도안서</span></div></> : <><div className="motion-ready"><Check size={38} /></div><h3>전달 준비 완료.</h3><p>도안과 주문 정보가<br />한곳에 모였어요.</p><div className="motion-file"><span>OUR CLUB</span><span>제작 도안서.pdf</span></div><small>현재 데모에서는 실제로 전송되지 않아요.</small></>}
            </div>
          </div>
        </li>)}
      </ol>
    </section>

    <section className="motion-end"><Link href="/design" className="motion-end-link"><span>디자인 시작하기</span><ArrowUpRight className="motion-end-arrow" aria-hidden="true" /></Link></section>
  </main>;
}
