import type { Design } from "./design";
import type { ClothData } from "../components/ClothSim";
import { BIDDING_SUPPLIERS, type Supplier } from "./suppliers";
import { estimate, type OrderDetails } from "./order-workflow";
import { todayKST, validateDesignForSupplier, validateOrder, type OrderDraft } from "./quote";

export type BidSort = "recommended" | "price" | "delivery";
export type SupplierOffer = { supplier: Supplier; price: ReturnType<typeof estimate> };
export type BidRequest = { key: string; startedAt: number; comparing: boolean; selectedId: string | null; sort: BidSort };
export const BID_STORAGE_KEY = "seongbuk-fit:supplier-bids:v1";
export const BID_ARRIVAL_MS = 1500;

export function productionOrder(design: Design, order: OrderDraft): OrderDraft {
  return { ...order, printWidthCm: Math.max(order.printWidthCm, design.logoPlacement?.width || 0, ...(design.placements || []).map(p => p.widthCm)), printHeightCm: Math.max(order.printHeightCm, ...(design.placements || []).map(p => p.heightCm)) };
}
export function supplierOfferIssues(design: Design, order: OrderDraft, supplier: Supplier, today = todayKST()): string[] {
  const availableDays = Math.floor((Date.parse(order.desiredDeliveryDate) - Date.parse(today)) / 86400000);
  const issues = Object.values(validateOrder(order, supplier));
  const designIssue = validateDesignForSupplier(design, supplier);
  if (designIssue) issues.push(designIssue);
  if (Number.isFinite(availableDays) && estimate(supplier, order).days > availableDays) {
    const earliest = new Date(Date.parse(today) + estimate(supplier, order).days * 86400000).toISOString().slice(0, 10);
    issues.push(`제작에 ${supplier.leadDays}이 필요해요. 수령일을 ${earliest} 이후로 선택해주세요.`);
  }
  return issues;
}
export function matchingOffers(design: Design, order: OrderDraft, today = todayKST()): SupplierOffer[] {
  return BIDDING_SUPPLIERS.map(supplier => ({ supplier, price: estimate(supplier, order) })).filter(({ supplier }) =>
    supplierOfferIssues(design, order, supplier, today).length === 0);
}
export function recommendedOffer(offers: SupplierOffer[]) {
  return [...offers].sort((a, b) => a.price.total - b.price.total || a.price.days - b.price.days)[0];
}
export function sortedOffers(offers: SupplierOffer[], sort: BidSort) {
  const recommended = recommendedOffer(offers)?.supplier.id;
  return [...offers].sort((a, b) => sort === "delivery" ? a.price.days - b.price.days || a.price.total - b.price.total
    : sort === "price" ? a.price.total - b.price.total || a.price.days - b.price.days
    : Number(b.supplier.id === recommended) - Number(a.supplier.id === recommended) || a.price.total - b.price.total);
}
function checksum(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return `${value.length}:${hash >>> 0}`;
}
export function bidRequestKey(design: Design, order: OrderDraft, details: OrderDetails, cloth: ClothData) {
  return JSON.stringify(["figma-v1", { ...design, image: design.image ? checksum(design.image) : null }, order, details, cloth.text, cloth.category, cloth.tokens, cloth.logo]);
}
export function readBidRequest(key: string, now = Date.now()): BidRequest {
  try {
    const saved = JSON.parse(sessionStorage.getItem(BID_STORAGE_KEY) || "null");
    if (saved?.key === key && Number.isFinite(saved.startedAt) && saved.startedAt <= now && typeof saved.comparing === "boolean" && (saved.selectedId === null || typeof saved.selectedId === "string") && ["recommended", "price", "delivery"].includes(saved.sort)) return saved;
  } catch { /* A new visit can continue without session storage. */ }
  return { key, startedAt: now, comparing: false, selectedId: null, sort: "recommended" };
}
export function resetSupplierBids() { try { sessionStorage.removeItem(BID_STORAGE_KEY); } catch {} }
