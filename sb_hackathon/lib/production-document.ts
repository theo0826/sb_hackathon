import type { Design } from "./design";
import { orderRows, totalQuantity, type OrderDraft, type QuoteDocument } from "./quote";
import type { Supplier } from "./suppliers";
import { buildProductionPacket, conversionRows, freezeUVDesign, patternTemplate, referenceConversion, referenceConversions, type PatternConversion, type UVSnapshot } from "./production-mapping";

export type ConversionResult = { summary: string; productionNotes: string[]; checks: string[]; conversion: PatternConversion; conversions?: (PatternConversion & {placementId:string})[] };
export function compileProductionDocument(supplier: Supplier, design: Design, order: OrderDraft, snapshot: UVSnapshot, result: ConversionResult, converter: "ai" | "sample"): QuoteDocument {
  if (typeof result.summary !== "string" || result.summary.length > 500 || ![result.productionNotes, result.checks].every(items => Array.isArray(items) && items.length <= 8 && items.every(item => typeof item === "string" && item.length <= 300))) throw new Error("제작 설명 규격이 올바르지 않아요.");
  const packet = buildProductionPacket(snapshot, patternTemplate(supplier.id), snapshot.placements ? result.conversions : result.conversion, converter);
  const verifiedRows = orderRows(supplier, design, order);
  const checks = [...result.checks, ...packet.verification.issues, "업체가 제공하지 않은 M 봉제 패턴 목업이에요. 실측·소재 수축률·그레이딩 검수 후 재단해야 해요."];
  return { title: supplier.documentTitle, templateVersion: packet.template.version, generatedAt: new Date().toISOString(), summary: result.summary, productionNotes: result.productionNotes, checks, verifiedRows, production: packet,
    emailSubject: `[단체복 제작 견적 요청] ${order.group} / ${totalQuantity(order)}벌`,
    emailBody: `안녕하세요, ${supplier.name} 담당자님.\n고객 확인용 UV를 업체 도안 목업으로 변환한 제작 문의입니다.\n\n${verifiedRows.map(([label,value])=>`${label}: ${value}`).join("\n")}\n\n업체 패턴 변환:\n${conversionRows(packet).map(([label,value])=>`${label}: ${value}`).join("\n")}\n\n추가 요청: ${order.memo || "없음"}\n\n${converter === "ai" ? "AI" : "목업 예시"} 제작 설명:\n${result.summary}\n${result.productionNotes.map(note=>`- ${note}`).join("\n")}\n\n확인 사항:\n${checks.map(note=>`- ${note}`).join("\n")}\n\n첨부 예정: ${packet.template.files.join(", ")}\n[가상 업체 양식 · 재단 승인 전 · 실제 발송 전]` };
}
export function sampleProductionDocument(supplier: Supplier, design: Design, order: OrderDraft, revision = "sample-source-v1") {
  const source = freezeUVDesign(design, order, revision), template = patternTemplate(supplier.id);
  return compileProductionDocument(supplier, design, order, source, { summary: `${design.text || "첨부 도안"}의 고객 UV 배치를 ${template.name}에 맞게 옮긴 목업 변환 예시입니다.`, productionNotes: ["앞뒤 모든 배치에 동일한 도안 원본을 사용합니다.", `${template.unit} 단위와 ${template.origin} 기준으로 좌표를 변환합니다.`, "봉제·시접 참고선은 도안 이미지와 별도 레이어로 제공합니다."], checks: ["고객 UV와 업체 패턴을 나란히 확인하고 위치·크기·방향을 검토하세요."], conversion: referenceConversion(source, template), conversions:referenceConversions(source,template) }, "sample");
}
