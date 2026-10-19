"use client";
import { useMemo, useSyncExternalStore } from "react";
import { EMPTY_DETAILS, isDemoOrder, isOrderDetails, reviewedOrderIssues, type DemoOrder, type OrderDetails, type OrderInput } from "./order-workflow";
import type { QuoteRecord } from "./quote";

const detailsKey = "seongbuk-fit:order-details:v1", ordersKey = "seongbuk-fit:demo-orders:v1";
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const emit = () => listeners.forEach(listener => listener());
let detailsMemory: string | undefined, ordersMemory: string | undefined;
function read(key: string) { try { return sessionStorage.getItem(key) || ""; } catch { return ""; } }
function detailsSnapshot() { return detailsMemory ??= read(detailsKey); }
function ordersSnapshot() { return ordersMemory ??= read(ordersKey); }
export function useOrderDetails() {
  const raw = useSyncExternalStore(subscribe, detailsSnapshot, () => "");
  const details = useMemo(() => { try { const value = JSON.parse(raw); if (isOrderDetails(value)) return value; } catch {} return EMPTY_DETAILS; }, [raw]);
  function update(patch: Partial<OrderDetails>) {
    const next = { ...details, confirmed: false, ...patch };
    detailsMemory = JSON.stringify(next);
    try { sessionStorage.setItem(detailsKey, detailsMemory); } catch { /* Keep the editable draft usable for this visit. */ }
    emit();
  }
  return { details, update };
}
export function resetOrderDetails() { detailsMemory = ""; try { sessionStorage.removeItem(detailsKey); } catch {} emit(); }
function parseOrders(raw: string): DemoOrder[] { try { const value = JSON.parse(raw); return Array.isArray(value) ? value.filter(isDemoOrder) : []; } catch { return []; } }
export function getDemoOrders() { return parseOrders(ordersSnapshot()); }
export function setOrderQuoteTrashed(id: string, trashedAt: string | null) {
  const orders = getDemoOrders();
  if (!orders.some(order => order.id === id)) throw new Error("주문을 찾지 못했어요.");
  const next = JSON.stringify(orders.map(order => order.id === id ? { ...order, quoteTrashedAt: trashedAt } : order));
  try { sessionStorage.setItem(ordersKey, next); } catch { throw new Error("제작자료 상태를 저장하지 못했어요. 브라우저 저장 공간을 확인해주세요."); }
  ordersMemory = next; emit();
}
export function useDemoOrders() {
  const raw = useSyncExternalStore(subscribe, ordersSnapshot, () => "");
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return { orders: useMemo(() => parseOrders(raw), [raw]), ready };
}
export function createDemoOrder(input: OrderInput, review: { quote: QuoteRecord; confirmed: boolean }) {
  const issues = reviewedOrderIssues(input, review?.quote, review?.confirmed === true);
  if (issues.length) throw new Error(issues.join(" "));
  const existing = getDemoOrders().find(order => order.preparedQuote?.id === review.quote.id);
  if (existing) return existing;
  const record: DemoOrder = structuredClone({ ...input, preparedQuote: review.quote, id: `demo_${crypto.randomUUID()}`, createdAt: new Date().toISOString(), received: false });
  const next = JSON.stringify([record, ...parseOrders(ordersSnapshot())]);
  try { sessionStorage.setItem(ordersKey, next); } catch { throw new Error("이 브라우저의 저장 공간이 부족해요. 첨부 이미지 크기를 줄인 뒤 다시 시도해주세요."); }
  ordersMemory = next; emit(); return record;
}
