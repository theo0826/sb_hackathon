export type ArtStyle = "campus" | "type" | "wave";
export type Side = "front" | "back";
export type Garment = "tee" | "hoodie" | "varsity";
export const GARMENTS: { id: Garment; label: string; name: string }[] = [
  { id: "tee", label: "반팔티", name: "스탠다드 반팔" },
  { id: "hoodie", label: "후드티", name: "오버핏 후드티" },
  { id: "varsity", label: "과잠", name: "캠퍼스 바시티 재킷" },
];
export function garmentName(design: Design) { return GARMENTS.find((item) => item.id === (design.garment || "tee"))!.name; }
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
};

export const COLORS = [
  { hex: "#253952", name: "네이비" },
  { hex: "#e8e5dd", name: "크림" },
  { hex: "#262b34", name: "블랙" },
  { hex: "#236b60", name: "포레스트 그린" },
  { hex: "#b5cede", name: "소프트 블루" },
] as const;

export const DEFAULT_PROMPT = "네이비 반팔티에 대학 동아리 느낌의 배지. 문구는 CAMPUS CLUB. 앞면 중앙에 크림색으로 깔끔하게.";
export const DEFAULT_DESIGN: Design = {
  garment: "tee",
  color: "#253952", ink: "#e9dec2", text: "CAMPUS CLUB", style: "campus",
  side: "front", x: 260, y: 248, scale: 100, rotation: 0, image: null,
};
export const SHIRT_PATH = "M132 48 Q150 65 200 66 Q250 65 268 48 L319 72 L392 154 L335 194 L300 148 L300 426 Q200 442 100 426 L100 148 L65 194 L8 154 L81 72 Z";
export const LONG_SLEEVE_PATH = "M132 48 Q150 65 200 66 Q250 65 268 48 L319 72 L380 330 L324 346 L300 170 L300 426 Q200 442 100 426 L100 170 L76 346 L20 330 L81 72 Z";
export const STORAGE_KEY = "seongbuk-fit:design:v1";

export function mockDesign(prompt: string, current: Design = DEFAULT_DESIGN): Partial<Design> {
  const textMatch = prompt.match(/문구(?:는|를|[:：])?\s*(?:["“']([^"”']{1,36})["”']|([^\n.,。]{1,36}))/);
  const color = /블랙|검정/.test(prompt) ? "#262b34" : /그린|녹색|초록/.test(prompt) ? "#236b60" : /하늘|소프트 블루/.test(prompt) ? "#b5cede" : /크림(?:색)?\s*(?:반팔|티셔츠|후드)|흰색\s*(?:반팔|티셔츠|후드)/.test(prompt) ? "#e8e5dd" : /네이비|남색/.test(prompt) ? "#253952" : current.color;
  const scale = /더\s*작|줄여|축소/.test(prompt) ? Math.max(50, current.scale - 20) : /더\s*크|키워|확대/.test(prompt) ? Math.min(150, current.scale + 20) : /가슴|작게/.test(prompt) ? 65 : current.scale;
  const rotationMatch = prompt.match(/(-?\d{1,3})\s*도/);
  return {
    garment: /과잠|바시티/.test(prompt) ? "varsity" : /후드/.test(prompt) ? "hoodie" : /반팔|티셔츠/.test(prompt) ? "tee" : current.garment || "tee",
    color,
    ink: /(?:문구|인쇄|글자).*(?:빨강|빨간)/.test(prompt) ? "#eb5757" : /(?:문구|인쇄|글자).*(?:파랑|파란)/.test(prompt) ? "#3182f6" : /크림색|흰색|화이트/.test(prompt) && !["#e8e5dd", "#b5cede"].includes(color) ? "#e9dec2" : color !== current.color ? (["#e8e5dd", "#b5cede"].includes(color) ? "#253952" : "#e9dec2") : current.ink,
    style: /웨이브|파도|물결/.test(prompt) ? "wave" : /미니멀|타이포/.test(prompt) ? "type" : /캠퍼스|배지|빈티지/.test(prompt) ? "campus" : current.style,
    side: /등판|뒷면/.test(prompt) ? "back" : /앞면/.test(prompt) ? "front" : current.side,
    text: textMatch?.[1]?.trim() || textMatch?.[2]?.trim() || current.text,
    x: /중앙/.test(prompt) ? 260 : /가슴|작게/.test(prompt) ? 302 : current.x,
    y: /중앙/.test(prompt) ? 248 : /가슴|작게/.test(prompt) ? 210 : /아래로/.test(prompt) ? Math.min(375, current.y + 20) : /위로/.test(prompt) ? Math.max(165, current.y - 20) : current.y,
    scale,
    rotation: rotationMatch ? Math.max(-180, Math.min(180, Number(rotationMatch[1]))) : current.rotation,
    image: /로고\s*없이|이미지\s*없이/.test(prompt) ? null : current.image,
  };
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
    && typeof d.scale === "number" && d.scale >= 50 && d.scale <= 150
    && typeof d.rotation === "number" && d.rotation >= -180 && d.rotation <= 180
    && (d.image === null || (typeof d.image === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(d.image) && d.image.length <= 3_000_000));
}
