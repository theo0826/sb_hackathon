# 서버 API 계약

모든 사용자 API는 동일 출처에서 호출합니다. `.env.local`에는 서버 키만 설정하며 클라이언트가 키를 전달하지 않습니다. 민감한 응답은 `Cache-Control: private, no-store`입니다.

## 세션

`POST /api/session`, JSON `{}`. AI 호출·디자인 저장 전 호출해 HttpOnly 세션 쿠키를 먼저 확정합니다. 성공 `{ "ready": true }`. 계정 로그인이 없는 브라우저 세션이며 원문 토큰·DB 소유자 해시를 응답하지 않습니다.

## AI 디자인

현재 사용자 비용 보호 요청에 따라 `OPENAI_ENABLED=false`입니다. 실제 AI 생성·변환 API는 입력 검증 후 503으로 종료하며, DB 작업 예약·외부 AI 호출이 발생하지 않습니다. `/api/quotes`의 명시적 `conversionMode: "sample"`은 별도의 비용 없는 목업 변환·저장 경로입니다. 개인 API 키 호출은 ChatGPT/Codex 구독과 별도 과금이므로 자동 활성화하지 않습니다.

`POST /api/designs/generate`

```json
{
  "prompt": "네이비 반팔에 동아리 배지를 그려줘",
  "requestKey": "고유 UUID",
  "currentDesign": "현재 Design 객체 (생략 가능)"
}
```

`currentDesign`은 실제 객체입니다. 프롬프트 1~300자, 기존 디자인 규격을 검증합니다. 응답:

```json
{
  "mode": "live",
  "status": "completed",
  "jobId": "UUID",
  "design": "검증된 Design 객체",
  "reply": "AI 설명"
}
```

`Design.image`는 null, 업로드 data URL 또는 소유권을 확인하는 `/api/assets/<UUID>`입니다. 저장 후에는 data URL을 비공개 Storage 파일로 변환합니다. 외부 이미지 URL은 거부합니다.

`GET /api/jobs/<requestKey>`는 현재 세션의 작업 상태와 완료 결과를 반환합니다. 같은 requestKey와 입력은 이미 완료된 결과를 재사용하며 서로 다른 입력은 409입니다. 처리 중인 작업도 409 후 상태 조회로 복구합니다. 실패는 새로운 requestKey로 재시도합니다.

## 디자인 저장

- `POST /api/designs`: `{ design, prompt, filename, title, preview }`, 성공 201 `{ item }`. preview는 null 또는 이미지 data URL/세션의 asset URL입니다.
- `GET /api/designs`: `{ items: [...] }`, 현재 세션의 최근 저장 디자인 100건.
- `PATCH /api/designs/<UUID>`: title, favorite, trashedAt만 수정 가능. 브라우저 항목 ID의 `cloud_` 접두사를 제외한 UUID를 사용합니다.
- `PATCH /api/quotes/quote_<UUID>`: `{ "trashedAt": "ISO 날짜" }`로 휴지통 이동, `{ "trashedAt": null }`로 복원합니다. 현재 쿠키 소유자만 수정하며 주문·도안·문서·중복 요청 식별자는 유지합니다. 다른 필드는 수정할 수 없습니다.
- 마이페이지의 삭제는 디자인·견적 요청서를 휴지통으로 옮기는 방식입니다. 휴지통의 복원 또는 삭제 직후 실행 취소를 이용할 수 있습니다. 이 작업은 DB 행이나 이미지 파일을 영구 삭제하지 않습니다. 기존 브라우저 저장 항목도 같은 방식으로 복원할 수 있습니다.
- `GET /api/assets/<UUID>`: 현재 세션의 이미지 바이트. 다른 세션 404, 세션 없음 401.

## 업체별 견적 요청서 생성

고객 확인용 UV와 업체 봉제·인쇄 패턴을 별도 객체로 저장합니다. `document.production`에는 고정한 고객 UV 스냅샷 `source`, 업체 목업 양식 `template`, AI 또는 예시 변환 명세 `conversion`, 원본 유지·위치/크기/회전 역검증 `verification`, 재단 승인 전 M 봉제 패널 `sewing`을 포함합니다. 출력은 좌상단 mm, 목 중심 cm, 패널 중심 mm 목업 3종입니다. [변환 상세](UV-PATTERN-CONVERSION.md)를 참고하세요.

요청의 `conversionMode`는 `ai`(기본) 또는 `sample`입니다. 후자는 같은 검증·렌더링·Supabase 저장 구조를 사용하지만 AI를 호출하지 않으며 응답 `mode=mock`, `production.converter=sample`로 구분합니다. UI의 ‘목업 양식으로 변환·저장’ 버튼으로 사용할 수 있습니다.

`POST /api/quotes`

```json
{
  "requestKey": "고유 UUID",
  "supplierId": "jangwi",
  "filename": "AI 디자인.png",
  "design": "실제 Design 객체",
  "order": {
    "group": "캠퍼스 동아리",
    "contactEmail": "team@example.com",
    "sizes": { "S": 5, "M": 12, "L": 8, "XL": 0 },
    "desiredDeliveryDate": "2099-01-01",
    "method": "DTF",
    "printWidthCm": 18,
    "printHeightCm": 18,
    "memo": "개별 포장 부탁드립니다."
  }
}
```

날짜 예시는 실제 요청 시 변경합니다. 서버가 업체 규격·최소 수량·사이즈 합계·KST 날짜를 검증하고 AI가 도안과 선택 업체의 조건을 보고 제작 설명을 작성합니다. 성공 201:

```json
{
  "mode": "live",
  "delivery": "not_sent",
  "quote": {
    "id": "quote_<UUID>",
    "mode": "live",
    "status": "prepared",
    "createdAt": "ISO timestamp",
    "supplierId": "jangwi",
    "design": "제출 당시 객체",
    "filename": "AI 디자인.png",
    "order": "검증한 주문 객체",
    "quantity": 25,
    "format": "pdf",
    "document": {
      "title": "업체의 문서 제목",
      "templateVersion": "draft-v1",
      "generatedAt": "ISO timestamp",
      "summary": "AI 도안 설명",
      "productionNotes": ["제작 주의사항"],
      "checks": ["업체 확인사항"],
      "emailSubject": "검증한 단체명과 수량",
      "emailBody": "검증 주문 조건과 AI 설명",
      "verifiedRows": [["총 주문 수량", "25벌"]]
    }
  }
}
```

실제 design/order/item 객체는 위 설명용 문자열과 다릅니다. 금액과 업체 발송 여부를 AI가 만들지 않습니다. `GET /api/quotes`는 현재 세션 요청서 100건, `GET /api/quotes/quote_<UUID>`는 권한 있는 단건을 반환합니다.

## 오류

`{ error: "사용자에게 보여줄 일반 메시지" }` 형태입니다. 주문 검증 오류에는 `fields`를 추가합니다. 400 잘못된 입력, 401 세션 없음, 403 다른 출처, 404 자료 없음/다른 소유자, 409 중복·처리 중, 413 크기 제한, 415 JSON 이외, 429 AI 예약 한도, 502 외부 서비스·DB 오류, 503 서버 미설정, 504 AI 타임아웃입니다. 공급자 오류 본문이나 비밀 키는 포함하지 않습니다.

현재 업체와 양식은 가상 정보의 초안입니다. 실제 업체 도안·견적서 양식이 전달되면 `lib/suppliers.ts`와 AI 입력 템플릿을 해당 버전으로 바꿉니다. 실제 발송은 별도 구현입니다. [백엔드 운영 문서](BACKEND.md)를 참고하세요.
## 전체 의상·팀 협업 계약

앞뒤 여러 배치, 정확한 문구·등번호, 원단·소매·테두리 색과 공통 테스트 샘플은 [AI-API-CONTRACT.md](AI-API-CONTRACT.md)를 기준으로 연결합니다. 백엔드 팀원 작업 경계·실행 방법은 [BACKEND-TEAM-HANDOFF.md](BACKEND-TEAM-HANDOFF.md)에 있습니다. 기존 기본 라우트 계약은 유지합니다.
