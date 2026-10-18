/**
 * Anny 표준 체형 asset (포즈별 메쉬). Python export → anny/assets/bodies → public/cloth-bodies
 */
import { assetFromModule, parseBodyAssetText } from './bodyAsset.js';
import { BODY_LOADERS } from './bodyLoaders.js';
import { clothError, clothLog, clothWarn } from '../garment/clothLog.js';

export const BODY_POSES = ['relax', 'arms_up', 'arms_mid', 'attention'];
const BODY_SIZES = ['xs', 's', 'm', 'l', 'xl'];

function bodyFileName(size, pose) {
  if (!BODY_SIZES.includes(size)) return null;
  if (pose === 'relax') return `anny_${size}.js`;
  if (BODY_POSES.includes(pose)) return `anny_${size}_${pose}.js`;
  return null;
}

async function loadBodyAsset(file) {
  clothLog('몸 파일 로드 시작', file);
  let fetchErr = null;
  try {
    const url = `/cloth-bodies/${file}`;
    const res = await fetch(url);
    clothLog('몸 파일 fetch', file, res.status, res.ok ? 'ok' : 'fail');
    if (res.ok) {
      const text = await res.text();
      if (text.includes('meta:') && text.includes('data:')) {
        const body = parseBodyAssetText(text);
        clothLog('몸 파일 파싱 완료 (public)', file, 'nv=', body.meta.nv, 'bytes=', body.bytes.byteLength);
        return body;
      }
      fetchErr = new Error(`HTTP ${res.status} but not a body asset (${text.length} chars)`);
      clothWarn('몸 파일 fetch 응답이 asset 형식 아님', file, text.slice(0, 120));
    } else {
      fetchErr = new Error(`HTTP ${res.status}`);
    }
  } catch (e) {
    fetchErr = e;
    clothWarn('몸 파일 fetch 예외', file, e);
  }
  const load = BODY_LOADERS[file];
  if (!load) {
    const msg = `몸 파일을 불러오지 못함: ${file} (${fetchErr && fetchErr.message || fetchErr}). public/cloth-bodies 또는 anny/assets/bodies 를 확인하세요.`;
    clothError(msg);
    throw new Error(msg);
  }
  clothLog('몸 파일 bundler import 시도', file);
  try {
    const body = assetFromModule(await load());
    clothLog('몸 파일 로드 완료 (import)', file, 'nv=', body.meta.nv, 'bytes=', body.bytes.byteLength);
    return body;
  } catch (e) {
    const msg = `몸 파일을 불러오지 못함: ${file} (fetch: ${fetchErr && fetchErr.message || fetchErr}; import: ${e && e.message || e})`;
    clothError(msg, e);
    throw new Error(msg);
  }
}

const bodyCache = {};

export async function loadBody(size, pose = 'relax') {
  const file = bodyFileName(size, pose);
  if (!file) throw new Error(`표준 체형 없음: ${size} pose=${pose}`);
  const key = `${pose}:${size}`;
  if (!bodyCache[key]) bodyCache[key] = loadBodyAsset(file);
  return bodyCache[key];
}

export {
  b64ToBytes,
  bytesToUint8Array,
  unpackBodyVertices,
  parseBodyAssetText,
  assetFromModule,
} from './bodyAsset.js';
