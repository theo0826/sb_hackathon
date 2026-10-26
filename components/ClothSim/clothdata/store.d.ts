// clothdata/store.js 타입 (다른 페이지에서 ClothSim 전체를 불러오지 않고 보관함만 쓸 때)
import type { ClothData } from '../index';
export type { ClothData };
export function getClothData(): ClothData;
export function setClothData(next: Partial<ClothData>): ClothData;
export function updateClothData(patch: Partial<ClothData>): ClothData;
export function clearClothData(extra?: Partial<ClothData>): ClothData;
export function subscribeClothData(fn: (c: ClothData) => void): () => void;
export function useClothData(): ClothData;
export const clothData: { get(): ClothData; set(n: Partial<ClothData>): ClothData; update(p: Partial<ClothData>): ClothData; clear(e?: Partial<ClothData>): ClothData; subscribe(fn: (c: ClothData) => void): () => void; readonly completed: 0 | 1; };
