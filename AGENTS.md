<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 디자인 작업 규칙

- 프론트엔드 디자인을 만들거나 수정할 때
  `design-taste-frontend` 스킬을 반드시 읽고 적용한다.
- 기존 디자인 방향은 `.taste-skill/direction.json`과
  `design/TASTE-DESIGN.md`를 먼저 확인하고 유지한다.
- 사용자 요청 없이 새로운 디자인 방향을 추첨하지 않는다.
- 변경 후 실제 브라우저에서 데스크톱과 모바일 화면을 확인한다.

## 시연 전 작업 범위와 배포

- 사용자 요청 없이 기능을 추가하지 않는다. 시연에 필요한 기존 동작을 유지한다.
- `components/ClothSim/**`, `public/cloth-bodies/**`는 백엔드팀 관리 대상이다. 수정·삭제·자동 정리·포맷팅하지 않는다.
- ClothSim에서 새 데이터가 필요하면 형식을 정리해 담당자에게 요청한다. 추출 함수를 임의로 구현하지 않는다.
- `output: "export"` 정적 빌드를 유지한다. 서버 API·동적 상세 경로·404 우회 라우팅을 추가하지 않는다.
- 소스 브랜치에는 소스만 관리한다. `out/`·`docs/`·임시 자료·Figma 원본을 커밋하지 않는다.
- `npm run deploy`는 검증 후 `out/`만 `gh-pages`에 게시한다. 테스트를 위해 `main`에 소스를 올리지 않는다.
