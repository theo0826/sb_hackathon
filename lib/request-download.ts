"use client";
import type { QuoteRecord } from "./quote";
import { getSupplier } from "./suppliers";
import { exportProductionPDF, downloadURL } from "./production-export";
import { textArtworkSVG } from "./print-artwork";
import { estimate, won } from "./order-workflow";

export async function downloadRequestPDF(record: Pick<QuoteRecord, "supplierId" | "design" | "order" | "document" | "clothCapture">) {
  const supplier = getSupplier(record.supplierId);
  if (!supplier) throw new Error("업체 정보를 찾지 못했어요.");
  const price = estimate(supplier, record.order);
  const document = { title:"제작 요청서", templateVersion:"request-download-v1", generatedAt:new Date().toISOString(), productionNotes:[], checks:[], emailSubject:"", emailBody:"", verifiedRows:[], ...record.document,
    summary:`${record.document?.summary || "제작 요청서 · 시연용 · 실제 업체 발송·결제 없음"}\n견적 금액: ${won(price.total)} / 1벌 ${won(price.unit)}` };
  await exportProductionPDF({ supplier, design: record.design, order: record.order,
    artworkSVG: textArtworkSVG(record.design.text || record.order.group, record.design.ink),
    previewPNG: record.clothCapture?.front, previewBackPNG: record.clothCapture?.back, document });
}
export function downloadRequestImages(record: Pick<QuoteRecord, "clothCapture">) {
  if (!record.clothCapture) throw new Error("저장된 앞·뒷면 이미지가 없어요.");
  for (const side of ["front", "back"] as const) {
    const src = record.clothCapture[side];
    const extension = src.match(/^data:image\/(\w+)/)?.[1] || "png";
    downloadURL(`한땀-${side}.${extension === "jpeg" ? "jpg" : extension}`, src);
  }
}
