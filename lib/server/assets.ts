import "server-only";
import sharp from "sharp";
import { ApiError, checked, database, UUID } from "./backend";
import { simpleDesign, type Design } from "@/lib/design";

export async function assetBytes(id: string, ownerHash: string) {
  if (!UUID.test(id)) throw new ApiError("파일을 찾지 못했어요.", 404);
  const db = database();
  const { data, error } = await db.from("fit_assets").select("storage_path, content_type").eq("id", id).eq("owner_hash", ownerHash).maybeSingle();
  checked(error);
  if (!data) throw new ApiError("파일을 찾지 못했어요.", 404);
  const file = await db.storage.from("fit-private").download(data.storage_path);
  checked(file.error);
  if (!file.data) throw new ApiError("파일을 불러오지 못했어요.", 502);
  return { bytes: Buffer.from(await file.data.arrayBuffer()), type: data.content_type as string };
}
export async function imageBytes(image: string, ownerHash: string) {
  const match = image.match(/^\/api\/assets\/([a-f0-9-]{36})$/i);
  if (match) return (await assetBytes(match[1], ownerHash)).bytes;
  const data = image.match(/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/);
  if (!data || image.length > 3_000_000) throw new ApiError("첨부 이미지가 올바르지 않아요.");
  return Buffer.from(data[2], "base64");
}
export async function saveImage(bytes: Buffer, ownerHash: string, preview = false) {
  if (bytes.length > 20 * 1024 * 1024) throw new ApiError("이미지가 너무 커요.", 413);
  let normalized: Buffer;
  try {
    normalized = await sharp(bytes, { limitInputPixels: 64_000_000 }).rotate().resize({ width: preview ? 1040 : 1536, height: preview ? 1040 : 1536, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  } catch { throw new ApiError("이미지를 읽지 못했어요."); }
  const id = crypto.randomUUID();
  const storagePath = `${ownerHash}/${id}.png`;
  const db = database();
  const upload = await db.storage.from("fit-private").upload(storagePath, normalized, { contentType: "image/png", upsert: false });
  checked(upload.error);
  const row = await db.from("fit_assets").insert({ id, owner_hash: ownerHash, storage_path: storagePath, content_type: "image/png" });
  if (row.error) { await db.storage.from("fit-private").remove([storagePath]); checked(row.error); }
  return `/api/assets/${id}`;
}
export async function persistImage(image: string | null, ownerHash: string) {
  if (!image) return null;
  const bytes = await imageBytes(image, ownerHash);
  return image.startsWith("/api/assets/") ? image : saveImage(bytes, ownerHash);
}
export async function persistDesignImages(design:Design,ownerHash:string):Promise<Design>{
  design=simpleDesign(design);
  if(design.image)await imageBytes(design.image,ownerHash);
  return {...design,image:await persistImage(design.image,ownerHash)};
}
