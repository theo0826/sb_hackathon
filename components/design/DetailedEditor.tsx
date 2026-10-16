"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { COLORS, type ArtStyle, type Design } from "@/lib/design";

export default function DetailedEditor({ design, onChange, onClose }: { design: Design; onChange: (patch: Partial<Design>) => void; onClose: () => void }) {
  return <section id="detailed-editor" className="panel detailed-editor" aria-label="상세 편집"><div className="panel-title"><h2>상세 편집</h2><button className="icon-button" onClick={onClose} aria-label="상세 편집 닫기"><X size={20} /></button></div><p className="editor-description">AI에게 수정 요청을 하거나, 여기서 직접 다듬을 수 있어요.</p>
    <fieldset className="field"><legend className="field-label">의류 색상</legend><div className="swatches">{COLORS.map((color) => <button key={color.hex} aria-label={color.name} aria-pressed={color.hex === design.color} className={`swatch ${design.color === color.hex ? "active" : ""}`} style={{ backgroundColor: color.hex }} onClick={() => onChange({ color: color.hex, ink: ["#e8e5dd", "#b5cede"].includes(color.hex) ? "#253952" : "#e9dec2" })} />)}</div></fieldset>
    <div className="field"><label className="field-label" htmlFor="club">문구</label><input id="club" className="form-input" maxLength={36} value={design.text} onChange={(event) => onChange({ text: event.target.value })} disabled={!!design.image} /></div>
    <div className="field"><label className="field-label" htmlFor="scale">도안 크기 <output>{design.scale}%</output></label><input id="scale" type="range" min={50} max={150} value={design.scale} onChange={(event) => onChange({ scale: Number(event.target.value) })} /></div>
    <div className="field"><label className="field-label" htmlFor="position-x">가로 위치 <output>{Math.round(design.x - 260)}</output></label><input id="position-x" type="range" min={160} max={360} value={design.x} onChange={(event) => onChange({ x: Number(event.target.value) })} /></div>
    <div className="field"><label className="field-label" htmlFor="height">세로 위치 <output>{Math.round(design.y - 248)}</output></label><input id="height" type="range" min={165} max={375} value={design.y} onChange={(event) => onChange({ y: Number(event.target.value) })} /></div>
    <div className="field"><label className="field-label" htmlFor="rotation">회전 <output>{design.rotation}°</output></label><input id="rotation" type="range" min={-180} max={180} value={design.rotation} onChange={(event) => onChange({ rotation: Number(event.target.value) })} /></div>
    <div className="field ink-control"><label htmlFor="ink">인쇄 색상</label><input id="ink" type="color" value={design.ink} disabled={!!design.image} onChange={(event) => onChange({ ink: event.target.value })} /><span>{design.ink.toUpperCase()}</span></div>
    <fieldset className="field"><legend className="field-label">인쇄 면</legend><div className="segmented">{(["front", "back"] as const).map((side) => <button key={side} className={design.side === side ? "active" : ""} aria-pressed={design.side === side} onClick={() => onChange({ side })}>{side === "front" ? "앞면" : "뒷면"}</button>)}</div></fieldset>
    <fieldset className="field"><legend className="field-label">도안 스타일</legend><div className="chips">{([{ id: "campus", name: "클래식 배지" }, { id: "type", name: "미니멀" }, { id: "wave", name: "웨이브" }] as { id: ArtStyle; name: string }[]).map((style) => <button className={`chip ${design.style === style.id ? "active" : ""}`} key={style.id} aria-pressed={design.style === style.id} onClick={() => onChange({ style: style.id, image: null })}>{design.style === style.id && <Check size={11} />}{style.name}</button>)}</div></fieldset>
    <button className="outline wide" onClick={() => onChange({ x: 260, y: 248, scale: 100, rotation: 0 })}><RotateCcw size={15} />배치 초기화</button>
  </section>;
}
