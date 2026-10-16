import type { DemoOrder } from "./order-workflow";
import { sampleProductionDocument } from "./production-document";
import { totalQuantity, type QuoteRecord } from "./quote";
import { getSupplier } from "./suppliers";

export function orderQuoteId(order: Pick<DemoOrder, "id">) { return `quote_${order.id.slice(5)}`; }

/** Use the saved order snapshot, so existing orders also have production documents. */
export function orderQuote(order: DemoOrder): QuoteRecord {
  const supplier = getSupplier(order.supplierId);
  if (!supplier) throw new Error("주문의 업체를 찾지 못했어요.");
  const id = orderQuoteId(order);
  return {
    id, sourceOrderId: order.id, mode: "mock", status: "prepared", createdAt: order.createdAt,
    supplierId: supplier.id, design: order.design, order: order.order, filename: order.filename,
    quantity: totalQuantity(order.order), format: supplier.format, trashedAt: order.quoteTrashedAt,
    document: { ...sampleProductionDocument(supplier, order.design, order.order, id), generatedAt: order.createdAt },
  };
}
