"use client";
import BrandLogo from "@/components/layout/BrandLogo";
import AccountMenu from "@/components/layout/AccountMenu";
import { useRef, useState } from "react";
import { useDesignSession } from "@/lib/design-session";
import { getClothData, useClothData } from "@/components/ClothSim/clothdata/store";
import { readyClothCapture } from "@/lib/cloth-capture";
import { getClothScene, savedClothDesign, snapshotClothDesign } from "@/lib/cloth-scene-session";
import { getLibraryItem, saveLibraryItem } from "@/lib/library";
import SupplierAsset from "./SupplierAsset";


export default function SupplierHeader({ showSave = true }: { accountMenu?: boolean; showSave?: boolean }) {
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
  return <header className="supplier-header"><BrandLogo/><div className="supplier-header-actions">{showSave && <button type="button" className="supplier-save" disabled={saving || !readyClothCapture(cloth)} onClick={save}><SupplierAsset name="cb3ac.svg" /><span className="supplier-desktop">{saving ? "저장 중" : "저장하기"}</span><span className="supplier-mobile">{saving ? "저장 중" : "저장"}</span></button>}<AccountMenu/></div>{feedback && <p className="supplier-save-feedback" role={error ? "alert" : "status"}>{feedback}</p>}</header>;
}
