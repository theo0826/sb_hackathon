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
  // Keep React from replacing the film DOM when script readiness changes.
  const filmHTML = useMemo(() => ({ __html: filmMarkup.replaceAll('src="img/', `src="${publicPath("/onboarding/img/")}`) }), []);
  useEffect(() => {
    if (!scriptReady) return;
    const gsap = (window as Window & { gsap?: unknown }).gsap;
    if (!root.current || !gsap) return;
    // Effects restart on Strict Mode replay and when Next restores this page.
    return initializeOnboarding(root.current, gsap);
  }, [scriptReady]);
  return <main ref={root} id="main-content" className="handdam-onboarding" data-ui>
    <header className="onboarding-header"><BrandLogo/><AccountMenu/></header>
    <section className="wrap"><div className="hero">
      <div className="msg"><h1>한 마디의 말,<br/><em>한 땀</em>의 손길.</h1><p className="lead">말로 그린 우리 단체복을,<br/>성북의 장인이 직접 만들어요.</p><Link className="cta" href="/main">시작하기 <Image src={publicPath("/onboarding/start-arrow.svg")} alt="" width={18} height={18} unoptimized/></Link><div className="steps" aria-label="이용 순서"><span>말로 디자인</span><i>›</i><span>3D로 확인</span><i>›</i><span>도안 완성</span><i>›</i><span>성북 장인과 제작</span></div></div>
      <div className="film-wrap" dangerouslySetInnerHTML={filmHTML}/>
    </div></section>
    <Script src={publicPath("/vendor/gsap-3.12.2.min.js")} onReady={() => setScriptReady(true)}/>
  </main>;
}
