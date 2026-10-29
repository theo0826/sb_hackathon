"use client";
import BrandLogo from "@/components/layout/BrandLogo";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDesignSession } from "@/lib/design-session";
import { getClothData, useClothData } from "@/components/ClothSim/clothdata/store";
import { readyClothCapture } from "@/lib/cloth-capture";
import { getClothScene, savedClothDesign, snapshotClothDesign } from "@/lib/cloth-scene-session";
import { getLibraryItem, saveLibraryItem } from "@/lib/library";
import SupplierAsset from "./SupplierAsset";
import Asset from "@/components/layout/WorkspaceAsset";

export default function SupplierHeader({ accountMenu = false, showSave = true }: { accountMenu?: boolean; showSave?: boolean }) {
  const [open, setOpen] = useState(false);
  const profile = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !profile.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const { design, order, filename, restoredDesignId, rememberSavedDesign } = useDesignSession();
  const cloth = useClothData();
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);
  async function save() {
    if (busy.current || !readyClothCapture(getClothData())) return;
    busy.current = true; setSaving(true); setFeedback(""); setError(false);
    try {
      const data = getClothData();
      let scene = getClothScene(data.text);
      if (!scene && restoredDesignId) {
        const source = savedClothDesign((await getLibraryItem(restoredDesignId))?.cloth);
        if (source?.data.text === data.text) scene = source.scene;
      }
      if (!scene) throw new Error("디자인 화면에서 3D 장면을 준비한 뒤 저장해주세요.");
      const saved = await saveLibraryItem({ kind: "design", design, order, filename, prompt: data.text, title: design.text || filename || "우리 단체티", preview: data.front, cloth: snapshotClothDesign(data, scene) });
      rememberSavedDesign(saved.id, saved.preview); setFeedback("디자인을 저장했어요.");
    } catch (cause) { setError(true); setFeedback(cause instanceof Error ? cause.message : "저장하지 못했어요."); }
    finally { busy.current = false; setSaving(false); }
  }
  return <header className="supplier-header"><BrandLogo/><div className="supplier-header-actions">{showSave && <button type="button" className="supplier-save" disabled={saving || !readyClothCapture(cloth)} onClick={save}><SupplierAsset name="cb3ac.svg" /><span className="supplier-desktop">{saving ? "저장 중" : "저장하기"}</span><span className="supplier-mobile">{saving ? "저장 중" : "저장"}</span></button>}{accountMenu ? <div ref={profile} className="workspace-profile" onBlur={event => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}><button ref={trigger} type="button" className="supplier-account" aria-label="마이페이지 메뉴" aria-expanded={open} aria-controls="workspace-profile-menu" onClick={() => setOpen(!open)}><SupplierAsset name="50916.svg" className="supplier-desktop"/><span className="supplier-mobile supplier-mobile-avatar"><SupplierAsset name="5fcd1.svg"/><SupplierAsset name="8452a.svg"/></span></button>{open && <nav id="workspace-profile-menu" className="workspace-profile-menu" aria-label="마이페이지 메뉴">{[["design","디자인","저장한 디자인을 이어서 만들어요","062f7.svg"],["orders","주문","견적과 제작 진행을 확인해요","03f14.svg"],["guide","이용 방법","디자인부터 제작 준비까지","751c5.svg"]].map(([tab,label,,icon]) => <Link key={tab} href={`/my?tab=${tab}`} onClick={() => setOpen(false)}><Asset name={icon}/><span><strong>{label}</strong></span></Link>)}</nav>}</div> : <Link href="/my" className="supplier-account" aria-label="마이페이지"><SupplierAsset name="50916.svg" className="supplier-desktop" /><span className="supplier-mobile supplier-mobile-avatar"><SupplierAsset name="5fcd1.svg" /><SupplierAsset name="8452a.svg" /></span></Link>}</div>{feedback && <p className="supplier-save-feedback" role={error ? "alert" : "status"}>{feedback}</p>}</header>;
}
