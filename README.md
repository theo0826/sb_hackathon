# 한땀

성북구 단체복 디자인·주문 시연용 Next.js 프론트엔드입니다. 정적 HTML/CSS/JS로 빌드하고 GitHub Pages에서 실행합니다. 의류 생성은 팀 ClothSim Worker에 요청하며, 저장한 디자인·주문 자료는 현재 브라우저에 보관합니다.

## 실행과 검증

Node.js 24 LTS와 npm을 사용합니다. Windows PowerShell에서 실행 정책 문제가 있으면 `npm` 대신 `npm.cmd`를 사용하세요.

```sh
npm ci
npm run dev
```

개발 주소는 `http://127.0.0.1:3000`입니다.

```sh
npm run lint:frontend
npm run typecheck
npm run test:unit
npm run build
npm run test:pages
npm run preview:pages
```

기본 빌드는 항상 `output: "export"`로 `out/`을 생성합니다. 별도 서버용 빌드나 소스 복사본은 없습니다. 정적 미리보기는 `http://127.0.0.1:3000/sb_hackathon/`이며 `npm start`도 같은 미리보기를 실행합니다. 개발 서버를 종료한 뒤 실행하세요. 팀 Worker가 허용하는 로컬 출처에 맞춰 3000번 포트를 사용합니다.

배포 검사는 프론트엔드 소유 코드를 검사합니다. `npm run lint`는 백엔드팀 ClothSim까지 포함한 전체 진단용이며, 2026-11-02 팀 최신본에는 `PatternEditor.js`의 React Hook 규칙 오류 6개가 있습니다. 원본 보존 요청에 따라 수정하거나 숨기지 않았습니다. 단위 검사·TypeScript·정적 빌드·브라우저 기능 검증은 별도로 수행합니다.

## GitHub Pages 배포

```sh
npm run deploy
```

검사·정적 빌드·산출물 검증이 모두 성공해야 `gh-pages` 패키지가 `out/` 내용만 원격 `gh-pages` 브랜치의 루트에 게시합니다. 현재 소스 브랜치나 `main`을 push하지 않습니다. 작업 브랜치에서 개발·검증·배포하고, 소스 반영은 팀의 검토 절차를 따르세요.

GitHub Settings → Pages 설정은 **Deploy from a branch → gh-pages → /(root)** 입니다. `main /docs`를 사용하지 않습니다. `.nojekyll`로 `_next/` 자산을 그대로 제공합니다.

사이트: https://theo0826.github.io/sb_hackathon/

`NEXT_PUBLIC_BASE_PATH` 기본값은 배포 빌드에서 `/sb_hackathon`, 개발 서버에서 빈 문자열입니다. 다른 저장소나 도메인에 게시할 때 빌드 전에 설정하며, 미리보기에도 같은 값을 지정하세요. 상세 페이지는 `/my/detail/?id=…`, `/quotes/detail/?id=…`, `/orders/detail/?id=…`처럼 실제로 내보낸 정적 경로를 사용합니다. 404 페이지를 이용한 우회 라우팅은 없습니다.

GitHub Actions는 작업 브랜치·PR의 빌드를 검증하고 `static-preview` 산출물을 보관합니다. 소스 push만으로 운영 페이지를 덮어쓰지 않습니다.

## 백엔드 연결과 시연

`.env.example`을 참고해 필요한 공개 URL만 `.env.local`에 설정하세요. API 키·비밀 키는 프론트엔드에 넣지 않습니다.

- `NEXT_PUBLIC_CLOTH_WORKER_URL`: 팀 의류 생성 Worker. 미설정 시 기존 팀 URL을 사용합니다.
- `NEXT_PUBLIC_AI_DESIGN_URL`, `NEXT_PUBLIC_AI_QUOTE_URL`: 팀이 제공하는 별도 API를 연결할 때만 설정합니다.
- 초기 화면 → 시작하기 → 디자인 생성 → 로고 편집·저장 → 주문서 → 업체 견적 → 전달 내역 순서로 확인합니다.
- 실제 AI 생성에는 네트워크와 Worker가 필요합니다. WebGPU 지원 브라우저를 사용하세요.
- 브라우저 데이터 삭제·시크릿 창·다른 기기에서는 기존 저장 자료를 공유하지 않습니다. 시연 브라우저의 데이터를 지우지 마세요.

## 폴더와 작업 범위

- `app/`: 정적 페이지와 기존 화면 스타일
- `components/`, `lib/`: 사용 중인 화면과 데이터 처리
- `components/ClothSim/`, `public/cloth-bodies/`: **백엔드팀 관리, 수정·삭제 금지**
- `public/ui/`, `public/onboarding/`: 실제 화면에 필요한 로고·아이콘·영상
- `tests/`, `tools/`: 현재 기능 검사와 정적 배포 도구
- `design/TASTE-DESIGN.md`: 기존 디자인 유지 기준

`docs/`, `out/`, 임시 파일, Figma 원본은 소스 브랜치에 올리지 않습니다. 사용자 요청 없이 기능을 추가하지 않습니다. ClothSim에 추가 데이터가 필요하면 형식을 정리해 백엔드 담당자에게 추출 함수를 요청하세요.
