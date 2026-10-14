# 백엔드 연동을 위한 현재 프론트엔드 계약

현재 코드는 실제 서비스 연동 전 Mock입니다. 실제 AI·업체 전송을 실행하지 않습니다. 기존 팀 API가 있다면 프론트엔드 요청부를 해당 계약에 맞춰 교체합니다.

## 디자인 생성

`POST /api/designs/generate`

```json
{
  "prompt": "도안을 더 작게",
  "currentDesign": "현재 편집 중인 Design 객체 (생략 가능)"
}
```

`currentDesign`은 위 표기와 달리 실제 요청에서는 객체입니다. 생략하면 기본 디자인을 기준으로 처리합니다. 프롬프트는 공백을 제외한 내용이 있어야 하며 최대 300자입니다. 현재 키워드와 현재 디자인을 분석한 `design` 객체, 대화 표시용 `reply`, `mode: mock`을 응답합니다. 추가 지시에서 언급하지 않은 의류·색상·문구는 현재 상태를 유지합니다. `Design.garment`는 `tee`/`hoodie`/`varsity`이며, 이전 저장의 생략된 값은 `tee`로 처리합니다.

실제 AI 연동에서는 도안 원본 경로, 미리보기 URL, 작업 ID 또는 작업 상태 조회 계약을 추가해야 합니다. 유료 AI 비밀 키는 서버에 둡니다.

## 업체 정보

현재 `lib/suppliers.ts`의 가상 데이터를 사용합니다. 필요한 필드는 업체 ID·이름·지역·최소 수량·제작 방식·제출 형식(`pdf`/`email`)·문서 제목·인쇄 영역·첨부 파일 종류·필수 요구 사항입니다.

실제 업체의 양식, 제작 조건과 수신 주소는 백엔드 담당자와 확인한 데이터로 교체해야 합니다. 프론트엔드는 선택한 업체의 제출 방식으로 문서를 자동 구성합니다.

## 견적 요청

`POST /api/quotes`

```json
{
  "supplierId": "jangwi",
  "filename": "",
  "design": {
    "color": "#253952",
    "ink": "#e9dec2",
    "text": "CAMPUS CLUB",
    "style": "campus",
    "side": "front",
    "x": 260,
    "y": 248,
    "scale": 100,
    "rotation": 0,
    "image": null
  },
  "order": {
    "group": "캠퍼스 동아리",
    "contactEmail": "team@example.com",
    "sizes": { "S": 5, "M": 12, "L": 8, "XL": 0 },
    "desiredDeliveryDate": "2026-11-05",
    "method": "DTF",
    "printWidthCm": 20,
    "printHeightCm": 20,
    "memo": "개별 포장 부탁드립니다."
  }
}
```

날짜 예시는 요청 시점에 맞춰 변경해야 합니다. 서버는 한국 시간 기준으로 오늘 이후인지 확인합니다. 총 수량과 제출 형식은 서버에서 사이즈 합계·선택 업체로부터 계산합니다. 요청자가 넘긴 형식이나 총 수량을 신뢰하지 않습니다.

성공 응답은 `201`:

```json
{
  "mode": "mock",
  "delivery": "not_sent",
  "quote": {
    "id": "quote_<UUID>",
    "mode": "mock",
    "status": "prepared",
    "createdAt": "<ISO 시간>",
    "supplierId": "jangwi",
    "design": "<제출 당시 디자인 객체>",
    "filename": "",
    "order": "<검증한 주문 객체>",
    "quantity": 25,
    "format": "pdf"
  }
}
```

위 `design`·`order`는 설명을 위한 표기이며 실제 응답에서는 객체입니다. 검증 실패는 `400`, 필드 오류가 있으면 `{ "error": "...", "fields": { "group": "..." } }`로 응답합니다.

현재 서버는 요청을 영구 저장하지 않습니다. 클라이언트가 성공 응답을 받은 뒤 브라우저 저장에 성공해야 완료 화면으로 이동합니다. 완료 시점의 디자인·주문 조건을 별도 보존해 이후 편집으로 내역이 바뀌지 않게 합니다.

## 실제 연동 시 교체할 부분

- 브라우저 임시 저장, IndexedDB의 누적 보관함, localStorage 견적 내역을 Supabase 디자인·도안·제작자료·견적 저장/조회로 연결하고 실제 저장 ID를 사용합니다.
- 이미지 data URL을 Storage 객체 경로로 교체합니다. 원본 도안과 2D 미리보기는 별도로 보존합니다.
- 서버에서 사용자 인증·디자인 소유권·업체 조건을 검증하고 RLS 정책을 적용합니다.
- 제출 중복 방지를 서버의 idempotency key·DB 제약과 함께 구현합니다.
- 실제 업체 전달 여부와 진행 상태를 응답하고, 프론트엔드의 ‘체험 요청’ 문구를 실제 상태에 맞게 변경합니다.
- `/quotes/[id]`와 `/my`는 현재 브라우저 내역을 읽습니다. 실제 연동 시 권한 있는 서버 조회로 교체합니다.
