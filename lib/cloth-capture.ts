import type { ClothData } from "../components/ClothSim";

export type ClothCapture = Pick<ClothData, "front" | "back" | "category" | "text" | "updatedAt"> & { front: string; back: string };

export function isClothCapture(value: unknown): value is ClothCapture {
  if (!value || typeof value !== "object") return false;
  const c = value as ClothCapture;
  const image = (v: unknown) => typeof v === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(v) && v.length < 6_000_000;
  return image(c.front) && image(c.back) && typeof c.text === "string"
    && typeof c.updatedAt === "string" && Number.isFinite(Date.parse(c.updatedAt))
    && (c.category === null || (!!c.category && typeof c.category.id === "string" && typeof c.category.label === "string"));
}

export function readyClothCapture(data: ClothData): data is ClothData & ClothCapture {
  return data.completed === 1 && isClothCapture(data);
}

export function snapshotClothCapture(data: ClothData): ClothCapture {
  if (!readyClothCapture(data)) throw new Error("앞·뒷면 이미지를 준비한 뒤 다시 확인해주세요.");
  const { front, back, category, text, updatedAt } = data;
  return { front, back, category, text, updatedAt };
}
