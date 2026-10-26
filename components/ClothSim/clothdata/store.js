// 옷 정보 보관함 (clothData): AI 로 옷을 만들 때마다 ClothSim 이 앞면, 뒷면 이미지와 옷 정보(카테고리, 고른 값, 로고 위치, 가격)를 여기 넣는다.
// 다른 페이지(예: 업체 맞춤 도안)에서는 getClothData() 로 꺼내 쓴다. ClothSim 이 떠 있지 않아도 됨.
//
//   import { getClothData, useClothData } from '@/components/ClothSim';
//   const cap = getClothData();          // { completed: 0 | 1, front, back, category, tokens, logo, price, text, updatedAt }
//   const cap = useClothData();     // React 에서: 값이 바뀌면 다시 그림
//
// completed: 0 = 만드는 중 (또는 아직 없음), 1 = 다 내려앉은 뒤 캡처까지 끝남
// front, back: 'data:image/jpeg;base64,...' (정사각, 기본 1024px)
// category: { id: 'hoodie' | 'tee' | 'long-sleeve' | 'sweatshirt' | 'windbreaker' | 'shirt', label: '후드' ... } 또는 null
// tokens: 엔진이 고른 값 { 'neck': 'hood', 'sleeve_length': 'long', ... } (경로 마지막 이름 -> 값)
// logo: 로고 위치 { panel, x, y, width, rotation } (이미지는 넣지 않음) 또는 null
// price: 1벌당 제작 단가 (결정 모델 연결 뒤 채움, 지금은 null)
// 메모리와 sessionStorage 두 곳에 둔다 (페이지를 옮기거나 새로 고쳐도 같은 탭이면 남음)
import { useSyncExternalStore } from 'react';

const KEY = 'clothsim:clothdata:v1';
const EMPTY = Object.freeze({ completed: 0, front: null, back: null, category: null, tokens: null, logo: null, price: null, text: '', updatedAt: null });
let mem = null;
const listeners = new Set();

function load() {
  if (mem) return mem;
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(KEY) : null;
    if (raw) { const v = JSON.parse(raw); if (v && typeof v === 'object') mem = { ...EMPTY, ...v }; }
  } catch (_) { /* 손상되었거나 저장소가 막힘: 빈 값 */ }
  return mem || EMPTY;
}

export function getClothData() { return load(); }

export function setClothData(next) {
  mem = { ...EMPTY, ...next };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(mem));
  } catch (_) {
    // 저장 공간이 모자라면 이미지는 메모리에만 두고 나머지만 저장
    try { sessionStorage.setItem(KEY, JSON.stringify({ ...mem, front: null, back: null, imagesInMemoryOnly: true })); } catch (__) { /* 무시 */ }
  }
  listeners.forEach(f => { try { f(mem); } catch (_) { /* 무시 */ } });
  return mem;
}

export function updateClothData(patch) { return setClothData({ ...load(), ...patch }); }

export function clearClothData(extra = {}) { return setClothData({ ...EMPTY, ...extra }); }

export function subscribeClothData(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// 다른 탭이 아닌 같은 탭 안에서만 공유 (sessionStorage 와 같음)
export function useClothData() {
  return useSyncExternalStore(subscribeClothData, getClothData, () => EMPTY);
}

// 클래스처럼 한 이름으로 쓰고 싶을 때
export const clothData = {
  get: getClothData,
  set: setClothData,
  update: updateClothData,
  clear: clearClothData,
  subscribe: subscribeClothData,
  get completed() { return load().completed; },
};
