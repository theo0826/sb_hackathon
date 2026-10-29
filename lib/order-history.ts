import { orderQuote, orderQuoteId } from "./order-documents";
import type { DemoOrder } from "./order-workflow";
import type { QuoteRecord } from "./quote";

export type OrderHistoryEntry = {
  id: string;
  orderId?: string;
  snapshot: QuoteRecord;
  request?: QuoteRecord;
  status: "delivered" | "production" | "saved";
};

/** Join by the saved order/document IDs, never by supplier or arrival order. */
export function orderHistory(orders: DemoOrder[], requests: QuoteRecord[]): OrderHistoryEntry[] {
  const linked = new Set<string>();
  const entries: OrderHistoryEntry[] = orders.map(order => {
    const snapshot = orderQuote(order);
    const matches = requests.filter(request => request.sourceOrderId === order.id || request.id === orderQuoteId(order));
    matches.forEach(request => linked.add(request.id));
    const request = matches[0] || snapshot;
    return { id: order.id, orderId: order.id, snapshot,
      ...(!request.trashedAt ? { request } : {}),
      status: order.deliveryStatus === "recorded" ? "delivered" : "production" };
  });
  for (const request of requests) {
    if (linked.has(request.id) || request.trashedAt) continue;
    linked.add(request.id);
    entries.push({ id: request.id, snapshot: request, request, status: "saved" });
  }
  return entries.sort((a, b) => b.snapshot.createdAt.localeCompare(a.snapshot.createdAt));
}
