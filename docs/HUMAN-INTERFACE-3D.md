# Human Interface 스타일과 3D 미리보기

2026-10-14. 이전 NEUMORPHISM-UPDATE.md의 시각 스타일을 대체한다. 기존 네 단계와 마이페이지의 두 항목은 유지한다.

## 화면과 디자인

- 디자인 생성 결과가 왼쪽, 대화 입력이 오른쪽이다. 모바일에서는 결과가 위에 온다.
- 밝은 중립 배경, 흰색 표면, 시스템 서체, 파란 주 동작, 분절형 선택 컨트롤을 사용한다. 뉴모피즘의 양방향·내부 그림자를 제거했다.
- 의류가 주인공이 되는 기존 taste-skill 방향 The product performs(seed 1774395272)를 유지한다. 사용자가 승인한 레이아웃을 바탕으로 배치와 시각 언어를 변경했으며 추가 추첨은 하지 않았다.
- 아이디어: 동아리의 문구와 로고가 실제로 돌려볼 수 있는 반티가 되고, 그 도안이 성북 업체의 제작자료로 이어진다.
- 공식 참고: [Apple Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles/), [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials). Apple 제품의 복제나 공식 HIG 적합성 인증을 의미하지 않는다.

## 3D 구현

- Three.js의 WebGLRenderer와 OrbitControls를 사용한다. 이미지에 CSS 회전만 적용하는 방식이 아닌 실제 메시와 카메라다.
- 반팔, 후드, 과잠은 코드로 구성한 개방형 의류 모델이다. 원단색·인쇄색·문구·도안 스타일·첨부 이미지·앞뒤 인쇄면·크기·위치·회전을 반영한다.
- 드래그, 방향키 회전, 앞면·뒷면 보기, 확대·축소, 시점 초기화가 가능하다. 회전과 보는 방향은 인쇄면을 변경하지 않는다.
- 도안 텍스처는 기존 Artwork SVG 또는 사용자 첨부 이미지에서 만든다. 인쇄 도안은 원단 표면을 따라 휘며 옷의 영역 안으로 제한된다.
- 저장과 PDF 출력은 현재 조작 각도와 무관하게 실제 인쇄면을 바라보는 1040×1040 PNG를 만든 뒤 사용자가 보던 시점으로 돌아온다.
- 도안 확인·저장 디자인 상세에도 같은 3D 뷰어를 적용했다. 원본 도안은 기존 SVG/PNG로 보존한다.
- 브라우저의 WebGL 초기화 실패, 컨텍스트 손실에는 기존 2D 뷰어로 이어지며 저장도 유지한다.
- 변경 시에만 렌더링하고, 입력 문장 변경만으로 메시를 재생성하지 않는다. 라우트 전환 시 메시·텍스처·컨트롤·GPU 컨텍스트를 정리한다.
- 참고 구현 문서: [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [CanvasTexture](https://threejs.org/docs/pages/CanvasTexture.html).

## 검증과 화면 비평

- Next.js 프로덕션 빌드, 타입 검사 통과.
- 변경한 3D 컴포넌트·모델·디자인 스튜디오의 ESLint 통과.
- `.taste-skill/three-check.mjs`: WebGL 초기화, 좌우 배치, 실제 포인터·키보드 회전, 확대, 앞뒤 도안, 세 의류, 첨부 이미지, 1040px 저장, 모바일·태블릿·작은 노트북, WebGL 실패 대체 등 17개 통과.
- `.taste-skill/flow-check.mjs`: 생성·저장·불러오기·업체 선택·도안 확인·견적 대기·PDF 실제 다운로드 등 18개 통과.
- taste-skill 실측: 1440/768/390px에서 0 FAIL, 4 WARN. 앱에 맞지 않는 마케팅 사진 수량·큰 제목·모션 수량과 실제 단계 표시, 기본 컨트롤의 얕은 그림자를 허용했다.
- 경고 판단: 입력창 테두리는 입력 영역을 구분한다. 영상 대신 실제 3D 상호작용이 있다. 12px는 보조 조작 안내와 키보드 안내에 한정한다. 모바일 혼합 서체 경고는 제목 내부 서체를 실제로 변경하지 않은 것으로 확인했다.
- 스크린샷 위치: `.taste-skill/hig-final/`, `.taste-skill/three/`, `.taste-skill/flow/`.
- 자체 화면 평가: 디자인 8, 사용성 8, 창의성 7, 내용 8, 가중 평균 7.8/10. 눈에 보였던 소매 연결 틈과 후드의 닫힌 형태를 수정하고, 후드 높이에 맞춰 카메라 구도를 조정했다. 원단 모델은 단순화된 형태이며 실제 상품 촬영 수준의 모델링은 후속 개선 여지가 있다.

## 데이터와 범위

외부 사진, 모델 파일, 가상 실적을 추가하지 않았다. 모델은 이 프로젝트에서 만든 절차적 형상으로, 실제 제조사의 패턴·착용 시뮬레이션이나 치수 검수용 모델이 아니다. 생성 API와 업체 발송은 기존 체험 모드이며 UI에서 계속 표시한다. 기존 저장 데이터는 그대로 유지된다.
