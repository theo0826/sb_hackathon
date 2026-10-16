# 업체 도안 목업 3종

각 폴더의 `customer-uv.svg`는 고객 확인용 UV, `sewing-pattern.svg`는 업체 봉제·인쇄 패턴, `factory-format.json`은 해당 업체의 좌표·패널 명세, `submission-email.txt`는 제출 문구입니다.

- `jangwi`: 좌상단 mm 도안서.
- `wolgok`: 목 중심 cm 배치표.
- `jongam`: 패널 중심 mm JSON 제작 패키지.

봉제 SVG는 1 SVG 좌표 = 1mm로 목업 치수를 표시합니다. 사이트와 A4 PDF에서는 축소됩니다. 모두 M 가상 패턴이며 실제 재단 승인 자료가 아닙니다. 실측·곡선 시접·원단 수축률·사이즈 그레이딩은 실제 업체 자료로 교체합니다.

라이브 체험은 로컬 사이트 `/patterns`, 상세 프로세스는 [UV·패턴 변환 문서](../UV-PATTERN-CONVERSION.md)에서 확인할 수 있습니다. 예시는 코드로 합성했으며 유료 AI를 호출하지 않았습니다.
