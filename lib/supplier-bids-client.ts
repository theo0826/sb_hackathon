"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BID_ARRIVAL_MS, BID_STORAGE_KEY, readBidRequest, resetSupplierBids as clearStoredBids, type BidRequest } from "./supplier-bids";

let memory: BidRequest | null = null;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
function publish(request: BidRequest) {
  memory = request;
  try { sessionStorage.setItem(BID_STORAGE_KEY, JSON.stringify(request)); } catch {}
  listeners.forEach(fn => fn());
}
export function resetSupplierBids() { memory = null; clearStoredBids(); listeners.forEach(fn => fn()); }
export function useSupplierBids(key: string, total: number, enabled: boolean) {
  const current = useSyncExternalStore(subscribe, () => memory, () => null);
  const request = enabled && current?.key === key ? current : null;
  const startedAt = request?.startedAt;
  const [now, setNow] = useState(Date.now);
  // Server snapshots contain an empty order. Wait for the actual hydrated draft
  // before reading/writing bids, or a reload would overwrite the saved selection.
  useEffect(() => { if (enabled) publish(readBidRequest(key)); }, [key, enabled]);
  useEffect(() => {
    if (startedAt === undefined) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      const count = Math.max(0, Math.floor((time - startedAt) / BID_ARRIVAL_MS));
      // Recompute the next boundary: an early timer must not lose the last bid.
      if (count < total) timer = setTimeout(tick, Math.max(25, startedAt + BID_ARRIVAL_MS * (count + 1) - time));
    };
    timer = setTimeout(tick, 0);
    const resume = () => { clearTimeout(timer); tick(); };
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => { clearTimeout(timer); window.removeEventListener("focus", resume); document.removeEventListener("visibilitychange", resume); };
  }, [startedAt, key, total]);
  function update(patch: Partial<Pick<BidRequest, "comparing" | "selectedId" | "sort">>) {
    if (memory?.key === key) publish({ ...memory, ...patch });
  }
  return { request, update, arrivedCount: request ? Math.min(total, Math.max(0, Math.floor((now - request.startedAt) / BID_ARRIVAL_MS))) : 0 };
}
