# 백엔드 AI 테스트

`feature/ui`에는 AI 시안 생성, 업체 양식 AI 변환, ClothSim 의상 생성이 연결돼 있습니다. 홈 화면에는 ClothSim을 추가하지 않습니다.

## AI 시안과 업체 양식 변환

프로젝트 루트에서 실행합니다.

```sh
npm ci
npm run dev:ai
```

`http://127.0.0.1:3000/design`에서 AI 시안을 만듭니다. 업체를 선택한 세션에서는 `http://127.0.0.1:3000/quotes/prepare`의 기존 AI 양식 변환도 테스트할 수 있습니다. 현재 주문서·업체 비교의 기본 흐름은 시연 주문을 만들며, 위 주소가 별도 변환 화면입니다. `dev:ai`는 `.env.local`의 `OPENAI_ENABLED=true`를 설정하고 서버를 시작합니다. 기존 API 키와 사용 한도는 유지합니다. 스위치만 켜려면 `npm run ai:enable` 후 실행 중인 서버를 재시작합니다.

새 작업 폴더에는 `.env.example`에서 `.env.local`을 생성합니다. `npm run check:ai`에 연결 설정 누락이 표시되면 서버용 `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 각 팀원의 로컬 환경에 설정해야 합니다. 실제 계정 권한과 DB 스키마 연결은 별도 확인이 필요합니다. 키를 Git에 커밋하거나 `NEXT_PUBLIC_` 변수에 넣지 않습니다.

AI를 실제로 요청하면 설정된 API의 사용량이 발생합니다. 기존 DB의 일일·세션 한도는 유지하며, 활성화 명령 자체는 외부 요청·DB 쓰기·AI 생성을 하지 않습니다. 호출을 끄려면 `.env.local`에서 `OPENAI_ENABLED=false`로 설정하고 서버를 재시작합니다. `test:backend`와 `test:security`는 AI가 꺼진 환경을 전제로 하는 별도 검사입니다.

## ClothSim 의상 생성

디자인 화면의 ‘의상 시뮬레이션’ 탭에서 설명을 입력하고 생성합니다. 별도 활성화 스위치는 없습니다. 현재 기본 연결은 이 기기의 Ollama `http://localhost:11434`, 모델은 `qwen3-vl:8b-instruct`입니다. 해당 Ollama 서버와 모델을 준비해야 합니다. Chrome 또는 Edge의 WebGPU 지원이 필요합니다. 생성 결과는 인쇄 도안·주문 자료와 별도입니다.

## GitHub Pages에서 테스트할 때

현재 Pages 빌드는 서버 API를 제외하는 정적 배포입니다. AI 시안과 업체 변환은 로컬 Next.js 서버에서 테스트해야 합니다. Pages의 비활성화 표시를 제거하는 것만으로 서버 AI가 작동하지는 않습니다. 공용 테스트에는 서버 실행이 가능한 배포 환경과 해당 환경의 비밀 키 설정이 필요합니다. 서버 주소·배포 구성이 확정되면 별도 연결합니다.
