import { DEFAULT_DESIGN, isDesign } from "@/lib/design";
import { generateDesign } from "@/lib/server/ai";
import { persistDesignImages } from "@/lib/server/assets";
import { ApiError, failJob, failure, finishJob, json, owner, previous, readBody, requireAI, reserve } from "@/lib/server/backend";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  let jobId: string | undefined;
  let ownerHash = "";
  try {
    const body = await readBody(request);
    if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 300) throw new ApiError("디자인 설명을 1~300자로 입력해주세요.");
    const current = body.currentDesign ?? DEFAULT_DESIGN;
    if (!isDesign(current)) throw new ApiError("현재 디자인 정보가 올바르지 않아요.");
    requireAI();
    ownerHash = await owner(true);
    const reserved = await reserve(ownerHash, body, "design", body.prompt.trim());
    if (!reserved.fresh) return previous(reserved.job);
    jobId = reserved.job.id;
    const persisted = await persistDesignImages(current,ownerHash);
    const generated = await generateDesign(body.prompt.trim(), persisted, ownerHash);
    const result = { mode: "live", status: "completed", jobId, ...generated };
    await finishJob(jobId, ownerHash, result);
    return json(result);
  } catch (error) {
    if (jobId) await failJob(jobId, ownerHash).catch(() => {});
    return failure(error);
  }
}
