# 새 백엔드 연결과 테스트

현재 프론트엔드는 개인 Supabase·GPT API 키를 사용하지 않습니다. AI 디자인 생성·업체 패턴 변환 버튼은 서버 상태와 관계없이 활성화됩니다. 생성 중에는 중복 클릭을 막습니다. 주소 미설정 시 연결 준비 안내만 표시하며, 기존 개인 API로 대체 호출하지 않습니다.

## 백엔드 팀이 설정할 두 주소

.env.local 또는 빌드 환경에 다음 공개 URL만 설정합니다. API 키는 프론트엔드에 넣지 않습니다.

```env
NEXT_PUBLIC_AI_DESIGN_URL=https://BACKEND_HOST/팀에서-정한-디자인-경로
NEXT_PUBLIC_AI_QUOTE_URL=https://BACKEND_HOST/팀에서-정한-변환-경로
```

주소 경로는 백엔드 팀이 정합니다. 같은 서버에 배포하면 /새로운-경로 형태도 지원합니다. 경로를 바꾸기 위해 화면 코드를 수정할 필요가 없습니다. 로컬은 npm run dev로 실행합니다. GitHub Pages는 같은 이름의 저장소 Actions Variables를 설정한 후 feature/ui를 다시 빌드·배포합니다. NEXT_PUBLIC_ 값은 빌드 때 포함됩니다.

별도 도메인의 API는 프론트엔드 출처에 대한 CORS와 OPTIONS를 지원해야 합니다. 요청은 application/json POST이며 기존 개인 세션 쿠키와 Authorization 헤더를 보내지 않습니다. 인증을 새로 도입할 경우 lib/ai-client.ts에 백엔드 팀 방식으로 추가합니다. 기존 개인 /api/session, /api/jobs, /api/assets에는 의존하지 않습니다.

## 요청·응답 계약

구현 위치: lib/ai-client.ts. 아래 JSON은 규격 표기이며 Design·OrderDraft·QuoteRecord의 전체 필드는 해당 타입을 따릅니다.

| 기능 | 요청 JSON | 성공 응답 |
| --- | --- | --- |
| AI 디자인 | { prompt, currentDesign, requestKey } | { design, reply? } |
| AI 업체 변환 | { supplierId, design, filename, order, conversionMode: 'ai', requestKey } | { quote } |

Design은 lib/design.ts의 isDesign, QuoteRecord는 lib/quote.ts의 isQuoteRecord를 통과해야 합니다. 현재 단색 반팔·로고 배치 규격을 유지합니다. 이미지가 있다면 image는 null 또는 3,000,000자 이하의 PNG/JPEG/WebP base64 data URL로 반환합니다. 기존 개인 서버의 /api/assets/... 경로를 반환하면 안 됩니다. 테스트용 전체 Design 예시는 tests/fixtures/team-design.json에 있습니다.

quote는 quote_UUID 형태의 id, mode: 'live', status: 'prepared', createdAt(ISO), supplierId, design, filename, order, quantity, format('pdf' 또는 'email')을 반환합니다. PDF·메일 내용에는 document(QuoteDocument)가 필요합니다. QuoteDocument의 title, templateVersion, generatedAt, summary, productionNotes, checks, emailSubject, emailBody, verifiedRows를 채웁니다. 필요하면 production 패턴 정보를 함께 반환합니다. 전체 타입은 lib/quote.ts, 양식 생성 예시는 lib/production-document.ts에 있습니다. PDF 생성·메일 양식 다운로드는 기존 프론트엔드가 처리하며 메일을 실제로 발송하지 않습니다.

실패는 4xx/5xx와 { error: '표시할 안내', fields?: { 필드명: '오류 안내' } }를 반환합니다. 화면은 안내를 표시하고 다시 시도할 수 있습니다. 현재 어댑터는 240초 이내의 최종 응답을 받습니다. 비동기 작업/스트리밍 규격은 새 백엔드 구현 시 어댑터 한 곳에서 확장합니다. requestKey는 중복 요청 구분용입니다.

## 저장과 개인 연결 차단

디자인·제작자료는 IndexedDB, 요청서와 시연 주문은 현재 탭 저장소를 사용합니다. 새 서버 응답의 요청서는 현재 탭에도 저장해 상세·PDF·메일 다운로드를 이어갑니다. 서버에 저장할지 여부와 구현은 새 백엔드 팀이 결정합니다.

이전 개인 서버 코드는 이전 이력 호환을 위해 남아 있지만 LEGACY_BACKEND_ENABLED=false가 기본이며, AI·DB 호출 전에 차단됩니다. 기존 OPENAI_ENABLED도 로컬에서 false로 되돌렸습니다. 개인 키 파일은 Git에 포함하지 않습니다. 종전 npm run dev:ai / ai:enable 명령은 제거했습니다. 새 백엔드를 연결할 때 이 스위치나 개인 키를 켤 필요가 없습니다.

ClothSim은 별도 탭·입력창 없이 디자인 미리보기 안에 통합했습니다. 왼쪽 공통 입력창에서 설명을 쓰고 AI 시안 만들기를 누르면 그 문장이 ClothSim.generate에 전달됩니다. 기본 Ollama 연결은 유지했으며 개인 GPT·Supabase 키와 관계없습니다. NEXT_PUBLIC_AI_DESIGN_URL이 설정돼 있으면 같은 제출로 새 디자인 API도 호출하고 반환된 인쇄 시안을 반영합니다. 의상 생성과 인쇄 시안은 독립 처리하며 하나가 실패해도 성공한 미리보기는 유지합니다. 생성 취소는 두 요청을 중단하며, 의상 장면만 생성된 경우 기존 반팔 주문 도안을 임의로 덮어쓰지 않습니다. 교체할 경우 백엔드 담당자가 ClothSim 모듈의 LLM 연결을 수정합니다.

업체별 도안 버튼은 주문서 확인 → 업체 비교의 각 업체 카드에 있는 AI 맞춤 도안 만들기입니다. 누르면 해당 업체와 인쇄 치수를 적용하고 /quotes/prepare로 이동합니다. 그 화면에서 같은 이름의 버튼으로 새 변환 API를 호출합니다. PDF·메일 양식 모두 이 경로를 사용합니다.

업체 선택만으로 주문을 생성하는 경로는 제거했습니다. 변환된 맞춤 도안을 화면에서 검토하고 확인란을 체크해야 도안 확인 후 주문하기가 활성화됩니다. 주문 저장 함수에서도 문서 존재·확인 여부와 업체·디자인·파일명·주문 조건의 일치를 검증합니다. 조건이 바뀌면 도안을 다시 생성해야 합니다. 확인한 QuoteRecord를 주문에 함께 저장하며, 주문 상세와 제작자료 목록은 이 문서의 ID와 내용을 그대로 사용합니다. 기존 주문은 종전 목업 자료를 유지합니다. 현재 주문 저장은 시연용 탭 저장소이며 실제 접수 API를 연결할 때도 서버에서 문서 버전과 승인 여부를 검증해야 합니다.

## 검증

npm run test:unit에는 새 어댑터의 주소·요청·오류 처리를 검증하는 모의 테스트가 포함됩니다. 개인 API·DB와 실제 유료 생성 요청은 호출하지 않습니다. 이전 test:backend는 개인 서버용으로 남은 검사이며 새 백엔드 검증에 사용하지 않습니다.
