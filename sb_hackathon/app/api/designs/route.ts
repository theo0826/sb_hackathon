import { isDesign } from "@/lib/design";
import { persistImage, persistDesignImages } from "@/lib/server/assets";
import { ApiError, checked, database, failure, json, owner, readBody } from "@/lib/server/backend";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { data, error } = await database().from("fit_designs").select("payload").eq("owner_hash", await owner()).order("created_at", { ascending: false }).limit(100);
    checked(error);
    return json({ items: data?.map(row => row.payload) || [] });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    if (!isDesign(body.design) || typeof body.prompt !== "string" || body.prompt.length > 300 || typeof body.filename !== "string" || body.filename.length > 255 || typeof body.title !== "string" || body.title.length > 100 || (body.preview !== null && typeof body.preview !== "string")) throw new ApiError("저장할 디자인 정보가 올바르지 않아요.");
    const ownerHash = await owner(true);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const item = { id: `cloud_${id}`, kind: "design", title: body.title, createdAt: now, updatedAt: now, favorite: false, design: await persistDesignImages(body.design,ownerHash), prompt: body.prompt, filename: body.filename, preview: await persistImage(body.preview as string | null, ownerHash) };
    const { error } = await database().from("fit_designs").insert({ id, owner_hash: ownerHash, payload: item });
    checked(error);
    return json({ item }, 201);
  } catch (error) { return failure(error); }
}
