export type Supplier = {
  id: string;
  name: string;
  region: string;
  description: string;
  minOrder: number;
  methods: string[];
  leadDays: string;
  format: "pdf" | "email";
  documentTitle: string;
  maxPrintWidthCm: number;
  maxPrintHeightCm: number;
  attachmentTypes: string[];
  requirements: string[];
  accent: string;
};

// 제휴 전 화면·양식 검증용 데이터입니다. 실제 업체나 연락처가 아닙니다.
export const SUPPLIERS: Supplier[] = [
  { id: "jangwi", name: "장위 스튜디오", region: "장위동", description: "소규모 모임부터 이웃 행사까지, 선명한 단체티 인쇄", minOrder: 10, methods: ["DTF", "실크스크린"], leadDays: "7–10일", format: "pdf", documentTitle: "장위 스튜디오 · 단체복 제작 도안서", maxPrintWidthCm: 28, maxPrintHeightCm: 35, attachmentTypes: ["PDF 도안서", "SVG 또는 PNG 도안"], requirements: ["인쇄 면과 가로·세로 크기를 도안서에 기재", "의류 색상과 사이즈별 수량 필수", "도안 원본을 별도 파일로 첨부"], accent: "#3182f6" },
  { id: "wolgok", name: "월곡 크래프트", region: "월곡동", description: "작은 로고와 가슴 포인트, 정갈한 자수와 인쇄", minOrder: 20, methods: ["DTF", "자수"], leadDays: "10–14일", format: "email", documentTitle: "월곡 크래프트 · 이메일 제작 문의", maxPrintWidthCm: 12, maxPrintHeightCm: 12, attachmentTypes: ["이메일 제목·본문", "SVG 또는 PNG 도안"], requirements: ["제목에 단체 이름과 총 수량 기재", "본문에 연락 이메일·수령일·인쇄 크기 기재", "도안 원본을 이메일에 첨부"], accent: "#16a078" },
  { id: "jongam", name: "종암 메이커스", region: "종암동", description: "주민 행사와 대규모 모임에 어울리는 단체 제작", minOrder: 30, methods: ["실크스크린", "자수"], leadDays: "7–14일", format: "pdf", documentTitle: "종암 메이커스 · 단체 주문 제작 사양서", maxPrintWidthCm: 30, maxPrintHeightCm: 35, attachmentTypes: ["PDF 제작 사양서", "SVG 또는 PNG 도안"], requirements: ["단체 이름·수량·수령일을 첫 페이지에 기재", "선택한 제작 방식과 인쇄 색상 명시", "도안 원본과 사이즈별 수량표 필수"], accent: "#9471dc" },
];

export function getSupplier(id: string | null | undefined) {
  return SUPPLIERS.find((supplier) => supplier.id === id);
}
