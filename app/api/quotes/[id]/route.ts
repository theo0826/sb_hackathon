import { ApiError, checked, database, failure, json, owner, readBody, UUID } from "@/lib/server/backend";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id.startsWith("quote_") || !UUID.test(id.slice(6))) throw new ApiError("요청서를 찾지 못했어요.", 404);
    const { data, error } = await database().from("fit_quotes").select("payload").eq("id", id.slice(6)).eq("owner_hash", await owner()).maybeSingle();
    checked(error);
    if (!data) throw new ApiError("요청서를 찾지 못했어요.", 404);
    const quote = { ...data.payload }; delete quote._inputHash;
    return json({ quote });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id.startsWith("quote_") || !UUID.test(id.slice(6))) throw new ApiError("요청서를 찾지 못했어요.", 404);
    const patch = await readBody(request);
    if (Object.keys(patch).length !== 1 || !("trashedAt" in patch) || (patch.trashedAt !== null && (typeof patch.trashedAt !== "string" || !Number.isFinite(Date.parse(patch.trashedAt))))) throw new ApiError("삭제 또는 복원 정보가 올바르지 않아요.");
    const ownerHash = await owner(), db = database();
    const row = await db.from("fit_quotes").select("payload").eq("id", id.slice(6)).eq("owner_hash", ownerHash).maybeSingle();
    checked(row.error);
    if (!row.data) throw new ApiError("요청서를 찾지 못했어요.", 404);
    const { error } = await db.from("fit_quotes").update({ payload: { ...row.data.payload, trashedAt: patch.trashedAt === null ? null : new Date().toISOString() } }).eq("id", id.slice(6)).eq("owner_hash", ownerHash);
    checked(error);
    return json({ success: true });
  } catch (error) { return failure(error); }
}
