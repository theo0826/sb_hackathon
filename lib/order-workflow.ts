import { isDesign, type Design } from "./design";
import { isOrderDraft, SIZES, todayKST, totalQuantity, type OrderDraft } from "./quote";
import { getSupplier, type Supplier } from "./suppliers";

export type Participant = { id: string; name: string; size: string; initials: string };
export type OrderDetails = { roster: Participant[]; useRoster: boolean; requireInitials: boolean; phone: string; delivery: "shipping" | "pickup"; address: string; payment: "group" | "individual"; confirmed: boolean };
export const EMPTY_DETAILS: OrderDetails = { roster: [], useRoster: false, requireInitials: false, phone: "", delivery: "shipping", address: "", payment: "group", confirmed: false };
export type DemoOrder = { id: string; createdAt: string; supplierId: string; design: Design; order: OrderDraft; details: OrderDetails; filename: string; received: boolean; quoteTrashedAt?: string | null };

export function isOrderDetails(value: unknown): value is OrderDetails {
  if (!value || typeof value !== "object") return false;
  const d = value as OrderDetails;
  return Array.isArray(d.roster) && d.roster.length <= 500 && d.roster.every(r => r && typeof r.id === "string" && typeof r.name === "string" && typeof r.size === "string" && typeof r.initials === "string") && typeof d.useRoster === "boolean" && typeof d.requireInitials === "boolean" && typeof d.confirmed === "boolean" && typeof d.phone === "string" && typeof d.address === "string" && ["shipping", "pickup"].includes(d.delivery) && ["group", "individual"].includes(d.payment);
}
export function isDemoOrder(value: unknown): value is DemoOrder {
  if (!value || typeof value !== "object") return false;
  const d = value as DemoOrder;
  return typeof d.id === "string" && /^demo_[a-f0-9-]{36}$/.test(d.id) && typeof d.createdAt === "string" && Number.isFinite(Date.parse(d.createdAt)) && !!getSupplier(d.supplierId) && isDesign(d.design) && isOrderDraft(d.order) && isOrderDetails(d.details) && typeof d.filename === "string" && typeof d.received === "boolean";
}
export function rosterIssues(row: Participant, initials: boolean) {
  return [!row.name.trim() && "이름 누락", !(SIZES as readonly string[]).includes(row.size) && "사이즈 확인", initials && !row.initials.trim() && "이니셜 누락"].filter(Boolean) as string[];
}
export function rosterSizes(rows: Participant[]): OrderDraft["sizes"] {
  const sizes = { S: 0, M: 0, L: 0, XL: 0 };
  for (const row of rows) if ((SIZES as readonly string[]).includes(row.size)) sizes[row.size as keyof typeof sizes]++;
  return sizes;
}
export function reviewIssues(order: OrderDraft, details: OrderDetails): string[] {
  const issues: string[] = [];
  if (!order.group.trim()) issues.push("단체 이름을 입력해주세요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.contactEmail)) issues.push("연락 이메일을 확인해주세요.");
  if (totalQuantity(order) < 1) issues.push("주문 수량을 1벌 이상 입력해주세요.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(order.desiredDeliveryDate) || !Number.isFinite(Date.parse(order.desiredDeliveryDate)) || new Date(order.desiredDeliveryDate).toISOString().slice(0, 10) !== order.desiredDeliveryDate || order.desiredDeliveryDate < todayKST()) issues.push("희망 수령일을 오늘 이후로 선택해주세요.");
  if (details.delivery === "shipping" && !details.address.trim()) issues.push("배송받을 주소를 입력해주세요.");
  if (details.useRoster && (!details.roster.length || details.roster.some(row => rosterIssues(row, details.requireInitials).length))) issues.push("명단의 빈 항목과 사이즈를 확인해주세요.");
  if (!details.confirmed) issues.push("주문서와 도안 확인에 체크해주세요.");
  return issues;
}

// Explicit demo calculation. These are not quotations received from suppliers.
export function estimate(supplier: Supplier, order: OrderDraft) {
  const index = { jangwi: 0, wolgok: 1, jongam: 2 }[supplier.id] ?? 0;
  const quantity = totalQuantity(order);
  const unit = [24500, 27800, 22900][index] + (order.method === "자수" ? 3500 : 0) - (quantity >= 50 ? 1500 : 0);
  const days = Math.max(...(supplier.leadDays.match(/\d+/g) || ["14"]).map(Number));
  return { unit, total: unit * quantity, days, shipping: 0 };
}
export const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

// CSV supports quoted fields, escaped quotes, BOM, and CRLF exported by Excel.
export function parseRosterCSV(source: string): Participant[] {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  const text = source.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; if (char === "\r" && text[i + 1] === "\n") i++; }
    else cell += char;
  }
  if (quoted) throw new Error("CSV의 따옴표가 닫히지 않았어요. 파일을 확인해주세요.");
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  const header = rows.shift()?.map(c => c.toLowerCase());
  if (!header) throw new Error("명단이 비어 있어요.");
  const name = header.findIndex(c => ["이름", "성명", "name"].includes(c));
  const size = header.findIndex(c => ["사이즈", "size"].includes(c));
  const initials = header.findIndex(c => ["이니셜", "initials"].includes(c));
  if (name < 0 || size < 0) throw new Error("첫 행에 ‘이름’과 ‘사이즈’ 열이 필요해요. 명단 양식을 이용해주세요.");
  if (!rows.length || rows.length > 500) throw new Error("명단은 1명부터 500명까지 등록할 수 있어요.");
  return rows.map((r, i) => ({ id: `csv-${i}`, name: (r[name] || "").slice(0, 50), size: (r[size] || "").toUpperCase(), initials: (r[initials] || "").slice(0, 30) }));
}
