import type { ClothData, Scene } from "../components/ClothSim";
import { readyClothCapture } from "./cloth-capture";

export type SavedClothDesign = { data: ClothData; scene?: Scene };
let current: { scene: Scene; text: string } | null = null;
let cacheWrite: Promise<void> = Promise.resolve();
function sceneCacheKey() {
  const key = "seongbuk-fit:scene-session:v1";
  let id = sessionStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); }
  return id;
}

// Binary scenes cannot survive JSON sessionStorage. Keep the active draft in IDB
// as well, so reloading before the first library save does not discard the model.
function sceneDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("seongbuk-fit-cloth-scene", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("draft");
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}
export async function restoreClothScene(text: string): Promise<Scene | undefined> {
  if (!text || typeof indexedDB === "undefined") return undefined;
  try {
    await cacheWrite;
    const db = await sceneDatabase();
    try {
      return await new Promise<Scene | undefined>((resolve, reject) => {
        const request = db.transaction("draft").objectStore("draft").get(sceneCacheKey());
        request.onsuccess = () => resolve(request.result?.text === text && isClothScene(request.result.scene) ? request.result.scene : undefined);
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  } catch { return undefined; }
}

export function isClothScene(value: unknown): value is Scene {
  if (!value || typeof value !== "object") return false;
  const scene = value as Scene;
  if (!(scene.bin instanceof ArrayBuffer) || !scene.bin.byteLength || !scene.meta || typeof scene.meta !== "object") return false;
  const arrays = scene.meta.arrays;
  if (!arrays || typeof arrays !== "object" || !Array.isArray(scene.meta.meshes)) return false;
  return Object.values(arrays).every(value => {
    if (!value || typeof value !== "object") return false;
    const array = value as { type: string; offset: number; count: number };
    return ["f32", "u32", "i32"].includes(array.type) && Number.isSafeInteger(array.offset) && array.offset >= 0 && array.offset % 4 === 0
      && Number.isSafeInteger(array.count) && array.count >= 0 && array.offset + array.count * 4 <= scene.bin.byteLength;
  });
}

export function getClothScene(text: string) { return current?.text === text && text ? current.scene : undefined; }
export function setClothScene(scene: Scene | null, text = "") {
  current = scene ? { scene, text } : null;
  if (typeof indexedDB === "undefined") return;
  const snapshot = current ? structuredClone(current) : null;
  cacheWrite = cacheWrite.then(async () => {
    const db = await sceneDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("draft", "readwrite");
        if (snapshot) tx.objectStore("draft").put(snapshot, sceneCacheKey());
        else tx.objectStore("draft").delete(sceneCacheKey());
        tx.oncomplete = () => resolve();
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  }).catch(() => { /* The live scene and explicit library save remain usable. */ });
}

export function savedClothDesign(value: unknown): SavedClothDesign | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as SavedClothDesign;
  if (!saved.data || !readyClothCapture(saved.data)) return null;
  return { data: saved.data, ...(isClothScene(saved.scene) ? { scene: saved.scene } : {}) };
}

export function snapshotClothDesign(data: ClothData, scene?: Scene | null): SavedClothDesign | undefined {
  if (!readyClothCapture(data)) return undefined;
  return structuredClone({ data, ...(isClothScene(scene) ? { scene: { meta: scene.meta, bin: scene.bin } } : {}) });
}
