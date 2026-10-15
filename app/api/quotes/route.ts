import { isDesign } from "@/lib/design";
import { getSupplier } from "@/lib/suppliers";
import { isOrderDraft, totalQuantity, validateOrder, validateDesignForSupplier, type QuoteRecord } from "@/lib/quote";
import { convertQuote } from "@/lib/server/ai";
import { sampleProductionDocument } from "@/lib/production-document";
import { persistDesignImages } from "@/lib/server/assets";
import { ApiError, checked, database, failJob, failure, finishJob, hash, json, owner, previous, readBody, requireAI, reserve, UUID } from "@/lib/server/backend";
export const runtime = "nodejs";
export const maxDuration = 300;
function visibleQuote(payload: Record<string, unknown>) { const quote = { ...payload }; delete quote._inputHash; return quote; }
export async function GET() {
  try {
    const { data, error } = await database().from("fit_quotes").select("payload").eq("owner_hash", await owner()).order("created_at", { ascending: false }).limit(100);
    checked(error);
    return json({ quotes: data?.map(row => visibleQuote(row.payload)) || [] });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  let jobId: string | undefined;
  let ownerHash = "";
  try {
    const body = await readBody(request);
    const supplier = typeof body.supplierId === "string" ? getSupplier(body.supplierId) : undefined;
    if (!supplier || !isDesign(body.design) || !isOrderDraft(body.order) || typeof body.filename !== "string" || body.filename.length > 255) throw new ApiError("업체, 도안 또는 주문 정보가 올바르지 않아요.");
    const fields = validateOrder(body.order, supplier);
    const placementError=validateDesignForSupplier(body.design,supplier);if(placementError)throw new ApiError(placementError);
    if (Object.keys(fields).length) return json({ error: "주문 조건을 확인해주세요.", fields }, 400);
    if (body.conversionMode !== undefined && !["ai", "sample"].includes(body.conversionMode as string)) throw new ApiError("변환 방식을 확인해주세요.");
    if (body.conversionMode === "sample") {
      if (typeof body.requestKey !== "string" || !UUID.test(body.requestKey)) throw new ApiError("요청 식별자가 올바르지 않아요.");
      ownerHash = await owner(true);
      const db = database(), fingerprint = hash(JSON.stringify(body));
      const existing = await db.from("fit_quotes").select("payload").eq("id", body.requestKey).eq("owner_hash", ownerHash).maybeSingle();
      checked(existing.error);
      if (existing.data) {
        if (existing.data.payload._inputHash !== fingerprint) throw new ApiError("같은 요청 식별자로 다른 도안을 제출할 수 없어요.", 409);
        return json({ mode:"mock", delivery:"not_sent", quote:visibleQuote(existing.data.payload) });
      }
      const design = await persistDesignImages(body.design,ownerHash);
      const order = { ...body.order, group: body.order.group.trim(), contactEmail: body.order.contactEmail.trim(), memo: body.order.memo.trim() };
      const document = sampleProductionDocument(supplier, design, order, hash(JSON.stringify({design,width:order.printWidthCm,height:order.printHeightCm})).slice(0,24));
      const quote: QuoteRecord = { id:`quote_${body.requestKey}`,mode:"mock",status:"prepared",createdAt:new Date().toISOString(),supplierId:supplier.id,design,filename:body.filename,order,quantity:totalQuantity(order),format:supplier.format,document };
      const saved = await db.from("fit_quotes").insert({id:body.requestKey,owner_hash:ownerHash,payload:{...quote,_inputHash:fingerprint}});
      if (saved.error?.code === "23505") {
        const duplicate = await db.from("fit_quotes").select("payload").eq("id",body.requestKey).eq("owner_hash",ownerHash).maybeSingle();
        checked(duplicate.error);
        if (!duplicate.data || duplicate.data.payload._inputHash!==fingerprint) throw new ApiError("요청 식별자가 이미 사용됐어요.",409);
        return json({mode:"mock",delivery:"not_sent",quote:visibleQuote(duplicate.data.payload)});
      }
      checked(saved.error);
      return json({mode:"mock",delivery:"not_sent",quote},201);
    }
    requireAI();
    ownerHash = await owner(true);
    const reserved = await reserve(ownerHash, body, "quote", `업체 양식 변환: ${supplier.id}`);
    if (!reserved.fresh) {
      const existing = await database().from("fit_quotes").select("payload").eq("id", reserved.job.id).eq("owner_hash", ownerHash).maybeSingle();
      checked(existing.error);
      if (existing.data) {
        const result = { mode: "live", delivery: "not_sent", quote: existing.data.payload };
        await finishJob(reserved.job.id, ownerHash, result);
        return json(result);
      }
      return previous(reserved.job);
    }
    jobId = reserved.job.id;
    const design = await persistDesignImages(body.design,ownerHash);
    const order = { ...body.order, group: body.order.group.trim(), contactEmail: body.order.contactEmail.trim(), memo: body.order.memo.trim() };
    const document = await convertQuote(supplier, design, order, ownerHash);
    const quote: QuoteRecord = { id: `quote_${jobId}`, mode: "live", status: "prepared", createdAt: new Date().toISOString(), supplierId: supplier.id, design, filename: body.filename, order, quantity: totalQuantity(order), format: supplier.format, document };
    const saved = await database().from("fit_quotes").insert({ id: jobId, owner_hash: ownerHash, payload: quote });
    checked(saved.error);
    const result = { mode: "live", delivery: "not_sent", quote };
    await finishJob(jobId, ownerHash, result);
    return json(result, 201);
  } catch (error) {
    if (jobId) await failJob(jobId, ownerHash).catch(() => {});
    return failure(error);
  }
}
