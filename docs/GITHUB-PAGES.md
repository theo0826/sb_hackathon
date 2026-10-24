# GitHub Pages와 팀 작업

배포 기준 브랜치는 `main`입니다. `components/ClothSim/`의 의상 생성·시뮬레이션 코드는 배포 복구 과정에서 수정하지 않습니다. 현재 데스크톱과 모바일 홈 모두 MotionHome이며, MinimalHome은 자동 전환되지 않는 별도 구현입니다.

## 현재 배포 상태

2026-10-24 점검에서 Pages가 `Deploy from a branch → main → /`로 설정되어 Next.js 앱 대신 README를 게시하고 있음을 확인했습니다. Pages의 Source는 **GitHub Actions**로 설정해야 합니다. `main` 루트의 Next.js 소스를 그대로 게시하거나 `out/`을 소스 브랜치에 커밋하지 않습니다.

`main`에 push하면 **Deploy main to GitHub Pages**가 단위 검사 → 정적 빌드 → 산출물 검사를 실행하고 검증된 `out/`만 Pages artifact로 배포합니다. 저장소 변수 `PAGES_ENABLED`가 `true`일 때만 deploy 작업을 실행합니다. 다른 브랜치에서는 배포하지 않습니다. 기존 `npm run deploy`는 `gh-pages` 브랜치에 파일을 올리는 별도 방식이므로 이 배포에는 사용하지 않습니다.

## 작업과 로컬 확인

Node.js 24와 `npm ci`를 사용합니다.

```sh
git switch main
git pull --ff-only origin main
# 수정·커밋 후
git push origin main

npm run test:unit
npm run build:pages
npm run test:pages
npm run preview:pages
```

미리보기: `http://127.0.0.1:4173/sb_hackathon/`. 산출물: `out/`.

빌드 스크립트는 `.tools/pages-source/` 복사본에서만 서버 API·서버 코드·런타임 ID 경로를 제외합니다. 환경 파일은 복사하지 않습니다. 정적 배포 빌드는 Webpack을 명시적으로 사용합니다. 원본 서버 소스와 일반 `npm run build`는 보존됩니다. 공개 이미지·3D 모델·장면 파일은 저장소 접두 경로를 사용합니다.

동료의 새 변경은 `main`에 병합되면 자동 배포됩니다. 충돌 시 기존 UI와 삭제 금지 연동을 함께 보존하고, ClothSim 폴더 내부는 담당 동료에게 맡깁니다.

## 배포 활성화 절차 (현재 적용 완료)

1. 공개 저장소는 무료 Pages를 사용합니다. 비공개라면 이를 지원하는 요금제가 필요합니다.
2. Settings → Pages → Source를 GitHub Actions로 설정합니다.
3. Settings → Environments → github-pages의 배포 허용 브랜치에 `main`이 포함되어 있는지 확인합니다. 기존 정책은 유지합니다.
4. Settings → Secrets and variables → Actions → Variables에 `PAGES_ENABLED=true`를 추가합니다. 비밀 키는 필요하지 않습니다.
5. main에 push하거나 해당 브랜치를 선택해 Deploy main to GitHub Pages를 수동 실행합니다.

예상 배포 주소는 `https://theo0826.github.io/sb_hackathon/`이며, 성공한 deploy 작업이 반환한 주소를 확인하세요. [GitHub 공식 워크플로 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## 서버 없이 제공하는 기능

- 예시 시안·직접 편집·로고 첨부·3D 미리보기·업체 비교·PDF 및 도안 다운로드는 브라우저에서 처리합니다.
- 저장한 디자인과 제작자료는 이 기기·브라우저의 IndexedDB에 보관됩니다. 서버 동기화는 없습니다.
- 시연 주문과 연락처를 포함한 요청서는 현재 탭의 sessionStorage에 보관합니다. 새로고침은 유지되며 탭을 닫으면 사라집니다.
- 상세 화면은 `/quotes/detail/?id=...`, `/orders/detail/?id=...`, `/my/detail/?id=...`로 직접 열기와 새로고침을 지원합니다.
- 유료 AI 생성·AI 변환은 비활성화됩니다. 목업 변환은 브라우저에서 실행하며 실제 결제·업체 발송은 없습니다. 정적 사이트는 Vercel·Supabase·서버 비밀 키를 사용하지 않습니다.

## 동료에게 필요한 파일과 검사 제한

현재 GitHub에는 `public/cloth/scene.json`, `public/cloth/scene.bin`이 없습니다. 담당 동료가 두 파일을 제공하거나 유효한 장면 경로를 알려줘야 ClothSim의 실제 의상이 표시됩니다. 컴포넌트와 장면을 임의로 대체하지 않았습니다. 파일이 준비되지 않았거나 WebGPU를 지원하지 않는 환경에는 부모 UI가 준비 안내를 표시합니다.

전체 ESLint에는 동료의 ClothSim 내부 기존 오류 2건(index.d.ts의 any, solver.js의 module 변수)과 경고가 있습니다. 해당 폴더를 제외한 앱·변경 코드 lint는 통과합니다. 담당 영역은 수정하지 않았습니다.

디자인 inspector는 기존 그림자 버튼·윤곽선·sticky 카드 겹침을 실패로 판정합니다. 사용자가 요청한 글래스 UI와 겹침 효과를 유지하는 병합 작업이므로 재설계하지 않았으며, 실제 화면·기능 검증과 별도로 기록합니다.

최종 검증: 정적 빌드·산출물 검사·TypeScript·단위 검사·ClothSim 외 앱 lint 성공. 실제 Chrome에서 데스크톱/모바일 가로 넘침, 디자인 저장·새로고침·삭제·복원, 로컬 목업 요청서 변환·상세 새로고침·삭제·복원, 서버 API 요청 0건과 런타임 예외 0건을 확인했습니다. 공유 검사에서 비밀 값 일치 항목은 없었으며 기존 이력의 일반 이메일 경고만 남았습니다.
