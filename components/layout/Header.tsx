"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";


export default function Header() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="성북핏 홈">
          <span className="brand-mark" aria-hidden="true">f</span>성북핏
        </Link>
        <nav aria-label="주요 메뉴">
          <Link href="/design" className={pathname === "/design" || pathname === "/suppliers" || pathname === "/editor" || pathname === "/quotes/new" ? "active" : ""} aria-current={pathname === "/design" ? "page" : undefined}>반티 만들기</Link>
          <Link href="/my" className={pathname.startsWith("/my") || (pathname.startsWith("/quotes/") && pathname !== "/quotes/new") ? "active" : ""} aria-current={pathname === "/my" ? "page" : undefined}>마이페이지</Link>
        </nav>
      </div>
    </header>
  );
}
