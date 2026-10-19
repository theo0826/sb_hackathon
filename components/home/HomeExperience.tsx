"use client";
import { publicPath } from "@/lib/deployment";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { DEFAULT_DESIGN, type ArtStyle, type Garment } from "@/lib/design";
import { useDesignSession } from "@/lib/design-session";

const examples: { id: string; name: string; garment: Garment; color: string; text: string; style: ArtStyle; prompt: string }[] = [
  { id: "campus", name: "모임 반팔", garment: "tee", color: "#253952", text: "CAMPUS CLUB", style: "campus", prompt: "네이비 반팔에 클래식 배지, 문구는 CAMPUS CLUB" },
  { id: "wave", name: "크루 후드", garment: "hoodie", color: "#236b60", text: "SEONGBUK CREW", style: "wave", prompt: "그린 후드에 웨이브 도안, 문구는 SEONGBUK CREW" },
  { id: "club", name: "우리 과잠", garment: "varsity", color: "#262b34", text: "OUR CLUB", style: "type", prompt: "블랙 과잠에 타이포그래피, 문구는 OUR CLUB" },
  { id: "print", name: "행사 반팔", garment: "tee", color: "#b5cede", text: "FIT TOGETHER", style: "type", prompt: "소프트 블루 반팔에 타이포그래피, 문구는 FIT TOGETHER" },
];

export default function HomeExperience() {
  const [selected, setSelected] = useState(0);
  const main = useRef<HTMLElement>(null);
  const { resetSession, setDesign, setPrompt } = useDesignSession();
  const example = examples[selected];
  useEffect(() => {
    const root = main.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).style.animationDelay = `${Number((entry.target as HTMLElement).dataset.delay || 0)}ms`;
        entry.target.classList.add("taste-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    root.querySelectorAll("[data-enter]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => { if (!document.hidden && !main.current?.contains(document.activeElement)) setSelected((current) => (current + 1) % examples.length); }, 6500);
    return () => window.clearInterval(timer);
  }, []);
  function start() { resetSession(); setDesign({ ...DEFAULT_DESIGN, garment: example.garment, color: example.color, text: example.text, style: example.style }); setPrompt(example.prompt); }
  return <main ref={main} id="main-content" className="taste-home">
    <div className="taste-stage-layout">
      <aside className="taste-product-stage" aria-label="의류별 예시 디자인">
        <div className="taste-stage-top"><span>성북의 아이디어를 입다</span><span>의류 미리보기</span></div>
        <div className="taste-product-images">{examples.map((item, index) => <Image key={item.id} src={publicPath(`/previews/${item.id}.webp`)} width={1040} height={1040} unoptimized alt={`${item.name}: ${item.text} 예시 도안`} className={selected === index ? "is-selected" : ""} priority={index === 0} />)}</div>
        <div className="taste-stage-bottom"><p>{example.text}</p><div className="taste-garment-tabs" role="group" aria-label="예시 의류 선택">{examples.map((item, index) => <button key={item.id} onClick={() => setSelected(index)} aria-pressed={selected === index} className={selected === index ? "active" : ""}>{item.name}</button>)}</div><span>실제 편집 화면에서 만든 예시 디자인</span></div>
      </aside>
      <div className="taste-reading">
        <section className="taste-intro"><h1 data-enter>우리다운 단체티,<br />한 문장부터.</h1><p data-enter data-delay="80">이웃의 첫 모임부터 가족의 특별한 하루까지. AI와 이야기하며 디자인하고, 성북의 제작 업체에 맞는 도안까지 준비하세요.</p><Link href="/design" onClick={start} className="primary taste-start" data-enter data-delay="160">AI로 단체티 만들기 <ArrowRight size={20} /></Link><p className="taste-note" data-enter data-delay="220">지금은 예시 도안으로 체험할 수 있어요.</p></section>
        <section className="taste-showcase" aria-labelledby="showcase-title"><h2 id="showcase-title" data-enter>같은 마음, 다른 핏.</h2><p data-enter>반팔, 후드, 과잠. 우리 팀에 어울리는 옷을 고르고 원하는 문구와 분위기를 더해보세요.</p><div className="taste-preview-run">{examples.slice(1).map((item, index) => <button key={item.id} onClick={() => { setSelected(index + 1); main.current?.querySelector(".taste-product-stage")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" }); }} aria-label={`${item.name} 예시 선택`} data-enter data-delay={index * 80}><Image src={publicPath(`/previews/${item.id}.webp`)} width={1040} height={1040} unoptimized alt={`${item.text} 도안을 적용한 ${item.name}`} /><span>{item.name}</span></button>)}</div></section>
        <section id="workflow" className="taste-process" aria-labelledby="process-title"><h2 id="process-title" data-enter>디자인에서 제작까지.</h2><ol>
          <li><h3 data-enter>말로 디자인하기</h3><p data-enter>의류를 선택하고 로고나 이미지를 첨부하세요. 색상, 문구, 도안의 크기와 위치도 대화로 요청할 수 있어요.</p><Link href="/design" className="taste-text-link" data-enter>디자인 화면 열기 <ArrowRight size={18} /></Link></li>
          <li><h3 data-enter>우리에게 맞는 업체</h3><p data-enter>제작 방식과 최소 수량을 비교해 업체를 선택하세요. 도안을 어떤 형식으로 전달할지는 업체 기준으로 맞춰드려요.</p><Link href="/suppliers" className="taste-text-link" data-enter>제작 업체 살펴보기 <ArrowRight size={18} /></Link></li>
          <li><h3 data-enter>보낼 자료를 한곳에</h3><p data-enter>수량과 연락처를 입력하면 PDF 또는 이메일 양식을 준비해요. 원본 도안과 미리보기도 함께 보관할 수 있어요.</p><Link href="/my" className="taste-text-link" data-enter>내 보관함 보기 <ArrowRight size={18} /></Link></li>
        </ol></section>
        <section className="taste-close"><p data-enter>우리 팀의 다음 단체티를<br />지금 만들어보세요.</p><Link href="/design" onClick={start} className="primary" data-enter data-delay="80">이 단체티로 시작하기 <ArrowRight size={20} /></Link><p className="taste-note" data-enter>현재 업체 목록과 견적 요청은 체험용입니다.</p></section>
      </div>
    </div>
  </main>;
}
