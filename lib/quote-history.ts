"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { isQuoteRecord, type QuoteRecord } from "./quote";
import { getDemoOrders, setOrderQuoteTrashed, useDemoOrders } from "./order-workflow-client";
import { orderQuote, orderQuoteId } from "./order-documents";
const staticQuotesKey = "seongbuk-fit:static-quotes:v1";
function staticQuotes(): QuoteRecord[] {
  const values: unknown = JSON.parse(sessionStorage.getItem(staticQuotesKey) || "[]");
  return Array.isArray(values) ? values.filter(isQuoteRecord) : [];
}
export async function saveStaticQuote(record: QuoteRecord) {
  if (loading) await loading;
  if (!isQuoteRecord(record)) throw new Error("올바른 시연 요청서가 아니에요.");
  try { sessionStorage.setItem(staticQuotesKey, JSON.stringify([record, ...staticQuotes()])); }
  catch { throw new Error("요청서를 보관할 공간이 부족해요. 첨부 이미지 크기를 줄여주세요."); }
  await refreshQuotes();
}
const initial = { records: [] as QuoteRecord[], loading: true, error: "" };
let state = initial;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function refreshQuotes() {
  if (loading) return loading;
  loading = (async () => {
    try {
      await Promise.resolve();
      const records: QuoteRecord[] = staticQuotes();
      // Keep previous demo records; new cloud requests never go into browser storage.
      try {
        const legacy = JSON.parse(localStorage.getItem("seongbuk-fit:quotes:v1") || "[]");
        if (Array.isArray(legacy)) records.push(...legacy.filter(item => isQuoteRecord(item) && item.mode === "mock"));
      } catch { /* Old demo data is optional. */ }
      state = { records, loading: false, error: "" };
    } catch (error) { state = { ...state, loading: false, error: error instanceof Error ? error.message : "요청서를 불러오지 못했어요." }; }
    finally { loading = null; listeners.forEach(listener => listener()); }
  })();
  return loading;
}
export function useQuoteHistoryState() {
  const current = useSyncExternalStore(subscribe, () => state, () => initial);
  const { orders, ready } = useDemoOrders();
  const records = useMemo(() => {
    const documents = orders.map(orderQuote);
    const ids = new Set(documents.map(record => record.id));
    return [...documents, ...current.records.filter(record => !ids.has(record.id))].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, current.records]);
  useEffect(() => { void refreshQuotes(); }, []);
  return { ...current, records, loading: current.loading || !ready };
}
export function useQuoteHistory() { return useQuoteHistoryState().records; }
export async function setQuoteTrashed(id: string, trashed: boolean) {
  const source = getDemoOrders().find(order => orderQuoteId(order) === id);
  if (source) { setOrderQuoteTrashed(source.id, trashed ? new Date().toISOString() : null); return; }
  if (loading) await loading;
  const trashedAt = trashed ? new Date().toISOString() : null;
  if (staticQuotes().some(record => record.id === id)) {
    sessionStorage.setItem(staticQuotesKey, JSON.stringify(staticQuotes().map(record => record.id === id ? { ...record, trashedAt } : record)));
    await refreshQuotes();
    return;
  }
  let legacy: unknown = [];
  try { legacy = JSON.parse(localStorage.getItem("seongbuk-fit:quotes:v1") || "[]"); } catch { /* Cloud records do not need legacy storage. */ }
  if (Array.isArray(legacy) && legacy.some(record => isQuoteRecord(record) && record.id === id && record.mode === "mock")) {
    localStorage.setItem("seongbuk-fit:quotes:v1", JSON.stringify(legacy.map(record => isQuoteRecord(record) && record.id === id ? { ...record, trashedAt } : record)));
  } else {
    throw new Error("요청서를 찾지 못했어요.");
  }
  await refreshQuotes();
  if (state.error) throw new Error(state.error);
}
