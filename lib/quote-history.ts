"use client";

import { useMemo, useSyncExternalStore } from "react";
import { isQuoteRecord, type QuoteRecord } from "./quote";

const KEY = "seongbuk-fit:quotes:v1";
const listeners = new Set<() => void>();
function snapshot() { try { return localStorage.getItem(KEY) || "[]"; } catch { return "[]"; } }
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}
function parse(raw: string): QuoteRecord[] {
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value.filter(isQuoteRecord) : []; }
  catch { return []; }
}
export function saveQuote(record: QuoteRecord) {
  const records = parse(snapshot());
  localStorage.setItem(KEY, JSON.stringify([record, ...records.filter((item) => item.id !== record.id)]));
  listeners.forEach((listener) => listener());
}
export function useQuoteHistory() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  return useMemo(() => parse(raw), [raw]);
}
