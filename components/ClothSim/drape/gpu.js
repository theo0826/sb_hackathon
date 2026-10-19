// WebGPU 장치 준비, 버퍼 만들기, 셰이더 만들기
import { SHADERS } from './shaders/index.js';

/** React Strict Mode 재마운트 시 device.destroy() 하면 HUNG — 세션당 하나 공유 */
let sharedGpu = null;
let sharedRefs = 0;

export async function initGPU() {
  if (!navigator.gpu) throw new Error('이 브라우저는 WebGPU 를 지원하지 않습니다. 크롬이나 엣지 최신 버전에서 localhost 주소로 열어 주세요.');
  if (sharedGpu) {
    sharedRefs++;
    return sharedGpu;
  }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('WebGPU 그래픽카드를 찾지 못했습니다.');
  const need = {};
  for (const k of ['maxStorageBuffersPerShaderStage', 'maxStorageBufferBindingSize', 'maxBufferSize']) need[k] = adapter.limits[k];
  const device = await adapter.requestDevice({ requiredLimits: need });
  device.lost.then(info => {
    console.error('WebGPU 장치 끊김', info.message);
    if (sharedGpu && sharedGpu.device === device) sharedGpu = null;
  });
  sharedGpu = { adapter, device };
  sharedRefs = 1;
  return sharedGpu;
}

export function releaseGPU() {
  if (sharedRefs > 0) sharedRefs--;
}

// GPUBufferUsage 는 WebGPU 없는 환경(서버 렌더링)에서 없으므로 값으로 둠: STORAGE | COPY_DST | COPY_SRC
export const STORAGE = 0x80 | 0x08 | 0x04;

// 빈 배열도 최소 16 바이트 버퍼로 (WebGPU 는 0 크기 바인딩 불가)
export function makeBuffer(device, data, usage = STORAGE, label = '') {
  const bytes = Math.max(16, Math.ceil(data.byteLength / 4) * 4);
  const buf = device.createBuffer({ size: bytes, usage, label, mappedAtCreation: true });
  new Uint8Array(buf.getMappedRange()).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  buf.unmap();
  return buf;
}

export function emptyBuffer(device, bytes, usage = STORAGE, label = '') {
  return device.createBuffer({ size: Math.max(16, Math.ceil(bytes / 4) * 4), usage, label });
}

export async function shaderModule(device, name, withCommon) {
  if (!SHADERS[name]) throw new Error(`셰이더 ${name} 없음`);
  const code = (withCommon ? SHADERS.common + '\n' : '') + SHADERS[name];
  const mod = device.createShaderModule({ code, label: name });
  const info = await mod.getCompilationInfo();
  const errs = info.messages.filter(m => m.type === 'error');
  if (errs.length) throw new Error(`셰이더 ${name} 오류: ` + errs.map(m => `${m.lineNum}:${m.linePos} ${m.message}`).join(' / '));
  return mod;
}
