# ClothSim

글자로 옷을 적으면 브라우저 안에서 옷을 만들어 마네킹에 입혀 보여 주는 React 컴포넌트. 서버 없음.

```
입력 글자 -> LLM (Ollama 또는 API, 보기 고르기) -> C++ 엔진 (WebAssembly: 선택, 도면, 3D 배치, 장면) -> WebGPU 천 시뮬레이션
```

이 폴더를 통째로 `src/components/` 에 붙여넣으면 끝. 설치할 것 없음 (React 만 있으면 됨), 번들러 설정 필요 없음
(wasm, 셰이더, 표준 체형, 트리 모두 JS 파일 안에 들어 있음, JSX 안 씀). TypeScript 타입은 `index.d.ts`.

## 쓰는 법

```tsx
import ClothSim from './components/ClothSim';

<ClothSim style={{ width: 800, height: 600 }} />
```

위에 입력칸이 생긴다. 적고 `만들기` 를 누르면 진행 상태(번역, 보기 고르기, 옷 만드는 중)가 보이고, 끝나면 시뮬레이션이 시작된다.
크기는 style 로 정한다 (높이를 꼭 정해 줄 것).

LLM 은 기본으로 내 컴퓨터의 Ollama (`http://localhost:11434`, 모델 `qwen3-vl:8b-instruct`). 바꾸려면 `llm`:

```tsx
<ClothSim llm={{ model: 'qwen3-vl:8b-instruct' }} />                       // Ollama 모델 바꾸기
<ClothSim llm={{ backend: 'api', baseUrl: '', apiModel: '', apiKey: '' }} /> // OpenAI 형식 API (칸은 나중에 채움)
```

연결 실패는 콘솔(console.error)에 남고, `onLog={line => ...}` 로도 받는다.

조작, 결과 받기:

```tsx
const ref = useRef<ClothSimDesignerHandle>(null);
<ClothSim ref={ref} onSpec={spec => console.log(spec.tokens)} options={{ tear: true, strain: true }} />
ref.current?.generate('반팔 카라티');   // 입력칸 없이 바로 만들기
ref.current?.cancel();
ref.current?.reset();                    // 시뮬레이션 처음부터
```

| 속성 | 뜻 |
|---|---|
| llm | LLM 연결 (`backend` 'ollama' 기본 / 'api', `host`, `model`, `baseUrl`, `apiModel`, `apiKey`) |
| showInput | 입력칸 보이기 (기본 true) |
| defaultText, placeholder | 입력칸 처음 글자, 안내 글자 |
| fixed | `{ 'category/top/neck': 'hood' }` 처럼 미리 정한 토큰 (그 아래만 LLM 이 고름) |
| preprocess | 'v1_translate_en' (기본, 한국어면 먼저 영어로 번역) / 'none' |
| scene | 처음 보여 줄 장면 (`{meta, bin}` 또는 scene.json, scene.bin 폴더 주소) |
| options, autoplay, look | 시뮬레이션 설정 (아래 표) |
| onSpec, onScene, onProgress, onLog, onStats, onError, onReady | 알림 |

화면 없이 글자 -> 장면만: `const { spec, scene } = await textToScene('후드티', { llm: makeLLM() })`
장면만 보여 주기: `import { ClothSimView } from './components/ClothSim'` 후 `<ClothSimView scene={scene} />`

Next.js 는 파일 맨 위에 `'use client'`.

## Ollama 연결

- 개발 서버(localhost)에서는 바로 된다
- 다른 주소(배포한 사이트)에서 부르면 Ollama 가 막는다. Ollama 를 띄우기 전에 허용 주소를 정한다:
  Windows `setx OLLAMA_ORIGINS "https://내사이트.com"` 후 Ollama 다시 시작 (테스트는 `*`)
- 크롬은 공개 사이트에서 localhost 로 요청할 때 권한을 물어볼 수 있다 (사설망 접근)
- API 키를 프론트에 넣으면 사용자가 볼 수 있다. 테스트용으로만

## 시뮬레이션 설정 (`options` 또는 `ref.current.set(이름, 값)`)

| 이름 | 기본 | 뜻 |
|---|---|---|
| strain | true | 늘어남 색 (초록 → 빨강 = 찢어지는 길이) |
| tear | true | 원단 찢어짐 |
| seamTear | false | 봉제선 터짐 |
| push | false | 손가락 충돌 |
| body | true | 마네킹 보이기 |
| tearScale | 1 | 찢어짐 기준 배수에 곱하는 값 |
| speed | 1 | 화면 한 번에 계산할 프레임 수 |

## 조건

- 크롬, 엣지 최신 (WebGPU). HTTPS 또는 localhost 에서만 동작
- 마우스: 왼쪽 끌기 회전, 오른쪽(또는 Shift) 끌기 이동, 휠 확대
- 마네킹은 Anny 표준 체형 XS~XL (사이즈표 가슴, 키에 가장 가까운 것). 체형 직접 입력은 아직 없음
- 아직 없는 것: 맞음 검사(가슴 여유), 사이즈 자동 올림, 무작위 고르기(sample), 부분 수정

## 모듈 (수정 범위)

| 폴더 | 역할 | README |
|---|---|---|
| **anny/** | Anny 체형·포즈 asset, `loadBody` | `anny/README.md` |
| **garment/** | LLM + wasm 옷 생성 (`textToScene`) | `garment/README.md` |
| **drape/** | WebGPU 입힌 뒤 시뮬 (`createClothSim`) | `drape/README.md` |

루트: `ClothSim.js`, `ClothSimView.js`, `index.js` (UI·진입점). `engine/index.js`는 이전 import 호환용 re-export.

만든 파일 다시 만들기 (garment_maker 등):
- wasm·트리: garment_maker 빌드 스크립트 → `garment/wasm.js`, `garment/assets/trees/`
- 체형: `python -m garment.export.body_assets --out .../ClothSim/anny/assets/bodies` 후 `node tools/sync-cloth-bodies.mjs`
