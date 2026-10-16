# ClothSim

옷 천 시뮬레이션 (WebGPU, XPBD) React 컴포넌트. 이 폴더를 컴포넌트 폴더에 통째로 붙여넣으면 `<ClothSim scene=... />` 로 바로 쓴다.
React 말고 다른 패키지 필요 없음, 번들러 설정 필요 없음 (셰이더도 JS 문자열, JSX 안 씀). TypeScript 타입은 `index.d.ts`.

## 쓰는 법

이 폴더를 통째로 `src/components/` 에 붙여넣는다. 설치할 것 없음 (React 만 있으면 됨).

```tsx
import ClothSim from './components/ClothSim';

<div style={{ height: 600 }}>
  <ClothSim scene="/cloth" />
</div>
```

`scene` = `scene.json`, `scene.bin` 두 파일이 있는 폴더 주소. 테스트는 `public/cloth/` 에 두 파일을 넣고 `"/cloth"`.
크기는 감싸는 요소 크기를 따라감 (높이를 꼭 정해 줄 것).

설정 바꾸기, 조작:

```tsx
import { useRef, useState } from 'react';
import ClothSim, { type ClothSimHandle } from './components/ClothSim';

function Viewer() {
  const ref = useRef<ClothSimHandle>(null);
  const [tear, setTear] = useState(true);
  return (
    <div style={{ height: 600 }}>
      <ClothSim ref={ref} scene="/cloth" options={{ tear, strain: true }}
                onStats={s => console.log(s.frame, s.tornEdges)} />
      <button onClick={() => setTear(t => !t)}>찢어짐 {tear ? '끄기' : '켜기'}</button>
      <button onClick={() => ref.current?.reset()}>처음부터</button>
    </div>
  );
}
```

컴포넌트가 사라지면 GPU 메모리는 자동으로 정리된다. Next.js 는 파일 맨 위에 `'use client'`.

React 없이 쓰려면 `import { createClothSim } from './ClothSim'` 으로 canvas 에 직접 붙인다:
`const sim = await createClothSim(canvas, { scene: '/cloth' }); ... sim.destroy();`

## 설정 (`sim.set(이름, 값)`)

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
- canvas 크기는 CSS 로 정하면 됨 (화면 크기에 맞춰 자동으로 해상도 조절)
- 장면 파일(scene.json, scene.bin)은 Python 쪽 `design` / `render` 결과의 `cloth/` 폴더

## 파일

| 파일 | 하는 일 |
|---|---|
| index.js | 진입점 (기본 = React 컴포넌트, createClothSim) |
| ClothSimView.js | React 컴포넌트 `<ClothSim>` |
| create.js | createClothSim (canvas 에 붙이기, React 없이도 씀) |
| gpu.js | WebGPU 장치, 버퍼, 셰이더 만들기 |
| scene.js | 장면 읽기, 이웃 목록, 제약 색칠 |
| grid.js | 몸 충돌 격자 |
| solver.js | 계산 순서 (XPBD, 충돌, 봉제 합치기, 찢어짐) |
| renderer.js | 그리기 |
| camera.js | 마우스 카메라 |
| shaders/*.js | 계산과 그리기 셰이더 (WGSL), 단계마다 파일 하나 |
