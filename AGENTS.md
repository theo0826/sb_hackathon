<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 디자인 작업 규칙

- 프론트엔드 디자인을 만들거나 수정할 때
  `design-taste-frontend` 스킬을 반드시 읽고 적용한다.
- 기존 디자인 방향은 `.taste-skill/direction.json`과
  `docs/TASTE-DESIGN.md`를 먼저 확인하고 유지한다.
- 사용자 요청 없이 새로운 디자인 방향을 추첨하지 않는다.
- 변경 후 실제 브라우저에서 데스크톱과 모바일 화면을 확인한다.
