# GitHub Pages와 팀 작업

현재 게시 방식은 **Deploy from a branch → main → /docs**입니다. 게시 주소는 https://theo0826.github.io/sb_hackathon/ 입니다.

Next.js 소스와 GitHub Pages에서 실행할 정적 파일을 같은 `main` 브랜치에 함께 보관합니다. Pages는 `docs/index.html`과 `docs/_next/` 등 빌드된 파일을 직접 게시합니다. `.nojekyll`로 Next.js의 밑줄 경로를 유지하며, 기존 Markdown 문서와 `pattern-mockups/`는 보존합니다.

## 수정 후 게시

Node.js 24와 `npm ci`를 사용합니다.

```sh
git switch main
git pull --ff-only origin main
# 앱 수정 후
npm run test:unit
npm run prepare:pages
git add -A
git commit -m "Update site"
git push origin main
```

`prepare:pages`는 정적 빌드 → 산출물 검사 → `docs/` 갱신 → 게시본 검사를 수행합니다. 소스를 수정하면 이 명령으로 게시본도 갱신한 뒤 함께 커밋하세요. `.pages-export.json`에 기록한 이전 생성 파일만 교체하므로 일반 프로젝트 문서는 삭제하지 않습니다. `out/`, 환경 파일, 서버 API와 서버 전용 코드는 게시본에 포함하지 않습니다.

`main`에 push하면 GitHub의 **pages build and deployment**가 `docs/`를 게시합니다. 별도 **Validate main for GitHub Pages** 워크플로는 단위 검사·소스 빌드·게시본 검사를 수행하고 미리보기 artifact를 남깁니다. Pages 설정을 Actions 방식으로 바꾸거나 다른 브랜치를 게시하지 않습니다. `PAGES_ENABLED` 변수와 수동 artifact 배포는 필요하지 않습니다.

기존 `npm run deploy`는 별도 `gh-pages` 브랜치를 사용하는 예전 명령입니다. 현재 게시 방식에는 `npm run prepare:pages`와 `git push origin main`을 사용합니다.

## 저장소 설정

Settings → Pages에서 다음 값을 유지합니다.

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/docs**

`main / (root)`를 선택하면 Next.js 소스만 노출되고 앱 경로는 404가 됩니다. Pages의 브랜치 게시 폴더는 `/` 또는 `/docs`만 지원하므로 빌드 결과를 `/docs`에 둡니다. 저장소 루트의 소스 구조는 유지합니다.

## 로컬 확인과 데이터

```sh
npm run preview:pages
```

미리보기는 `http://127.0.0.1:4173/sb_hackathon/`이고, 로컬 서버는 `out/`을 사용합니다. 실제 게시 파일은 동일한 내용의 `docs/`입니다. 저장소 이름이 달라지면 `NEXT_PUBLIC_BASE_PATH`도 해당 이름으로 바꿔 빌드합니다.

- 디자인·3D 원본·제작자료는 현재 기기와 브라우저의 IndexedDB에 저장됩니다.
- 시연 주문과 연락처를 포함한 요청서는 현재 탭의 sessionStorage에 보관됩니다. 새로고침은 유지되며 탭을 닫으면 사라집니다.
- 상세 화면은 `/quotes/detail/?id=...`, `/orders/detail/?id=...`, `/my/detail/?id=...`로 직접 접근과 새로고침을 지원합니다.
- 의류 생성은 팀 Cloudflare Worker를 사용하며, 키를 프론트엔드에 포함하지 않습니다. 실제 생성은 Worker 가용성과 WebGPU 지원이 필요합니다.
- 업체 견적과 요청서 전달은 시연 흐름입니다. 실제 업체 발송·결제·서버 동기화는 구현되어 있지 않습니다.

ClothSim 내부의 기존 lint 경고와 담당 영역은 유지합니다. 변경 코드 lint, 단위 검사, 정적 빌드와 게시본 검사를 배포 전에 확인합니다.
