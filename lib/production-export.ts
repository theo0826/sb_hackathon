"use client";

import type { Design } from "./design";
import { orderRows, type OrderDraft } from "./quote";
import type { Supplier } from "./suppliers";

export function downloadText(filename: string, text: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  downloadURL(filename, url);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadURL(filename: string, url: string) {
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
}
async function bitmap(source: string) {
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("도안 이미지를 읽지 못했어요.")); image.src = source; });
  return image;
}

export async function exportProductionPDF({ supplier, design, order, artworkSVG, previewPNG, download = true }: { supplier: Supplier; design: Design; order: OrderDraft; artworkSVG: string | null; previewPNG: string; download?: boolean }) {
  const { jsPDF } = await import("jspdf");
  await document.fonts.ready;
  const artworkSource = design.image || (artworkSVG ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(artworkSVG)}` : null);
  if (!artworkSource) throw new Error("도안이 준비된 뒤 다시 눌러주세요.");
  const [artwork, preview] = await Promise.all([bitmap(artworkSource), bitmap(previewPNG)]);
  const pages: HTMLCanvasElement[] = [];
  const width = 1240, height = 1754, margin = 70;
  // page()가 첫 그리기 전에 동기적으로 캔버스와 컨텍스트를 준비합니다.
  let sheet: HTMLCanvasElement, context!: CanvasRenderingContext2D, y = 0;
  function page() {
    sheet = document.createElement("canvas"); sheet.width = width; sheet.height = height;
    const next = sheet.getContext("2d"); if (!next) throw new Error("PDF를 만들 수 없는 브라우저예요.");
    context = next; pages.push(sheet); context.fillStyle = "#fff"; context.fillRect(0, 0, width, height);
    context.font = '700 22px "Malgun Gothic", Arial, sans-serif'; context.fillStyle = "#3182f6"; context.fillText("성북핏  /  SEONGBUK FIT", margin, 65);
    context.font = '18px "Malgun Gothic", Arial, sans-serif'; context.fillStyle = "#7b8795"; context.fillText(`체험용 제작자료 · 실제 업체 전송 없음 · ${pages.length}페이지`, margin, height - 42);
    y = 115;
  }
  function room(required: number) { if (y + required > height - 90) page(); }
  function lines(text: string, maxWidth: number): string[] {
    const result: string[] = [];
    for (const paragraph of text.split("\n")) {
      let line = "";
      for (const character of Array.from(paragraph)) {
        if (line && context.measureText(line + character).width > maxWidth) { result.push(line); line = ""; }
        line += character;
      }
      result.push(line);
    }
    return result;
  }
  function paragraph(text: string, font = 22, color = "#333d4b") {
    context.font = `${font}px "Malgun Gothic", Arial, sans-serif`;
    for (const line of lines(text, width - margin * 2)) {
      room(font + 12); context.font = `${font}px "Malgun Gothic", Arial, sans-serif`; context.fillStyle = color; context.fillText(line, margin, y); y += font + 12;
    }
  }
  function imageBox(image: HTMLImageElement, x: number, top: number, background: string) {
    const boxWidth = 530, boxHeight = 330;
    context.fillStyle = background; context.fillRect(x, top, boxWidth, boxHeight);
    const scale = Math.min((boxWidth - 40) / image.width, (boxHeight - 35) / image.height);
    context.drawImage(image, x + (boxWidth - image.width * scale) / 2, top + (boxHeight - image.height * scale) / 2, image.width * scale, image.height * scale);
  }
  page();
  paragraph(supplier.documentTitle, 36, "#191f28");
  paragraph(`제출 양식: PDF  /  도안: ${design.image ? "첨부 이미지" : design.text || "OUR CLUB"}`, 20, "#6b7684");
  y += 20;
  context.font = '700 22px "Malgun Gothic", Arial, sans-serif'; context.fillStyle = "#191f28"; context.fillText("도안 파일 (티셔츠 배경 제외)", margin, y); context.fillText("티셔츠 위의 배치", 640, y);
  y += 20; imageBox(artwork, margin, y, design.color); imageBox(preview, 640, y, "#f1f4f8"); y += 365;
  for (const [label, value] of orderRows(supplier, design, order)) {
    context.font = '22px "Malgun Gothic", Arial, sans-serif'; const wrapped = lines(value, 840);
    room(Math.max(48, wrapped.length * 30 + 12));
    context.font = '22px "Malgun Gothic", Arial, sans-serif'; context.fillStyle = "#7b8795"; context.fillText(label, margin, y);
    context.fillStyle = "#191f28"; wrapped.forEach((line, index) => context.fillText(line, 305, y + index * 30));
    y += Math.max(48, wrapped.length * 30 + 12);
  }
  y += 10; paragraph("추가 요청 사항", 24); paragraph(order.memo.trim() || "없음", 20);
  y += 12; paragraph("업체별 확인 사항", 24);
  supplier.requirements.forEach((requirement) => paragraph(`• ${requirement}`, 20, "#6b7684"));
  paragraph("첨부 이미지는 최대 800px의 편집용 파일입니다. 실제 인쇄 규격·해상도·납기는 제작 전에 확인해야 합니다.", 18, "#6b7684");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pdf.setProperties({ title: `Seongbuk Fit - ${supplier.id} production sheet`, subject: "Mock production document" });
  pages.forEach((canvas, index) => { if (index) pdf.addPage(); pdf.addImage(canvas.toDataURL("image/jpeg", .94), "JPEG", 0, 0, 210, 297); });
  if (download) pdf.save(`seongbuk-fit-${supplier.id}-production.pdf`);
  return pdf.output("blob");
}
