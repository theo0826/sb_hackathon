"use client";
import { useEffect, useSyncExternalStore } from "react";
import { isQuoteRecord, type QuoteRecord } from "./quote";
const initial = { records: [] as QuoteRecord[], loading: true, error: "" };
let state = initial;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function refreshQuotes() {
  if (loading) return loading;
  loading = (async () => {
    try {
      const response = await fetch("/api/quotes", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok && response.status !== 401) throw new Error(result.error || "요청서를 불러오지 못했어요.");
      const records: QuoteRecord[] = Array.isArray(result.quotes) ? result.quotes.filter(isQuoteRecord) : [];
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
  useEffect(() => { void refreshQuotes(); }, []);
  return current;
}
export function useQuoteHistory() { return useQuoteHistoryState().records; }
export async function setQuoteTrashed(id: string, trashed: boolean) {
  if (loading) await loading;
  const trashedAt = trashed ? new Date().toISOString() : null;
  let legacy: unknown = [];
  try { legacy = JSON.parse(localStorage.getItem("seongbuk-fit:quotes:v1") || "[]"); } catch { /* Cloud records do not need legacy storage. */ }
  if (Array.isArray(legacy) && legacy.some(record => isQuoteRecord(record) && record.id === id && record.mode === "mock")) {
    localStorage.setItem("seongbuk-fit:quotes:v1", JSON.stringify(legacy.map(record => isQuoteRecord(record) && record.id === id ? { ...record, trashedAt } : record)));
  } else {
    const response = await fetch(`/api/quotes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trashedAt }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || " 요청서를 변경하지 못했어요.");
  }
  await refreshQuotes();
  if (state.error) throw new Error(state.error);
}
