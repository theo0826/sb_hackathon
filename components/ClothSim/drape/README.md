# drape — 입힌 뒤 WebGPU 시뮬 (충돌·안정화)

**이 폴더만 수정**하면 canvas 시뮬·포즈 intro/settle·렌더가 바뀝니다.

| 경로 | 내용 |
|------|------|
| `create.js` | `createClothSim`, `bodyPoseIntro`, 물리 루프 |
| `solver.js`, `grid.js`, `scene.js` | XPBD, 몸 격자 |
| `gpu.js`, `renderer.js`, `camera.js` | WebGPU |
| `shaders/` | WGSL |

장면은 `garment`의 `textToScene` 결과를 받습니다. 몸 정점 갱신은 `../anny`의 `loadBody` / `unpackBodyVertices`.
