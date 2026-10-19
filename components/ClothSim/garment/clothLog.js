/** 브라우저 DevTools 콘솔 추적용. window.__CLOTH_SIM_DEBUG__ = false 로 끌 수 있음 */
const TAG = '[ClothSim]';

export function clothDebugOn() {
  if (typeof globalThis === 'undefined') return true;
  return globalThis.__CLOTH_SIM_DEBUG__ !== false;
}

export function clothLog(...args) {
  if (!clothDebugOn()) return;
  console.log(TAG, ...args);
}

export function clothWarn(...args) {
  if (!clothDebugOn()) return;
  console.warn(TAG, ...args);
}

/** 오류는 debug 끄기와 무관하게 항상 출력 */
export function clothError(...args) {
  console.error(TAG, ...args);
}
