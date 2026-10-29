"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UserRound, ChevronDown, PenLine, Package, BookOpen } from "lucide-react";


export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const profile = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (event.target instanceof Node && !profile.current?.contains(event.target)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  if (pathname === "/my" || pathname === "/quotes/prepare" || pathname === "/" || pathname === "/design" || pathname === "/suppliers") return null;
  return (
    <header className="site-header" data-workspace={pathname === "/design" || pathname === "/suppliers" || pathname.startsWith("/quotes/") || pathname.startsWith("/orders/")}>
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="한땀 홈">
          한땀
        </Link>
        <div ref={profile} className="profile-control" onBlur={event => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
          <button ref={trigger} className="profile-trigger" aria-expanded={open} aria-controls="profile-menu" onClick={() => setOpen(value => !value)}><span className="profile-avatar"><UserRound size={17}/></span><span>마이페이지</span><ChevronDown size={15} className={open ? "is-open" : ""}/></button>
          {open && <nav id="profile-menu" className="profile-menu" aria-label="마이페이지 메뉴"><p>나의 한땀</p><Link href="/my?tab=design" onClick={() => setOpen(false)}><PenLine size={17}/><span>디자인<small>저장한 디자인을 이어서 만들어요</small></span></Link><Link href="/my?tab=orders" onClick={() => setOpen(false)}><Package size={17}/><span>주문<small>견적과 제작 진행을 확인해요</small></span></Link><Link href="/my?tab=guide" onClick={() => setOpen(false)}><BookOpen size={17}/><span>이용 방법<small>디자인부터 제작 준비까지</small></span></Link></nav>}
        </div>
      </div>
    </header>
  );
}
