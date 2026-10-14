import { isDesign } from "@/lib/design";
import { getSupplier } from "@/lib/suppliers";
import { isOrderDraft, totalQuantity, validateOrder, type QuoteRecord } from "@/lib/quote";

// 테스트용 계약: 실제 업체 전송·Supabase 기록은 하지 않습니다.
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "올바른 JSON 형식이 필요해요." }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "견적 요청 정보가 필요해요." }, { status: 400 });
  const value = body as Record<string, unknown>;
  const supplier = typeof value.supplierId === "string" ? getSupplier(value.supplierId) : undefined;
  if (!supplier || !isDesign(value.design) || !isOrderDraft(value.order) || typeof value.filename !== "string" || value.filename.length > 255) return Response.json({ error: "업체, 도안 또는 주문 정보가 올바르지 않아요." }, { status: 400 });
  const errors = validateOrder(value.order, supplier);
  if (Object.keys(errors).length) return Response.json({ error: "주문 조건을 확인해주세요.", fields: errors }, { status: 400 });
  const record: QuoteRecord = { id: `quote_${crypto.randomUUID()}`, mode: "mock", status: "prepared", createdAt: new Date().toISOString(), supplierId: supplier.id, design: value.design, filename: value.filename, order: { ...value.order, group: value.order.group.trim(), contactEmail: value.order.contactEmail.trim(), memo: value.order.memo.trim() }, quantity: totalQuantity(value.order), format: supplier.format };
  return Response.json({ mode: "mock", delivery: "not_sent", quote: record }, { status: 201 });
}
