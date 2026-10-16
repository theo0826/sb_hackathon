# 단색 반팔티 + 로고 API 계약

현재 사용자 확정 범위는 단색 반팔티와 로고 배치입니다. 원단 무늬, 소매 배색, 후드·과잠, 독립 문구·등번호 레이어를 새 디자인에 생성하지 않습니다.

## 디자인 데이터

`lib/design.ts`의 `Design`을 사용합니다. 새 결과는 `garment:"tee"`, `color:"#RRGGBB"`, `ink`, 로고의 `text`, `style`, `image`를 담습니다. `image`는 업로드/생성한 원본 하나이며 `null`, 제한된 data URL, 또는 소유자가 확인되는 `/api/assets/<uuid>`만 허용합니다. 외부 임의 URL은 허용하지 않습니다.

`placements`는 1~2개입니다. 같은 원본을 앞가슴과 등판에 재사용합니다.

```json
{
  "id": "front-chest", "side": "front", "x": 302, "y": 210,
  "widthCm": 8, "heightCm": 8, "rotation": 0,
  "content": "artwork", "text": "", "ink": "#ffffff"
}
```

왼쪽은 착용자 기준입니다. 앞면 왼쪽 가슴은 x302/y210, 중앙은 x260/y248, 등판 중앙도 x260/y248입니다. x/y는 기존 편집기의 논리 좌표이며 실제 공장 단위가 아닙니다. 인쇄 치수는 cm, 회전은 도입니다. 업체 제한은 서버에서 별도로 검증합니다.

`fabric`와 `fabricImage`는 새 계약에서 사용하지 않습니다. `simpleDesign()`이 이전 초안의 패턴·의류 종류·등번호를 현재 편집 범위로 정리합니다. 기존 저장 데이터 자체를 삭제하지 않습니다. 단일 배치의 기존 side/x/y/scale/rotation 필드는 읽기 호환을 위해 유지합니다.

## API 흐름

1. `POST /api/session`에 `{}`를 보내 HttpOnly 소유자 쿠키를 발급합니다.
2. `POST /api/designs/generate`에 `{prompt,currentDesign,requestKey}`를 보냅니다. prompt는 1~300자, currentDesign은 실제 Design 객체, requestKey는 작업별 UUID입니다.
3. 응답 `{mode:"live",status:"completed",jobId,design,reply,imageGenerations}`를 반영합니다. imageGenerations는 0 또는 1입니다.
4. 네트워크 오류/처리 중 409이면 같은 UUID의 `GET /api/jobs/<requestKey>`로 복구합니다. 새 요청을 자동으로 만들어 이중 생성하지 않습니다.
5. `POST /api/designs`에 `{design,title,prompt,filename,preview}`를 보내 저장합니다. `GET /api/designs`는 현재 소유자의 `{items}`입니다.
6. `POST /api/quotes`에 `{supplierId,design,filename,order,requestKey,conversionMode}`를 보냅니다. sample은 AI 없는 목업, ai는 AI 활성화 필요입니다. OrderDraft는 `lib/quote.ts`를 참고합니다.

업로드 이미지는 위치/크기/티셔츠 색상 변경 시 재사용합니다. 로고 생성이나 명시적 로고 편집에만 이미지 API를 호출합니다. 서버의 이미지 처리·DB 운영·실제 프롬프트 품질은 백엔드 팀원이 완성합니다. 비밀 키는 프론트에 반환하지 않습니다.

업체 응답은 `{mode,delivery:"not_sent",quote}`입니다. `quote.document.production.conversions`는 모든 앞뒤 배치에 대응해야 합니다. 고객 UV와 업체 봉제 패턴을 별도로 보관하고 단위/원점을 역변환해 위치·크기를 검증합니다. 실제 양식은 아직 없는 목업입니다.

오류는 `{error}`와 필요 시 `fields`를 반환합니다. 400 입력, 401 세션, 404 소유권/자료, 409 작업 충돌, 422 지원 범위 밖, 429 한도, 502 공급자/규격, 503 AI OFF, 504 지연입니다. `npm run test:unit`으로 공통 계약과 가짜 공급자 응답을 비용 없이 확인합니다.
