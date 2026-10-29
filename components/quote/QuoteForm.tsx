"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import RequestView from "./RequestView";
import SupplierHeader from "@/components/supplier/SupplierHeader";
import { downloadRequestPDF } from "@/lib/request-download";
import { matchingOffers, productionOrder, recommendedOffer } from "@/lib/supplier-bids";
import { useDesignSession } from "@/lib/design-session";
import { getClothData, useClothData } from "@/components/ClothSim/clothdata/store";
import { readyClothCapture, snapshotClothCapture } from "@/lib/cloth-capture";

import { recordDelivery, useOrderDetails } from "@/lib/order-workflow-client";


import { getSupplier } from "@/lib/suppliers";

export default function QuoteForm() {
  const { design, order, filename, supplierId, hasResult } = useDesignSession();
  const clothData = useClothData();
  const { details } = useOrderDetails();
  const supplier = getSupplier(supplierId);
  const [reviewedVersion, setReviewedVersion] = useState("");
  const captureReady = readyClothCapture(clothData);
  const reviewVersion = JSON.stringify([clothData.updatedAt, design, order, details, supplierId]);
  const reviewed = captureReady && reviewedVersion === reviewVersion;
  const [delivered, setDelivered] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const deliveryKey = useRef<string | null>(null);
  const completionHeading = useRef<HTMLHeadingElement>(null);

  function confirmDelivery() {
    if (!reviewed) return;
    if (!supplier || delivered) return;
    setSaveError("");
    try {
      deliveryKey.current ??= crypto.randomUUID();
      const current = getClothData();
      if (!readyClothCapture(current) || current.updatedAt !== clothData.updatedAt) throw new Error("도안이 바뀌었어요. 앞·뒷면을 다시 확인해주세요.");
      recordDelivery({ supplierId: supplier.id, design, order, details, filename }, deliveryKey.current, reviewed, snapshotClothCapture(current));
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "주문과 도안을 저장하지 못했어요. 다시 시도해주세요.");
      return;
    }
    setDelivered(true);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => completionHeading.current?.focus());
  }

  async function downloadOrder() {
    if (!supplier || downloadBusy) return;
    setDownloadBusy(true); setSaveError("");
    try {
      await downloadRequestPDF({ supplierId:supplier.id, design, order, clothCapture:captureReady ? snapshotClothCapture(clothData) : undefined });
      setDownloaded(true);
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : "파일을 만들지 못했어요."); }
    finally { setDownloadBusy(false); }
  }
  if (!(hasResult || design.image) || !supplier) return <main id="main-content" className="request-page"><SupplierHeader accountMenu showSave={false}/><section className="request-empty"><h1>{hasResult || design.image ? "업체를 먼저 선택해주세요." : "먼저 디자인을 만들어주세요."}</h1><Link href={hasResult || design.image ? "/suppliers" : "/design"} className="request-primary">이전 단계로 →</Link></section></main>;
  const recommended = recommendedOffer(matchingOffers(design, productionOrder(design, order)))?.supplier.id === supplier.id;
  return <RequestView supplier={supplier} design={design} order={order} details={details} capture={captureReady ? snapshotClothCapture(clothData) : undefined} completed={delivered} reviewed={reviewed} recommended={recommended}
    onReview={checked => setReviewedVersion(checked ? reviewVersion : "")} onDeliver={confirmDelivery} onDownload={() => void downloadOrder()} downloadBusy={downloadBusy} error={saveError} feedback={downloaded ? "제작 요청서를 내려받았어요." : ""} headingRef={completionHeading}/>;
}
