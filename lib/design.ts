export type ArtStyle = "campus" | "type" | "wave";
export type Side = "front" | "back";
export type Garment = "tee" | "hoodie" | "varsity";
export type PrintPlacement = { id: string; side: Side; x: number; y: number; widthCm: number; heightCm: number; rotation: number; content?: "artwork"|"text"; text?: string; ink?: string };
export type FabricStyle = { pattern: "solid"|"stripes"|"hoops"|"diagonal"|"checker"|"gradient"|"custom"; secondaryColor: string; trimColor: string; density: number; sleeveColor?: string|null };
export const GARMENTS: { id: Garment; label: string; name: string }[] = [
  { id: "tee", label: "반팔티", name: "스탠다드 반팔" },
];
export function garmentName(design: Design) { return GARMENTS.find(item=>item.id===design.garment)?.name || "스탠다드 반팔"; }
export type Design = {
  garment?: Garment;
  color: string;
  ink: string;
  text: string;
  style: ArtStyle;
  side: Side;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  image: string | null;
  placements?: PrintPlacement[];
  fabric?: FabricStyle;
  fabricImage?: string | null;
};

// Keep historical payloads readable; all active edits use a plain tee and logo only.
export function simpleDesign(design:Design):Design {
  const result:Design={...design,garment:"tee"};
  delete result.fabric;delete result.fabricImage;
  if(result.placements){const logos=result.placements.filter(p=>p.id!=="back-number").slice(0,2).map(p=>({...p,content:"artwork" as const,text:""}));if(logos.length)result.placements=logos;else delete result.placements;}
  return result;
}

export function bodyPanelSize(garment: Garment = "tee") {
  return { widthMm: garment === "hoodie" ? 580 : garment === "varsity" ? 560 : 520, heightMm: garment === "hoodie" ? 740 : garment === "varsity" ? 680 : 700 };
}
export function placementDesign(design: Design, placement: PrintPlacement): Design {
  return { ...design, placements: undefined, side: placement.side, x: placement.x, y: placement.y, rotation: placement.rotation,
    scale: placement.widthCm * 10 / bodyPanelSize(design.garment).widthMm * 1.22 / .94 * 100 };
}
export function placementLabel(placement: PrintPlacement) {
  return `${placement.side === "front" ? "앞면" : "등판"} ${placement.side === "front" && placement.x > 285 ? "왼쪽 가슴" : placement.x < 235 ? "오른쪽" : "중앙"}`;
}
export function printSummary(design:Design) {
  return design.placements?`${[...new Set(design.placements.map(p=>p.side==="front"?"앞면":"등판"))].join(" + ")} · ${design.placements.length}개 배치`:`${design.side==="front"?"앞면":"등판"} · ${design.scale}% · ${design.rotation}°`;
}
export function defaultClubPlacements(): PrintPlacement[] {
  return [{ id: "front-chest", side: "front", x: 302, y: 210, widthCm: 8, heightCm: 8, rotation: 0 },
    { id: "back-main", side: "back", x: 260, y: 248, widthCm: 26, heightCm: 26, rotation: 0 }];
}

export const COLORS = [
  { hex: "#253952", name: "네이비" },
  { hex: "#e8e5dd", name: "크림" },
  { hex: "#262b34", name: "블랙" },
  { hex: "#236b60", name: "포레스트 그린" },
  { hex: "#b5cede", name: "소프트 블루" },
] as const;

export const DEFAULT_PROMPT = "네이비 반팔티에 성북구 주민 모임의 배지. 문구는 OUR GROUP. 앞면 중앙에 크림색으로 깔끔하게.";
export const DEFAULT_DESIGN: Design = {
  garment: "tee",
  color: "#253952", ink: "#e9dec2", text: "OUR GROUP", style: "campus",
  side: "front", x: 260, y: 248, scale: 100, rotation: 0, image: null,
};
export const SHIRT_PATH = "M132 48 Q150 65 200 66 Q250 65 268 48 L319 72 L392 154 L335 194 L300 148 L300 426 Q200 442 100 426 L100 148 L65 194 L8 154 L81 72 Z";
export const LONG_SLEEVE_PATH = "M132 48 Q150 65 200 66 Q250 65 268 48 L319 72 L380 330 L324 346 L300 170 L300 426 Q200 442 100 426 L100 170 L76 346 L20 330 L81 72 Z";
export const STORAGE_KEY = "seongbuk-fit:design:v1";

export function mockDesign(prompt: string, current: Design = DEFAULT_DESIGN): Partial<Design> {
  const base=simpleDesign(current);
  const name=prompt.match(/(?:동아리명|단체명|모임명|문구)(?:은|는|를|[:：])?\s*["“']([^"”']{1,36})["”']/)?.[1];
  const both=/앞뒤|(?:가슴|앞면).*(?:등판|뒷면)|(?:등판|뒷면).*(?:가슴|앞면)/.test(prompt);
  const side:Side=both?"front":/등판|뒷면/.test(prompt)?"back":/가슴|앞면/.test(prompt)?"front":base.side;
  const chest=/가슴/.test(prompt),center=/중앙/.test(prompt);
  let placements=both?defaultClubPlacements():base.placements;
  if(!both&&(chest||center||/등판|뒷면/.test(prompt))&&!/더\s*크|더\s*작|줄여|키워/.test(prompt))placements=[{id:side==="back"?"back-main":chest?"front-chest":"front-main",side,x:chest?302:260,y:chest?210:248,widthCm:chest?8:26,heightCm:chest?8:26,rotation:0,content:"artwork"}];
  placements=placements?.map(p=>p.side===side?{...p,widthCm:/더\s*크|키워|확대/.test(prompt)?Math.min(30,p.widthCm+2):/더\s*작|줄여|축소/.test(prompt)?Math.max(2,p.widthCm-2):p.widthCm,heightCm:/더\s*크|키워|확대/.test(prompt)?Math.min(30,p.heightCm+2):/더\s*작|줄여|축소/.test(prompt)?Math.max(2,p.heightCm-2):p.heightCm}:p);
  return simpleDesign({...base,garment:"tee",side,text:name||base.text,color:/검정|블랙/.test(prompt)?"#262b34":/흰색|화이트/.test(prompt)?"#e8e5dd":/그린|초록|녹색/.test(prompt)?"#236b60":/네이비|남색/.test(prompt)?"#253952":base.color,...(placements?{placements}:{}),image:/로고\s*없이|이미지\s*없이/.test(prompt)?null:base.image});
}
export function isDesign(value: unknown): value is Design {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return (d.garment === undefined || ["tee", "hoodie", "varsity"].includes(d.garment as string))
    && typeof d.color === "string" && /^#[0-9a-f]{6}$/i.test(d.color)
    && typeof d.ink === "string" && /^#[0-9a-f]{6}$/i.test(d.ink)
    && typeof d.text === "string" && d.text.length <= 36
    && ["campus", "type", "wave"].includes(d.style as string)
    && ["front", "back"].includes(d.side as string)
    && typeof d.x === "number" && d.x >= 160 && d.x <= 360
    && typeof d.y === "number" && d.y >= 165 && d.y <= 375
    && typeof d.scale === "number" && d.scale >= 1 && d.scale <= 150
    && typeof d.rotation === "number" && d.rotation >= -180 && d.rotation <= 180
    && (d.image === null || (typeof d.image === "string" && ((/^data:image\/(png|jpeg|webp);base64,/.test(d.image) && d.image.length <= 3_000_000) || /^\/api\/assets\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(d.image))))
    && (d.placements === undefined || (Array.isArray(d.placements) && d.placements.length >= 1 && d.placements.length <= 4 && d.placements.every(isPrintPlacement) && new Set(d.placements.map(p=>p.id)).size === d.placements.length))
    && (d.fabric === undefined || isFabricStyle(d.fabric)) && (d.fabricImage === undefined || isImageSource(d.fabricImage));
}
export function isPrintPlacement(value: unknown): value is PrintPlacement {
  if (!value || typeof value !== "object") return false;
  const p = value as PrintPlacement;
  return typeof p.id === "string" && /^[a-z][a-z0-9-]{0,39}$/.test(p.id) && ["front","back"].includes(p.side)
    && [p.x,p.y,p.widthCm,p.heightCm,p.rotation].every(Number.isFinite) && p.x>=160 && p.x<=360 && p.y>=165 && p.y<=375
    && p.widthCm>=1 && p.widthCm<=35 && p.heightCm>=1 && p.heightCm<=40 && p.rotation>=-180 && p.rotation<=180
    && (p.content===undefined || ["artwork","text"].includes(p.content)) && (p.text===undefined || (typeof p.text==="string" && p.text.length<=60)) && (p.ink===undefined || /^#[a-f0-9]{6}$/i.test(p.ink))
    && (p.content!=="text" || !!p.text?.trim());
}
export function isFabricStyle(value: unknown): value is FabricStyle {
  if(!value || typeof value!=="object")return false;
  const f=value as FabricStyle;
  return ["solid","stripes","hoops","diagonal","checker","gradient","custom"].includes(f.pattern) && /^#[a-f0-9]{6}$/i.test(f.secondaryColor) && /^#[a-f0-9]{6}$/i.test(f.trimColor) && Number.isFinite(f.density) && f.density>=2 && f.density<=24 && (f.sleeveColor==null || /^#[a-f0-9]{6}$/i.test(f.sleeveColor));
}
export function isImageSource(value: unknown): value is string|null {
  return value===null || (typeof value==="string" && ((/^data:image\/(png|jpeg|webp);base64,/.test(value)&&value.length<=3_000_000)||/^\/api\/assets\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)));
}
