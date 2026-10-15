import { ApiError, checked, database, failure, json, owner, UUID } from "@/lib/server/backend";
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    if (!UUID.test(key)) throw new ApiError("작업을 찾지 못했어요.", 404);
    const { data, error } = await database().from("fit_jobs").select("status, result, created_at").eq("request_key", key).eq("owner_hash", await owner()).maybeSingle();
    checked(error);
    if (!data) throw new ApiError("작업을 찾지 못했어요.", 404);
    if (data.status === "running" && Date.now() - Date.parse(data.created_at) > 360_000) return json({ status: "failed" });
    return json({ status: data.status, result: data.result });
  } catch (error) { return failure(error); }
}
