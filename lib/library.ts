"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isDesign, STORAGE_KEY, type Design } from "./design";
import type { OrderDraft } from "./quote";

export type LibraryKind = "design" | "artwork" | "document";
export type LibraryAttachment = { file: Blob; fileName: string; label: string };
export type LibraryItem = {
  id: string;
  kind: LibraryKind;
  title: string;
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
  trashedAt?: string | null;
  design: Design;
  prompt: string;
  filename: string;
  preview: string | null;
  file?: Blob;
  fileName?: string;
  format?: string;
  supplierId?: string;
  order?: OrderDraft;
  attachments?: LibraryAttachment[];
};
type NewItem = Pick<LibraryItem, "kind" | "design" | "prompt" | "filename"> & Partial<Pick<LibraryItem, "title" | "preview" | "file" | "fileName" | "format" | "supplierId" | "order" | "attachments">>;
type LibraryState = { items: LibraryItem[]; status: "loading" | "ready" | "error"; error: string };
const serverState: LibraryState = { items: [], status: "loading", error: "" };
let state = serverState;
let databasePromise: Promise<IDBDatabase> | null = null;
let loading: Promise<void> | null = null;
let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();
function publish(next: LibraryState) { state = next; listeners.forEach((listener) => listener()); }
function request<T>(operation: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => { operation.onsuccess = () => resolve(operation.result); operation.onerror = () => reject(operation.error || new Error("보관함을 읽지 못했어요.")); });
}
function committed(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error("보관함 저장 공간을 확인해주세요.")); });
}
function database() {
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const open = indexedDB.open("seongbuk-fit-library", 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore("items", { keyPath: "id" });
      open.result.createObjectStore("meta");
    };
    open.onsuccess = () => { open.result.onversionchange = () => { open.result.close(); databasePromise = null; }; resolve(open.result); };
    open.onerror = () => { databasePromise = null; reject(open.error || new Error("브라우저 보관함을 열지 못했어요.")); };
    open.onblocked = () => reject(new Error("다른 성북핏 탭을 닫고 보관함을 다시 열어주세요."));
  });
  return databasePromise;
}
function valid(value: unknown): value is LibraryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as LibraryItem;
  return typeof item.id === "string" && ["design", "artwork", "document"].includes(item.kind)
    && typeof item.title === "string" && typeof item.createdAt === "string" && Number.isFinite(Date.parse(item.createdAt))
    && typeof item.updatedAt === "string" && typeof item.favorite === "boolean" && isDesign(item.design)
    && typeof item.prompt === "string" && typeof item.filename === "string";
}
async function migrate(db: IDBDatabase) {
  const flag = await request(db.transaction("meta", "readonly").objectStore("meta").get("legacy-design-v1"));
  if (flag) return;
  let legacy: LibraryItem | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved?.version === 1 && isDesign(saved.design)) {
      const now = new Date().toISOString();
      legacy = { id: "library_legacy_v1", kind: "design", title: saved.design.text || saved.filename || "이전에 저장한 디자인", createdAt: now, updatedAt: now, favorite: false, design: saved.design, prompt: typeof saved.prompt === "string" ? saved.prompt.slice(0, 300) : "", filename: typeof saved.filename === "string" ? saved.filename : "", preview: null };
    }
  } catch { /* 기존 저장은 그대로 두고 새 보관함만 준비합니다. */ }
  const transaction = db.transaction(["items", "meta"], "readwrite");
  const done = committed(transaction);
  if (legacy) transaction.objectStore("items").put(legacy);
  transaction.objectStore("meta").put(true, "legacy-design-v1");
  await done;
}
async function refresh() {
  const db = await database();
  const values = await request(db.transaction("items", "readonly").objectStore("items").getAll());
  publish({ items: values.filter(valid).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), status: "ready", error: "" });
}
export function initializeLibrary() {
  if (!loading) loading = (async () => {
    try {
      const db = await database(); await migrate(db); await refresh();
      if (typeof BroadcastChannel !== "undefined" && !channel) {
        channel = new BroadcastChannel("seongbuk-fit-library");
        channel.onmessage = () => { void refresh().catch(() => publish({ ...state, status: "error", error: "보관함을 새로 불러오지 못했어요." })); };
      }
    } catch (cause) { loading = null; publish({ ...state, status: "error", error: cause instanceof Error ? cause.message : "보관함을 열지 못했어요." }); }
  })();
  return loading;
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useLibrary() {
  const current = useSyncExternalStore(subscribe, () => state, () => serverState);
  useEffect(() => { void initializeLibrary(); }, []);
  return current;
}
export async function saveLibraryItem(input: NewItem): Promise<LibraryItem> {
  await initializeLibrary();
  const db = await database();
  const now = new Date().toISOString();
  const item: LibraryItem = structuredClone({ ...input, id: `library_${crypto.randomUUID()}`, title: (input.title || input.filename || input.design.text || "우리 반티").slice(0, 100), createdAt: now, updatedAt: now, favorite: false, preview: input.preview || null });
  const transaction = db.transaction("items", "readwrite"); const done = committed(transaction);
  transaction.objectStore("items").add(item); await done;
  await refresh(); channel?.postMessage("changed"); return item;
}
export async function updateLibraryItem(id: string, patch: Pick<Partial<LibraryItem>, "title" | "favorite" | "trashedAt">) {
  const db = await database();
  const transaction = db.transaction("items", "readwrite"); const done = committed(transaction);
  const get = transaction.objectStore("items").get(id);
  get.onsuccess = () => {
    if (valid(get.result)) transaction.objectStore("items").put({ ...get.result, ...patch, title: patch.title === undefined ? get.result.title : patch.title.trim().slice(0, 100) || get.result.title, updatedAt: new Date().toISOString() });
  };
  await done; await refresh(); channel?.postMessage("changed");
}
export async function removeLibraryItem(id: string) {
  const db = await database(); const transaction = db.transaction("items", "readwrite"); const done = committed(transaction);
  transaction.objectStore("items").delete(id); await done; await refresh(); channel?.postMessage("changed");
}
export function dataURLBlob(url: string) {
  const [header, encoded] = url.split(",", 2);
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: header.match(/data:([^;]+)/)?.[1] || "image/png" });
}
export function downloadLibraryFile(item: LibraryItem) {
  const file = item.file || new Blob([JSON.stringify({ version: 2, design: item.design, prompt: item.prompt, filename: item.filename }, null, 2)], { type: "application/json;charset=utf-8" });
  downloadLibraryAttachment({ file, fileName: item.fileName || `${item.title.replace(/[<>:"/\\|?*]/g, "-")}.json`, label: item.title });
}
export function downloadLibraryAttachment(attachment: LibraryAttachment) {
  const anchor = document.createElement("a"); const url = URL.createObjectURL(attachment.file);
  anchor.href = url; anchor.download = attachment.fileName; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
