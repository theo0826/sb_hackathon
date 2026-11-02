"use client";
import { useState } from "react";
import type { QuoteRecord } from "@/lib/quote";
import type { OrderDetails } from "@/lib/order-workflow";
import { getSupplier } from "@/lib/suppliers";
import { downloadRequestPDF, downloadRequestImages } from "@/lib/request-download";
import RequestView from "./RequestView";
export default function SavedRequestView({ record, details }: { record: QuoteRecord; details?: OrderDetails }) {
  const [busy, setBusy] = useState(false), [feedback, setFeedback] = useState(""), [error, setError] = useState("");
  async function download() {
    if (busy) return;
    setBusy(true); setError("");
    try { await downloadRequestPDF(record); if (record.clothCapture) downloadRequestImages(record); setFeedback(record.clothCapture ? "요청서 PDF와 앞·뒷면 도안 이미지를 내려받았어요." : "요청서 PDF를 내려받았어요. 저장된 도안 이미지는 없어요."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "파일을 만들지 못했어요."); }
    finally { setBusy(false); }
  }
  const supplier = getSupplier(record.supplierId);
  return supplier && <RequestView supplier={supplier} design={record.design} order={record.order} details={details} capture={record.clothCapture} readOnly createdAt={record.createdAt} onDownload={() => void download()} downloadBusy={busy} feedback={feedback} error={error}/>;
}
