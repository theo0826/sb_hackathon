import { COLORS, garmentName, isDesign, placementLabel, type Design } from "./design";
import { getSupplier, type Supplier } from "./suppliers";
import type { ProductionPacket } from "./production-mapping";

export const SIZES = ["S", "M", "L", "XL"] as const;
export type OrderDraft = {
  group: string;
  contactEmail: string;
  sizes: Record<(typeof SIZES)[number], number>;
  desiredDeliveryDate: string;
  method: string;
  printWidthCm: number;
  printHeightCm: number;
  memo: string;
};
export const DEFAULT_ORDER: OrderDraft = { group: "", contactEmail: "", sizes: { S: 5, M: 12, L: 8, XL: 0 }, desiredDeliveryDate: "", method: "DTF", printWidthCm: 18, printHeightCm: 18, memo: "" };
export type QuoteDocument = { title: string; templateVersion: string; generatedAt: string; summary: string; productionNotes: string[]; checks: string[]; emailSubject: string; emailBody: string; verifiedRows: string[][]; production?: ProductionPacket };
export function isQuoteDocument(value: unknown): value is QuoteDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Record<string, unknown>;
  return ["title", "templateVersion", "generatedAt", "summary", "emailSubject", "emailBody"].every(key => typeof document[key] === "string")
    && Number.isFinite(Date.parse(document.generatedAt as string))
    && [document.productionNotes, document.checks].every(items => Array.isArray(items) && items.every(item => typeof item === "string"))
    && Array.isArray(document.verifiedRows) && document.verifiedRows.every(row => Array.isArray(row) && row.every(item => typeof item === "string"));
}
export type QuoteRecord = { id: string; sourceOrderId?: string; mode: "mock" | "live"; status: "prepared"; createdAt: string; supplierId: string; design: Design; filename: string; order: OrderDraft; quantity: number; format: "pdf" | "email"; document?: QuoteDocument; trashedAt?: string | null };

export function todayKST(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function totalQuantity(order: OrderDraft) { return SIZES.reduce((total, size) => total + order.sizes[size], 0); }

export function isOrderDraft(value: unknown): value is OrderDraft {
  if (!value || typeof value !== "object") return false;
  const order = value as Record<string, unknown>;
  const sizes = order.sizes as Record<string, unknown> | undefined;
  return typeof order.group === "string" && order.group.length <= 50
    && typeof order.contactEmail === "string" && order.contactEmail.length <= 254
    && typeof order.desiredDeliveryDate === "string" && order.desiredDeliveryDate.length <= 10
    && typeof order.method === "string" && order.method.length <= 30
    && typeof order.memo === "string" && order.memo.length <= 500
    && typeof order.printWidthCm === "number" && Number.isFinite(order.printWidthCm)
    && typeof order.printHeightCm === "number" && Number.isFinite(order.printHeightCm)
    && !!sizes && SIZES.every((size) => typeof sizes[size] === "number" && Number.isInteger(sizes[size]) && (sizes[size] as number) >= 0 && (sizes[size] as number) <= 999);
}

export function validateOrder(order: OrderDraft, supplier: Supplier) {
  const errors: Record<string, string> = {};
  if (!order.group.trim()) errors.group = "단체 이름을 입력해주세요.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.contactEmail)) errors.contactEmail = "연락받을 이메일을 정확하게 입력해주세요.";
  if (totalQuantity(order) < supplier.minOrder) errors.sizes = `${supplier.name}의 최소 주문 수량은 ${supplier.minOrder}벌이에요.`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(order.desiredDeliveryDate) || !Number.isFinite(Date.parse(order.desiredDeliveryDate)) || new Date(order.desiredDeliveryDate).toISOString().slice(0, 10) !== order.desiredDeliveryDate || order.desiredDeliveryDate < todayKST()) errors.desiredDeliveryDate = "오늘 이후의 유효한 희망 수령일을 선택해주세요.";
  if (!supplier.methods.includes(order.method)) errors.method = "이 업체가 지원하는 제작 방식을 선택해주세요.";
  if (order.printWidthCm <= 0 || order.printWidthCm > supplier.maxPrintWidthCm) errors.printWidthCm = `가로는 0cm 초과, ${supplier.maxPrintWidthCm}cm 이하로 입력해주세요.`;
  if (order.printHeightCm <= 0 || order.printHeightCm > supplier.maxPrintHeightCm) errors.printHeightCm = `세로는 0cm 초과, ${supplier.maxPrintHeightCm}cm 이하로 입력해주세요.`;
  return errors;
}

export function isQuoteRecord(value: unknown): value is QuoteRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as QuoteRecord;
  const supplier = getSupplier(record.supplierId);
  return !!supplier && typeof record.id === "string" && /^quote_[a-z0-9-]{36}$/i.test(record.id)
    && ["mock", "live"].includes(record.mode) && record.status === "prepared" && record.format === supplier.format
    && typeof record.createdAt === "string" && Number.isFinite(Date.parse(record.createdAt))
    && typeof record.filename === "string" && isDesign(record.design) && isOrderDraft(record.order)
    && record.quantity === totalQuantity(record.order);
}

export function orderRows(supplier: Supplier, design: Design, order: OrderDraft) {
  return [
    ["받는 업체", supplier.name], ["단체 이름", order.group.trim() || "미입력"], ["연락 이메일", order.contactEmail || "미입력"],
    ["의류 / 원단 색상", `${garmentName(design)} / ${COLORS.find((color) => color.hex === design.color)?.name || design.color}`],
    ["인쇄 면 / 제작 방식", `${design.placements ? [...new Set(design.placements.map(p=>p.side==="front"?"앞면":"뒷면"))].join(" + ") : design.side === "front" ? "앞면" : "뒷면"} / ${order.method}`],
    ["인쇄 크기", design.placements ? design.placements.map(p=>`${placementLabel(p)} ${p.widthCm} × ${p.heightCm} cm`).join(" / ") : `${order.printWidthCm} × ${order.printHeightCm} cm`],
    ["배치 참고", design.placements ? design.placements.map(p=>`${p.id}: X ${p.x}, Y ${p.y}, 회전 ${p.rotation}°`).join(" / ") : `미리보기 기준 / 크기 ${design.scale}% / 회전 ${design.rotation}°`],
    ["인쇄 색상", design.image ? "첨부 이미지 색상" : design.ink.toUpperCase()],
    ["사이즈별 수량", SIZES.map((size) => `${size} ${order.sizes[size]}벌`).join(" · ")],
    ["총 주문 수량", `${totalQuantity(order)}벌`], ["희망 수령일", order.desiredDeliveryDate || "미입력"],
  ];
}
export function validateDesignForSupplier(design: Design, supplier: Supplier) {
  if (design.placements?.some(p=>p.widthCm>supplier.maxPrintWidthCm || p.heightCm>supplier.maxPrintHeightCm)) return `이 업체의 인쇄 한도는 배치별 ${supplier.maxPrintWidthCm} × ${supplier.maxPrintHeightCm}cm예요. 디자인에서 배치 크기를 줄여주세요.`;
  return null;
}

export function emailTemplate(supplier: Supplier, design: Design, order: OrderDraft, filename: string) {
  const subject = `[단체복 제작 문의] ${order.group.trim() || "단체 이름"} / ${totalQuantity(order)}벌`;
  const body = `안녕하세요, ${supplier.name} 담당자님.\n${order.group.trim() || "단체 이름"}의 단체티 제작 견적을 문의드립니다.\n\n${orderRows(supplier, design, order).slice(2).map(([label, value]) => `${label}: ${value}`).join("\n")}\n도안: ${design.image ? filename || "첨부 이미지" : design.text || "OUR CLUB"}\n\n추가 요청 사항:\n${order.memo.trim() || "없음"}\n\n첨부 예정 파일:\n- seongbuk-fit-artwork.${design.image ? "png" : "svg"}\n- seongbuk-fit-3d-preview.png\n\n인쇄 규격, 원단, 제작 일정과 최종 견적 확인 부탁드립니다.\n\n[성북핏 체험용 양식 · 실제 업체에 발송되지 않음]`;
  return { subject, body };
}
