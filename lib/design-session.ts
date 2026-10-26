"use client";

import { useMemo, useSyncExternalStore, type SetStateAction } from "react";
import { DEFAULT_DESIGN, isDesign, simpleDesign, type Design } from "./design";
import { DEFAULT_ORDER, isOrderDraft, type OrderDraft } from "./quote";
import { getSupplier } from "./suppliers";
import { clearClothData } from "../components/ClothSim/clothdata/store";

export type ChatMessage = { id: string; role: "user" | "assistant"; text: string };
type DesignSession = { design: Design; prompt: string; filename: string; supplierId: string | null; order: OrderDraft; messages: ChatMessage[]; hasResult: boolean };
const DRAFT_KEY = "seongbuk-fit:draft:v1";
const initialSession: DesignSession = { design: DEFAULT_DESIGN, prompt: "", filename: "", supplierId: null, order: DEFAULT_ORDER, messages: [], hasResult: false };
const initialSnapshot = JSON.stringify(initialSession);
let snapshot: string | null = null;
const listeners = new Set<() => void>();

function parseSession(raw: string): DesignSession | null {
  try {
    const value = JSON.parse(raw);
    if(isDesign(value.design))value.design=simpleDesign(value.design);
    if (isDesign(value.design) && typeof value.prompt === "string" && value.prompt.length <= 300 && typeof value.filename === "string") return { ...value, supplierId: getSupplier(value.supplierId)?.id || null, order: isOrderDraft(value.order) ? value.order : DEFAULT_ORDER, hasResult: typeof value.hasResult === "boolean" ? value.hasResult : !!value.prompt || !!value.design.image, messages: Array.isArray(value.messages) ? value.messages.filter((message: ChatMessage) => message && typeof message.id === "string" && ["user", "assistant"].includes(message.role) && typeof message.text === "string").slice(-50) : [] };
  } catch { /* 손상된 임시 데이터는 기본 디자인으로 대체합니다. */ }
  return null;
}

function getSnapshot() {
  if (snapshot === null) {
    try {
      const draft = sessionStorage.getItem(DRAFT_KEY);
      snapshot = draft && parseSession(draft) ? draft : initialSnapshot;
    } catch { snapshot = initialSnapshot; }
  }
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function updateSession(update: (current: DesignSession) => DesignSession) {
  const current = parseSession(getSnapshot()) || initialSession;
  snapshot = JSON.stringify(update(current));
  try { sessionStorage.setItem(DRAFT_KEY, snapshot); }
  catch { /* 저장소가 막혀 있어도 열린 탭에서는 편집 상태를 유지합니다. */ }
  listeners.forEach((listener) => listener());
}

export function useDesignSession() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => initialSnapshot);
  const session = useMemo(() => parseSession(raw) || initialSession, [raw]);
  return {
    ...session,
    setDesign: (next: SetStateAction<Design>) => updateSession((current) => ({ ...current, design: typeof next === "function" ? next(current.design) : next })),
    setPrompt: (next: SetStateAction<string>) => updateSession((current) => ({ ...current, prompt: typeof next === "function" ? next(current.prompt) : next })),
    setFilename: (next: string) => updateSession((current) => ({ ...current, filename: next })),
    setMessages: (next: SetStateAction<ChatMessage[]>) => updateSession((current) => ({ ...current, messages: (typeof next === "function" ? next(current.messages) : next).slice(-50) })),
    setHasResult: (next: boolean) => updateSession((current) => ({ ...current, hasResult: next })),
    resetSession: () => updateSession(() => ({ ...initialSession, design: { ...DEFAULT_DESIGN }, order: { ...DEFAULT_ORDER, sizes: { ...DEFAULT_ORDER.sizes } } })),
    loadDesign: (saved: { design: Design; prompt: string; filename: string }) => { clearClothData(); updateSession((current) => ({ ...current, supplierId: null, order: { ...DEFAULT_ORDER, sizes: { ...DEFAULT_ORDER.sizes } }, design: saved.design, prompt: "", filename: saved.filename, hasResult: true, messages: [{ id: crypto.randomUUID(), role: "assistant", text: `‘${saved.design.text || saved.filename || "저장한 디자인"}’을 불러왔어요. 바꾸고 싶은 부분을 말해주세요.${saved.prompt ? ` 이전 요청: ${saved.prompt}` : ""}` }] })); },
    setOrder: (next: SetStateAction<OrderDraft>) => updateSession((current) => ({ ...current, order: typeof next === "function" ? next(current.order) : next })),
    selectSupplier: (id: string) => {
      const supplier = getSupplier(id);
      if (supplier) updateSession((current) => ({ ...current, supplierId: id, order: { ...current.order, method: supplier.methods.includes(current.order.method) ? current.order.method : supplier.methods[0], printWidthCm: Math.min(supplier.maxPrintWidthCm, Math.max(1, current.order.printWidthCm)), printHeightCm: Math.min(supplier.maxPrintHeightCm, Math.max(1, current.order.printHeightCm)) } }));
    },
  };
}
