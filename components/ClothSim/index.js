// ClothSim 폴더 진입점.
//   import ClothSim from './ClothSim'                  <ClothSim />  글자 입력 -> 옷 시뮬레이션 (서버 없음)
//   import { ClothSimView } from './ClothSim'          <ClothSimView scene={...} />  장면만 보여 주기
//   import { textToScene, makeLLM } from './ClothSim'  화면 없이 글자 -> 장면 {meta, bin}
//   import { createClothSim } from './ClothSim'        React 없이 canvas 에 직접 붙이기
export { default } from './ClothSim.js';
export { default as ClothSimView } from './ClothSimView.js';
export { default as ClothPatternEditor } from './pattern/PatternEditor.js';
export { loadLogoBitmap, defaultLogoPlacement, panelOutlines, layoutPanels } from './pattern/logo.js';
export { createClothSim, DEFAULT_OPTIONS } from './drape/create.js';
export { textToScene, makeLLM, LLM_DEFAULTS, loadEngine, parseIntent, logFinalSpecTokens, specTokenRows } from './garment/index.js';
export { BODY_POSES, loadBody, unpackBodyVertices } from './anny/index.js';
