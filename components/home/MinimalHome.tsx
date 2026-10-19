"use client";
import { publicPath } from "@/lib/deployment";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DEFAULT_DESIGN } from "@/lib/design";
import { useDesignSession } from "@/lib/design-session";
// ClothSim 삭제금지 연동은 디자인 화면의 ClothSimulationPreview.tsx로 이동했습니다.
const looks = [
  { image: "campus", title: "우리 모임의 이름을 입어요.", text: "클래식 배지 · 네이비 반팔", garment: "tee" as const, style: "campus" as const, lettering: "CAMPUS CLUB", color: "#253952" },
  { image: "wave", title: "우리만의 리듬으로.", text: "웨이브 그래픽 · 포레스트 후드", garment: "hoodie" as const, style: "wave" as const, lettering: "SEONGBUK CREW", color: "#236b60" },
  { image: "club", title: "같은 마음, 같은 옷.", text: "모임 타이포 · 단체 재킷", garment: "varsity" as const, style: "type" as const, lettering: "OUR CLUB", color: "#262b34" },
  { image: "print", title: "작은 문구도, 우리답게.", text: "미니멀 타이포 · 소프트 블루", garment: "tee" as const, style: "type" as const, lettering: "FIT TOGETHER", color: "#b5cede" },
];
export default function MinimalHome() {
  const root = useRef<HTMLElement>(null);
  const session = useDesignSession();
  useEffect(() => {
    const nodes = root.current?.querySelectorAll<HTMLElement>("[data-reveal]"); if (!nodes || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) return; animations.push(entry.target.animate([{ opacity: .4, transform: "translateY(20px)" }, { opacity: 1, transform: "none" }], { duration: 1200, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" })); observer.unobserve(entry.target); }), { threshold: .12 });
    nodes.forEach(node => observer.observe(node)); return () => { observer.disconnect(); animations.forEach(item => item.cancel()); };
  }, []);
  return <main id="main-content" ref={root} className="minimal-home shell">
    <section className="quiet-hero"><h1 data-reveal>우리의 생각을,<br />함께 입는 옷으로.</h1><div className="quiet-hero-copy"><p data-reveal>한 문장의 아이디어부터 제작 도안까지.<br />우리다운 단체티를 천천히 완성해보세요.</p><Link data-reveal className="quiet-link" href="/design">디자인 시작하기 <ArrowUpRight size={22} /></Link></div></section>

    <section className="quiet-work" aria-labelledby="looks-title"><div className="quiet-section-head"><h2 id="looks-title" data-reveal>어떤 모습이 우리다울까요?</h2><p data-reveal>마음에 드는 예시에서 시작해보세요.</p></div><div className="quiet-looks">{looks.map(look => <Link key={look.image} href="/design" className="quiet-look" onClick={() => session.loadDesign({ design: { ...DEFAULT_DESIGN, garment: look.garment, style: look.style, text: look.lettering, color: look.color }, prompt: "", filename: look.title })}><div className="quiet-picture" data-reveal><Image src={publicPath(`/previews/${look.image}.webp`)} alt={look.text + " 예시 디자인"} width={800} height={900} unoptimized sizes="(max-width: 640px) 90vw, 46vw" /><ArrowUpRight size={24} /></div><h3 data-reveal>{look.title}</h3><p data-reveal>{look.text}</p></Link>)}</div></section>
    <section className="quiet-process"><h2 data-reveal>디자인에서 제작 준비까지.</h2><div className="quiet-process-copy"><p data-reveal>고객용 UV 전개도로 3D 미리보기를 확인하고, 업체를 선택하면 해당 양식의 봉제·인쇄 패턴으로 변환해요.</p><p data-reveal>현재 세 가지 업체 양식은 목업입니다. 실제 제작 전에는 업체의 치수와 패턴 검수가 필요해요.</p><Link className="quiet-link" href="/patterns" data-reveal>세 가지 양식 비교하기 <ArrowUpRight size={20} /></Link></div></section>
  </main>;
}
