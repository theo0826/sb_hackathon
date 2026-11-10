"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import Image from "next/image";
import BrandLogo from "@/components/layout/BrandLogo";
import AccountMenu from "@/components/layout/AccountMenu";
import { publicPath } from "@/lib/deployment";
import { filmMarkup } from "./onboarding-markup";
import { initializeOnboarding } from "./onboarding-animation";

export default function Onboarding() {
  const root = useRef<HTMLElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [startPressed, setStartPressed] = useState(false);
  // Keep React from replacing the film DOM when script readiness changes.
  const filmHTML = useMemo(() => ({
    __html: filmMarkup.replaceAll(/(src="|url\()img\//g, `$1${publicPath("/onboarding/img/")}`),
  }), []);
  useEffect(() => {
    if (!scriptReady) return;
    const gsap = (window as Window & { gsap?: unknown }).gsap;
    if (!root.current || !gsap) return;
    // Effects restart on Strict Mode replay and when Next restores this page.
    return initializeOnboarding(root.current, gsap);
  }, [scriptReady]);
  return <main ref={root} id="main-content" className="handdam-onboarding" data-ui>
    <header className="top"><div className="top-in"><BrandLogo/><AccountMenu/></div></header>
    <section className="wrap"><div className="hero">
      <div className="msg"><h1>말 한마디면<br/><em>단체복 완성</em></h1><p className="lead">성북 대학생과 성북 봉제공장이<br/>함께 만들어요</p>
        <Link className="cta" href="/main" data-pressed={startPressed || undefined}
          onPointerDown={() => setStartPressed(true)} onPointerUp={() => setStartPressed(false)}
          onPointerCancel={() => setStartPressed(false)} onPointerLeave={() => setStartPressed(false)} onBlur={() => setStartPressed(false)}>
          단체복 만들어보기 <Image src={publicPath("/onboarding/start-arrow.svg")} alt="" width={18} height={18} unoptimized/>
        </Link>
        <div className="steps" aria-label="이용 순서"><span>말로 주문</span><i>›</i><span>AI 디자인</span><i>›</i><span>도안 완성</span><i>›</i><span>성북 공장 제작</span><i>›</i><span>집으로 배송</span></div></div>
      <div className="film-wrap" dangerouslySetInnerHTML={filmHTML}/>
    </div></section>
    <Script src={publicPath("/vendor/gsap-3.12.2.min.js")} onReady={() => setScriptReady(true)}/>
  </main>;
}
