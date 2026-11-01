"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import SupplierAsset from "@/components/supplier/SupplierAsset";
import Asset from "./WorkspaceAsset";

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div ref={root} className="handdam-account-menu" onBlur={event => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" className="handdam-account-trigger" aria-label="마이페이지 메뉴" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><SupplierAsset name="50916.svg" className="account-icon-desktop"/><span className="account-icon-mobile"><SupplierAsset name="5fcd1.svg"/><SupplierAsset name="8452a.svg"/></span></button>
    {open && <nav id={id} className="handdam-account-dropdown" aria-label="마이페이지 메뉴">{[["design", "디자인", "062f7.svg"], ["orders", "주문", "03f14.svg"], ["guide", "이용 방법", "751c5.svg"]].map(([tab, label, icon]) => <Link key={tab} href={`/my?tab=${tab}`} onClick={() => setOpen(false)}><Asset name={icon}/><strong>{label}</strong></Link>)}</nav>}
  </div>;
}
