> 현재 범위 (2026-10-15): 단색 반팔티 + 로고 배치만 제공합니다. 후드·과잠, 원단 무늬·소매 배색·독립 등번호는 제거했습니다. 새 로고 생성은 요청당 최대 1장이고 원단 생성 호출은 없습니다. 아래 확장 기능 기록은 이전 작업 이력입니다. 최신 계약은 docs/AI-API-CONTRACT.md, 협업 안내는 docs/BACKEND-TEAM-HANDOFF.md를 참고하세요.

# Supabase + OpenAI 백엔드

이 문서는 현재 프로토타입의 구현 설명입니다. 실제 AI 서비스와 DB 운영은 백엔드 팀원이 완성합니다. 협업 시작점은 [팀원 인수 가이드](BACKEND-TEAM-HANDOFF.md), 전체 의상·앞뒤 배치 규격은 [AI 데이터 계약](AI-API-CONTRACT.md)입니다.

프롬프트 → 서버 AI 해석 → 도안 생성·수정 → 비공개 Storage → 의류 미리보기 → 업체 선택 → 주문 검증 → AI 제작 설명·견적 요청서 → Supabase 저장 순서입니다.

## 연결

프로젝트: `seongbuk_fit`, 서울 리전. 서버 환경변수는 루트 `.env.local`에 둡니다. 새 환경에서는 `.env.example`을 복사하고 값을 입력하세요.

- `SUPABASE_URL`: 프로젝트 URL
- `SUPABASE_SECRET_KEY`: Supabase API Keys의 `sb_secret_...` 서버 키 (legacy service role도 지원)
- `OPENAI_API_KEY`: OpenAI API 키
- `OPENAI_ENABLED`: 기본 `false`. 별도 비용 발생을 방지하기 위해 실제 AI 호출을 꺼 둡니다. AI 호출 경로는 준비돼 있지만 활성화 전에는 외부 AI에 요청하지 않습니다.
- `OPENAI_TEXT_MODEL`: 구조화 출력·이미지 입력을 지원하는 모델, 기본 `gpt-4.1-mini`
- `OPENAI_IMAGE_MODEL`: 투명 PNG 생성·편집을 지원하는 모델, 기본 `gpt-image-1.5`
- `AI_DAILY_LIMIT`: 서비스 전체 하루 작업 예약 한도, 기본 30 (한국 시간)
- `AI_SESSION_HOURLY_LIMIT`: 세션당 한 시간 예약 한도, 기본 5

키 값은 코드·Git·브라우저·로그·오류 응답에 넣지 않습니다. `.env.local`은 Git 제외 대상이며 `.env.example`에는 값이 없습니다. 배포 시 호스팅의 서버 환경변수에 같은 이름으로 넣습니다. `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. 키는 각 서비스 인증 요청에서만 사용합니다.

현재 클라우드에 `fit_backend_initial`, `fit_backend_security_policies` 마이그레이션을 적용했습니다. `supabase/schema.sql`은 새 DB용 최초 설치 스키마이며 기존 프로젝트에 중복 실행하지 않습니다. 플랫폼이 생성한 `rls_auto_enable()` 함수의 브라우저 실행 권한도 회수했습니다.

## 데이터 접근

`fit_jobs`는 프롬프트·작업 상태·중복 요청 키·결과, `fit_assets`는 Storage 경로, `fit_designs`는 저장 디자인, `fit_quotes`는 주문과 AI 문서를 보관합니다. 모든 테이블에 RLS를 적용했고 `anon`/`authenticated` 권한은 없습니다. 서버만 service role로 접근합니다.

브라우저마다 무작위 256bit HttpOnly 쿠키를 발급합니다. DB에는 쿠키 원문 대신 SHA-256 소유자 해시를 저장하고 모든 서버 조회·수정에 소유자 조건을 적용합니다. 프로덕션 쿠키는 Secure, `__Host-` 접두사, SameSite=Lax를 사용합니다. 자료 URL을 알아도 다른 세션은 접근할 수 없습니다. 이미지 버킷은 비공개이며 소유권을 확인하는 `/api/assets/[id]`를 통해서만 표시합니다. 공개 URL·서명 URL을 브라우저에 배포하지 않습니다.

현재 계정 로그인은 없습니다. 쿠키를 지우거나 다른 브라우저로 이동하면 기존 자료를 조회할 수 없습니다. 기기 간 동기화·계정 복구는 이후 Supabase Auth 로그인과 자료 이전이 필요합니다. 이전 IndexedDB 디자인과 localStorage 체험 견적은 기존 브라우저에서 유지합니다.

## AI 및 업체 양식

고객 UV에서 업체 봉제·인쇄 패턴으로 변환하는 목업 3종과 SVG·JSON·PDF/이메일 출력을 추가했습니다. 실제 AI는 좌표·단위·패널·작업 설명을 구조화 출력하며, 서버가 고객 UV에 역변환하여 원본·배치 일치를 검사합니다. `/patterns`와 ‘목업 양식으로 변환·저장’은 AI 없이 같은 구조를 확인하는 경로입니다. [UV·패턴 프로세스](UV-PATTERN-CONVERSION.md)를 참고하세요.

AI 해석은 JSON Schema 출력과 런타임 규격 검증을 사용합니다. 의류·기본색·원단·소매색·앞뒤 배치를 함께 반환합니다. 업로드 원본은 보존하고 위치·크기 변경에 재생성을 사용하지 않습니다. 새 그래픽 요청만 이미지 생성, 명시적인 도안 재작업만 이미지 편집을 선택합니다. 문구·등번호·기본 줄무늬는 코드가 그립니다. 새 그래픽과 커스텀 원단을 함께 요청하면 최대 두 장의 이미지가 생성되므로 한 작업이 항상 한 이미지 비용인 것은 아닙니다. 생성 원본은 PNG로 정규화해 저장합니다. 이미지 URL은 임의 외부 URL을 허용하지 않아 서버가 사용자 지정 호스트로 요청하지 않습니다.

현재 업체 3곳은 `lib/suppliers.ts`의 가상 정보입니다. PDF 2종·이메일 1종에 맞게 AI가 이미지와 주문 조건을 보고 제작 설명과 확인 사항을 작성합니다. 수량·날짜·크기·제작 방식·연락처는 서버 검증값을 사용합니다. AI가 견적 금액이나 업체 연락처를 만들지 않습니다. PDF·이메일 파일에 AI 설명을 포함하고 서버에 원래 주문과 도안을 함께 저장합니다.

주문 검토 단계에서 AI 문서를 만들고 저장하므로 검토 화면을 닫아도 요청서가 보관됩니다. 실제 업체 발송·견적 회신은 구현 범위에 포함되지 않으며 상태는 `prepared`, `delivery=not_sent`입니다. 실제 양식을 받으면 업체별 필수 항목과 템플릿 버전을 바꾸면 됩니다.

## 중복·한도·오류

AI 호출 전 DB 함수가 트랜잭션 잠금으로 요청을 예약합니다. 같은 세션과 requestKey는 같은 결과를 반환하고 입력이 달라지면 거부합니다. 한도는 실패한 예약도 포함합니다. 네트워크가 끊기면 클라이언트가 같은 작업을 조회합니다. 새로 생성 버튼을 누르는 별도 요청은 새로운 작업으로 계산됩니다.

외부 서비스의 응답 본문과 오류 객체는 사용자에게 전달하거나 로그에 출력하지 않습니다. 공급자 오류는 일반 메시지로 변환합니다. 요청은 4.5MB, 첨부 이미지 입력은 약 3MB, 서버 이미지 디코딩은 64MP로 제한합니다. 배포 환경은 최대 300초의 API 실행을 지원해야 합니다. 짧은 제한의 호스팅에서는 큐와 별도 작업자를 추가해야 합니다.

## 검증 명령

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
node tests/ai-contract.mjs
# 로컬 서버와 .env.local이 준비된 상태
node tests/backend-api.mjs
# 유료 AI는 호출하지 않는 테스트만 실행합니다.
```

테스트는 샘플 디자인·요청서를 DB에 남기며, 브라우저용 코드와 HTTP 응답에 실제 키 값이 포함됐는지도 검사합니다. 실패 메시지는 키 값을 출력하지 않습니다. AI 변환 모듈은 가짜 응답으로 검증해 네트워크를 호출하지 않습니다. `--ai` 옵션과 활성화된 AI 설정에서는 안전을 위해 테스트가 실행을 거부합니다.

현재 검증 결과: 세션 발급·CSRF 검사·잘못된 입력 거부, 디자인 저장·수정·소유권, 비공개 PNG 저장과 다른 세션 차단, 업체 3종의 샘플 요청서 저장·조회, 키의 브라우저 파일·HTML·응답 미포함, 1440px/390px 브라우저 화면, PDF·이메일 파일 다운로드를 확인했습니다. DB 중복 요청·예약 한도는 롤백 트랜잭션으로 검사했습니다. Supabase 보안 advisor 경고는 없습니다. 실제 AI 통합 테스트는 1회 시도했으나 429로 실패해 생성 성공을 확인하지 못했으며, 비용 보호 요청 이후 추가 호출을 중단하고 기본 설정에서 비활성화했습니다.

참고: [Supabase API 키](https://supabase.com/docs/guides/api/api-keys), [비공개 Storage](https://supabase.com/docs/guides/storage/serving/downloads), [OpenAI 구조화 출력](https://developers.openai.com/api/docs/guides/structured-outputs), [OpenAI 이미지 생성](https://developers.openai.com/api/docs/guides/image-generation).
