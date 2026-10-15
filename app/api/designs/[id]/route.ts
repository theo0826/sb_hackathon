import { ApiError, checked, database, failure, json, owner, readBody, UUID } from "@/lib/server/backend";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!UUID.test(id)) throw new ApiError("디자인을 찾지 못했어요.", 404);
    const patch = await readBody(request);
    if (Object.keys(patch).some(key => !["title", "favorite", "trashedAt"].includes(key)) || (patch.title !== undefined && (typeof patch.title !== "string" || !patch.title.trim() || patch.title.length > 100)) || (patch.favorite !== undefined && typeof patch.favorite !== "boolean") || (patch.trashedAt !== undefined && patch.trashedAt !== null && (typeof patch.trashedAt !== "string" || !Number.isFinite(Date.parse(patch.trashedAt))))) throw new ApiError("수정 정보가 올바르지 않아요.");
    const ownerHash = await owner();
    const db = database();
    const row = await db.from("fit_designs").select("payload").eq("id", id).eq("owner_hash", ownerHash).maybeSingle();
    checked(row.error);
    if (!row.data) throw new ApiError("디자인을 찾지 못했어요.", 404);
    const { error } = await db.from("fit_designs").update({ payload: { ...row.data.payload, ...patch, updatedAt: new Date().toISOString() } }).eq("id", id).eq("owner_hash", ownerHash);
    checked(error);
    return json({ success: true });
  } catch (error) { return failure(error); }
}
