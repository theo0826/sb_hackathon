# garment — 옷 생성 (선택 + gm_build)

**이 폴더만 수정**하면 글자→spec→장면 `{ meta, bin }` 생성이 바뀝니다.

| 경로 | 내용 |
|------|------|
| `wasm.js` | C++ 엔진 (빌드 스크립트로 생성, 수동 편집 금지) |
| `assets/trees/v0_seed.js` | 옷 토큰 트리 (빌드 스크립트로 생성) |
| `assets/priors/top_v0.js` | material/color 수동 prior (빌드 스크립트로 생성) |
| `intent.js` / `explicitMap.js` | 문장 → `fixed` / `explicit_slots` (명시 재질·색) |
| `llm.js` | Ollama / API |
| `clothLog.js` | `[ClothSim]` 콘솔 로그 (drape·anny에서도 import) |
| `index.js` | `textToScene`, `loadEngine`, `makeLLM` |

몸 asset은 `../anny`의 `loadBody`를 호출합니다.
