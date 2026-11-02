import { isDesign } from "./design";
import { isOrderDetails, reviewIssues, type DemoOrder, type OrderInput } from "./order-workflow";
import { emailTemplate, isOrderDraft, orderRows, totalQuantity, validateDesignForSupplier, validateOrder, type QuoteRecord } from "./quote";
import { getSupplier } from "./suppliers";
import { isClothCapture, type ClothCapture } from "./cloth-capture";

export const DELIVERY_DOCUMENT_VERSION = "browser-handoff-v1";

/** Record the reviewed inputs, without inventing generated patterns or supplier approval. */
export function deliveryOrder(input: OrderInput, requestKey: string, confirmed: boolean, createdAt = new Date().toISOString(), capture?: ClothCapture): DemoOrder {
  if (capture !== undefined && !isClothCapture(capture)) throw new Error("앞·뒷면 이미지를 다시 확인해주세요.");
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(requestKey)
    || !isDesign(input.design) || !isOrderDraft(input.order) || !isOrderDetails(input.details)
    || typeof input.filename !== "string" || input.filename.length > 255 || !Number.isFinite(Date.parse(createdAt))) throw new Error("저장할 주문 정보를 확인해주세요.");
  const supplier = getSupplier(input.supplierId);
  if (!supplier) throw new Error("업체를 먼저 선택해주세요.");
  const issues = [...reviewIssues(input.order, input.details), ...Object.values(validateOrder(input.order, supplier))];
  const designIssue = validateDesignForSupplier(input.design, supplier);
  if (designIssue) issues.push(designIssue);
  if (!confirmed) issues.push("도안과 주문 조건을 확인한 뒤 체크해주세요.");
  if (issues.length) throw new Error([...new Set(issues)].join(" "));
  const email = emailTemplate(supplier, input.design, input.order, input.filename);
  const quote: QuoteRecord = {
    id: `quote_${requestKey}`, mode: "mock", status: "prepared", createdAt,
    supplierId: supplier.id, design: input.design, order: input.order, filename: input.filename,
    quantity: totalQuantity(input.order), format: supplier.format,
    ...(capture ? { clothCapture: capture } : {}),
    document: {
      title: supplier.documentTitle, templateVersion: DELIVERY_DOCUMENT_VERSION, generatedAt: createdAt,
      summary: "전달 확인 시점의 주문 정보와 디자인 원본을 보관한 기록이에요.",
      productionNotes: ["이 기록은 확인한 의류, 수량, 수령 정보와 디자인 원본을 담고 있어요.", "자동 생성된 봉제 패턴이나 업체 승인 내역은 포함되지 않아요."],
      checks: ["최종 제작 조건은 업체와 별도로 확인해주세요.", "현재 브라우저 탭에 보관된 기록이며 실제 업체 발송·결제는 이루어지지 않아요."],
      verifiedRows: orderRows(supplier, input.design, input.order), emailSubject: email.subject, emailBody: email.body,
    },
  };
  return structuredClone({ ...input, id: `demo_${requestKey}`, createdAt, received: false, deliveryStatus: "recorded", preparedQuote: quote });
}
