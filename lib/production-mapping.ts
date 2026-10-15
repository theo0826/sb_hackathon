import { bodyPanelSize, type Design, type Garment, type Side } from "./design";
import type { OrderDraft } from "./quote";

export type PatternUnit = "mm" | "cm";
export type PatternOrigin = "panel-top-left" | "neck-center" | "panel-center";
export type MockPatternTemplate = {
  id: string; supplierId: string; name: string; version: string; unit: PatternUnit; origin: PatternOrigin;
  yDirection: "down" | "up"; seamAllowanceMm: number; hemAllowanceMm: number;
  panelCodes: Record<Side, string>; files: string[]; fields: string[]; description: string;
};
export const PATTERN_TEMPLATES: MockPatternTemplate[] = [
  { id: "jangwi-cut-print", supplierId: "jangwi", name: "봉제·인쇄 도안서", version: "mock-v1", unit: "mm", origin: "panel-top-left", yDirection: "down", seamAllowanceMm: 10, hemAllowanceMm: 20, panelCodes: { front: "JW-F01", back: "JW-B01" }, files: ["패널별 봉제·인쇄 SVG", "A4 제작 도안서 PDF", "변환 명세 JSON"], fields: ["패널 코드", "좌상단 기준 mm 좌표", "봉제선·시접", "인쇄 크기·회전", "사이즈별 수량"], description: "앞·뒤판과 부속 패널에 봉제선, 시접 참고선, 도안을 표시하는 mm 양식" },
  { id: "wolgok-neck-placement", supplierId: "wolgok", name: "목 중심 배치표", version: "mock-v1", unit: "cm", origin: "neck-center", yDirection: "down", seamAllowanceMm: 8, hemAllowanceMm: 18, panelCodes: { front: "WC-CHEST", back: "WC-BACK" }, files: ["목 중심 배치표 SVG", "이메일 제출 본문", "봉제 패널 명세 JSON"], fields: ["목 중심 기준 가로·세로 cm", "도안 크기", "자수·인쇄 방식", "봉제 패널", "첨부 파일 목록"], description: "목 중심에서 도안까지의 거리를 cm로 표시하는 가슴·등판 배치 양식" },
  { id: "jongam-panel-package", supplierId: "jongam", name: "패널별 제작 패키지", version: "mock-v1", unit: "mm", origin: "panel-center", yDirection: "up", seamAllowanceMm: 12, hemAllowanceMm: 25, panelCodes: { front: "JM-BODY-F", back: "JM-BODY-B" }, files: ["패널 코드별 SVG", "중심 기준 좌표 JSON", "봉제·제작 사양 PDF"], fields: ["패널·원단 코드", "패널 중심 기준 mm 좌표", "위쪽이 양수인 Y축", "도안 방향", "시접·재단 수량"], description: "패널 중심 좌표와 원단·봉제 정보를 JSON과 패널 도면으로 묶는 양식" },
];
export function patternTemplate(supplierId: string) {
  const template = PATTERN_TEMPLATES.find(item => item.supplierId === supplierId);
  if (!template) throw new Error("업체 도안 양식을 찾지 못했어요.");
  return template;
}
export type MockPanel = { id: string; label: string; widthMm: number; heightMm: number; count: number; shape: "body" | "sleeve" | "strip" | "hood" | "pocket" };
export type UVSnapshot = {
  version: "uv-preview-v1"; revision: string; garment: Garment; baseSize: "M"; color: string;
  originalDesign: Design; panels: MockPanel[];
  artwork: { source: string | null; text: string; style: Design["style"]; ink: string };
  placement: { panel: Side; u: number; v: number; widthMm: number; heightMm: number; rotationDeg: number };
  placements?: (UVSnapshot["placement"] & { id: string; content?:"artwork"|"text";text?:string;ink?:string })[];
  dimensionsBasis: "mock-M-not-graded";
};
export type PatternConversion = {
  templateId: string; sourceRevision: string; panelCode: string; unit: PatternUnit; origin: PatternOrigin;
  x: number; y: number; width: number; height: number; rotation: number; mirror: boolean;
  seamAllowanceMm: number; instructions: string[];
};
export type ProductionPacket = {
  version: "production-mock-v1"; converter: "ai" | "sample"; template: MockPatternTemplate;
  source: UVSnapshot; conversion: PatternConversion;
  conversions?: (PatternConversion & { placementId: string })[];
  verification: { status: "matched" | "needs_review"; maxDeviationMm: number; artworkUnchanged: true; issues: string[] };
  sewing: { baseSize: "M"; graded: false; approvedForCutting: false; panels: MockPanel[]; seamAllowanceMm: number; hemAllowanceMm: number };
};
const round = (value: number) => Math.round(value * 1e6) / 1e6;
export function mockPanels(garment: Garment): MockPanel[] {
  const { widthMm: width, heightMm: height } = bodyPanelSize(garment);
  return [
    { id: "front", label: garment === "varsity" ? "앞판 · 중심 여밈 확인" : "앞판", widthMm: width, heightMm: height, count: 1, shape: "body" },
    { id: "back", label: "뒤판", widthMm: width, heightMm: height, count: 1, shape: "body" },
    { id: "sleeve", label: "소매 · 좌우 한 쌍", widthMm: garment === "tee" ? 360 : 420, heightMm: garment === "tee" ? 270 : 620, count: 2, shape: "sleeve" },
    ...(garment === "hoodie" ? [
      { id: "hood", label: "후드 · 좌우 한 쌍", widthMm: 320, heightMm: 400, count: 2, shape: "hood" as const },
      { id: "pocket", label: "앞주머니", widthMm: 320, heightMm: 200, count: 1, shape: "pocket" as const },
    ] : [{ id: "collar", label: garment === "varsity" ? "목·밑단 리브 참고" : "목 리브", widthMm: 380, heightMm: 45, count: 1, shape: "strip" as const }]),
  ];
}
export function freezeUVDesign(design: Design, order: Pick<OrderDraft,"printWidthCm"|"printHeightCm">, revision = "local-preview"): UVSnapshot {
  const placements = design.placements?.map(p=>({ id:p.id, panel:p.side, u:round(.5+(p.x-260)/195.2), v:round((.81+(p.y-248)/175)/2.07), widthMm:round(p.widthCm*10), heightMm:round(p.heightCm*10), rotationDeg:p.rotation,content:p.content,text:p.text,ink:p.ink }));
  return {
    version: "uv-preview-v1", revision, garment: design.garment || "tee", baseSize: "M", color: design.color,
    originalDesign: structuredClone(design), panels: mockPanels(design.garment || "tee"),
    artwork: { source: design.image, text: design.text, style: design.style, ink: design.ink },
    placement: placements?.[0] || { panel: design.side, u: round(.5 + (design.x - 260) / 195.2), v: round((.81 + (design.y - 248) / 175) / 2.07), widthMm: round(order.printWidthCm * 10), heightMm: round(order.printHeightCm * 10), rotationDeg: design.rotation },
    ...(placements ? { placements } : {}),
    dimensionsBasis: "mock-M-not-graded",
  };
}
export function snapshotPlacements(snapshot: UVSnapshot) { return snapshot.placements || [{ ...snapshot.placement, id:"primary" }]; }
export function placementSnapshot(snapshot: UVSnapshot, placement: UVSnapshot["placement"]): UVSnapshot { return { ...snapshot, placement, placements:undefined }; }
export function referenceConversions(snapshot: UVSnapshot, template: MockPatternTemplate) {
  return snapshotPlacements(snapshot).map(p=>({ ...referenceConversion(placementSnapshot(snapshot,p),template), placementId:p.id }));
}
export function panelFor(snapshot: UVSnapshot) { return snapshot.panels.find(panel => panel.id === snapshot.placement.panel)!; }
export function physicalPlacement(snapshot: UVSnapshot) {
  const panel = panelFor(snapshot), p = snapshot.placement;
  return { x: p.u * panel.widthMm, y: p.v * panel.heightMm, width: p.widthMm, height: p.heightMm, rotation: p.rotationDeg };
}
function datum(snapshot: UVSnapshot, template: MockPatternTemplate) {
  const panel = panelFor(snapshot);
  return template.origin === "panel-top-left" ? { x: 0, y: 0 } : template.origin === "neck-center" ? { x: panel.widthMm / 2, y: panel.heightMm * .10 } : { x: panel.widthMm / 2, y: panel.heightMm / 2 };
}
export function referenceConversion(snapshot: UVSnapshot, template: MockPatternTemplate): PatternConversion {
  const p = physicalPlacement(snapshot), origin = datum(snapshot, template), divisor = template.unit === "cm" ? 10 : 1, sign = template.yDirection === "up" ? -1 : 1;
  return { templateId: template.id, sourceRevision: snapshot.revision, panelCode: template.panelCodes[snapshot.placement.panel], unit: template.unit, origin: template.origin,
    x: round((p.x - origin.x) / divisor), y: round((p.y - origin.y) * sign / divisor), width: round(p.width / divisor), height: round(p.height / divisor), rotation: p.rotation * sign, mirror: false,
    seamAllowanceMm: template.seamAllowanceMm, instructions: ["고객 UV의 도안 원본과 방향을 유지", "도안 중심 좌표로 배치; 봉제선과 시접 참고선을 분리", "M 목업 기준이며 업체 실측·사이즈 그레이딩 후 재검수"] };
}
export function inverseConversion(snapshot: UVSnapshot, template: MockPatternTemplate, conversion: PatternConversion) {
  const origin = datum(snapshot, template), multiplier = template.unit === "cm" ? 10 : 1, sign = template.yDirection === "up" ? -1 : 1;
  return { x: conversion.x * multiplier + origin.x, y: conversion.y * multiplier * sign + origin.y, width: conversion.width * multiplier, height: conversion.height * multiplier, rotation: conversion.rotation * sign };
}
function buildSingleProductionPacket(snapshot: UVSnapshot, template: MockPatternTemplate, input: unknown, converter: "ai" | "sample"): ProductionPacket {
  if (!input || typeof input !== "object") throw new Error("업체 패턴 변환 결과가 필요해요.");
  const c = input as PatternConversion;
  const ref = referenceConversion(snapshot, template);
  if (c.templateId !== ref.templateId || c.sourceRevision !== ref.sourceRevision || c.panelCode !== ref.panelCode || c.unit !== ref.unit || c.origin !== ref.origin || c.mirror !== false || c.seamAllowanceMm !== ref.seamAllowanceMm || ![c.x, c.y, c.width, c.height, c.rotation].every(Number.isFinite) || !Array.isArray(c.instructions) || !c.instructions.length || c.instructions.length > 8 || c.instructions.some(note => typeof note !== "string" || note.length > 300)) throw new Error("업체 양식 또는 고객 도안의 기준이 바뀌었어요. 다시 변환해주세요.");
  const p = inverseConversion(snapshot, template, c), original = physicalPlacement(snapshot);
  const maxDeviationMm = Math.max(...["x", "y", "width", "height"].map(key => Math.abs(p[key as keyof typeof p] - original[key as keyof typeof original])));
  if (maxDeviationMm > .05 || Math.abs(p.rotation - original.rotation) > .01) throw new Error("변환 결과가 고객 UV의 위치·크기·회전과 일치하지 않아요.");
  const panel = panelFor(snapshot), radians = p.rotation * Math.PI / 180;
  const halfWidth = (Math.abs(Math.cos(radians)) * p.width + Math.abs(Math.sin(radians)) * p.height) / 2;
  const halfHeight = (Math.abs(Math.sin(radians)) * p.width + Math.abs(Math.cos(radians)) * p.height) / 2;
  const issues: string[] = [];
  if (p.x - halfWidth < template.seamAllowanceMm || p.x + halfWidth > panel.widthMm - template.seamAllowanceMm || p.y - halfHeight < panel.heightMm * .18 || p.y + halfHeight > panel.heightMm - template.hemAllowanceMm) issues.push("도안이 목·소매·밑단의 봉제 영역에 닿을 수 있어 배치 검토가 필요해요.");
  if (snapshot.garment === "varsity" && Math.abs(p.x - panel.widthMm / 2) < halfWidth && snapshot.placement.panel === "front") issues.push("과잠 앞판 도안이 중심 여밈을 지나므로 업체의 좌우 분할 배치 검토가 필요해요.");
  return { version: "production-mock-v1", converter, template: { ...template }, source: snapshot, conversion: { ...c }, verification: { status: issues.length ? "needs_review" : "matched", maxDeviationMm: round(maxDeviationMm), artworkUnchanged: true, issues }, sewing: { baseSize: "M", graded: false, approvedForCutting: false, panels: snapshot.panels.map(panel => ({ ...panel })), seamAllowanceMm: template.seamAllowanceMm, hemAllowanceMm: template.hemAllowanceMm } };
}
export function buildProductionPacket(snapshot: UVSnapshot, template: MockPatternTemplate, input: unknown, converter: "ai"|"sample"): ProductionPacket {
  if (!snapshot.placements) return buildSingleProductionPacket(snapshot,template,Array.isArray(input)?input[0]:input,converter);
  if (!Array.isArray(input) || input.length!==snapshot.placements.length || new Set(input.map(c=>c?.placementId)).size!==input.length) throw new Error("앞뒤 배치가 누락되거나 중복됐어요. 다시 변환해주세요.");
  const packets = snapshot.placements.map(p=>{
    const conversion = input.find(c=>c?.placementId===p.id);
    if(!conversion)throw new Error("도안 배치 식별자가 일치하지 않아요.");
    return buildSingleProductionPacket(placementSnapshot(snapshot,p),template,conversion,converter);
  });
  const issues = packets.flatMap((packet,i)=>packet.verification.issues.map(issue=>`${snapshot.placements![i].id}: ${issue}`));
  return { ...packets[0], source:snapshot, conversions:packets.map((packet,i)=>({...packet.conversion,placementId:snapshot.placements![i].id})),
    verification:{status:issues.length?"needs_review":"matched",maxDeviationMm:Math.max(...packets.map(packet=>packet.verification.maxDeviationMm)),artworkUnchanged:true,issues} };
}
export function packetConversions(packet: ProductionPacket) { return packet.conversions || [{...packet.conversion,placementId:"primary"}]; }
export function conversionRows(packet: ProductionPacket): string[][] {
  const c = packet.conversion;
  return [["업체 도안 양식", `${packet.template.name} / ${packet.template.version}`], ["고객 UV 버전", packet.source.revision], ["좌표 기준", `${c.origin} / ${c.unit} / Y ${packet.template.yDirection === "up" ? "위쪽 +" : "아래쪽 +"}`],
    ...packetConversions(packet).map(p=>[`${p.panelCode} · ${p.placementId}`,`중심 X ${p.x.toFixed(2)}, Y ${p.y.toFixed(2)} ${p.unit} / ${p.width} × ${p.height} ${p.unit} / ${p.rotation}° / 반전 없음`]),
    ["시접 / 밑단", `${packet.sewing.seamAllowanceMm} / ${packet.sewing.hemAllowanceMm} mm · 목업`], ["재단 기준", "M 목업 · 사이즈 그레이딩 없음 · 재단 승인 전"], ["UV 역변환 검증", `${packet.verification.maxDeviationMm.toFixed(4)} mm 오차 / 원본 도안 유지`]];
}
export function panelPath(shape: MockPanel["shape"], w: number, h: number) {
  if (shape === "body") return `M ${w*.22} 0 L ${w*.38} ${h*.015} Q ${w*.5} ${h*.16} ${w*.62} ${h*.015} L ${w*.78} 0 L ${w} ${h*.18} Q ${w*.82} ${h*.28} ${w*.94} ${h*.4} L ${w*.94} ${h} L ${w*.06} ${h} L ${w*.06} ${h*.4} Q ${w*.18} ${h*.28} 0 ${h*.18} Z`;
  if (shape === "sleeve") return `M 0 ${h*.23} Q ${w*.5} ${-h*.2} ${w} ${h*.23} L ${w*.83} ${h} L ${w*.17} ${h} Z`;
  if (shape === "hood") return `M 0 ${h*.92} L 0 ${h*.4} Q ${w*.1} 0 ${w*.6} 0 Q ${w} ${h*.1} ${w} ${h*.55} L ${w*.75} ${h} Z`;
  if (shape === "pocket") return `M ${w*.22} 0 L ${w*.78} 0 L ${w} ${h*.5} L ${w*.93} ${h} L ${w*.07} ${h} L 0 ${h*.5} Z`;
  return `M 0 0 H ${w} V ${h} H 0 Z`;
}
