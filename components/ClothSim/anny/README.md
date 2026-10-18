# anny — Anny 표준 체형

**이 폴더만 수정**하면 몸 메쉬·포즈 asset 로딩이 바뀝니다.

| 경로 | 내용 |
|------|------|
| `assets/bodies/anny_*.js` | export된 메쉬 (Python `garment.export.body_assets` → `--out` 이 경로) |
| `bodyAsset.js` | meta+base64 파싱, 정점 unpack |
| `bodyLoaders.js` | bundler 정적 import (fetch 실패 시) |
| `index.js` | `loadBody(size, pose)`, `BODY_POSES` |

동기화: repo 루트 `node tools/sync-cloth-bodies.mjs` → `public/cloth-bodies/`
