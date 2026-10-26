"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCheck, Download, FileText, MapPin, Send, ShieldCheck } from "lucide-react";
import { useDesignSession } from "@/lib/design-session";
import { useClothData } from "@/components/ClothSim/clothdata/store";
import { recordDelivery, useOrderDetails } from "@/lib/order-workflow-client";
import { SIZES, totalQuantity } from "@/lib/quote";
import { pricingGarment } from "@/lib/garment-pricing";
import { getSupplier } from "@/lib/suppliers";

export default function QuoteForm() {
  const { design, order, filename, supplierId, hasResult } = useDesignSession();
  const clothData = useClothData();
  const { details } = useOrderDetails();
  const supplier = getSupplier(supplierId);
  const [reviewed, setReviewed] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [saveError, setSaveError] = useState("");
  const deliveryKey = useRef<string | null>(null);
  const completionHeading = useRef<HTMLHeadingElement>(null);

  function confirmDelivery() {
    if (!reviewed) return;
    if (!supplier || delivered) return;
    setSaveError("");
    try {
      deliveryKey.current ??= crypto.randomUUID();
      recordDelivery({ supplierId: supplier.id, design, order, details, filename }, deliveryKey.current, reviewed);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "주문과 도안을 저장하지 못했어요. 다시 시도해주세요.");
      return;
    }
    setDelivered(true);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => completionHeading.current?.focus());
  }

  function downloadOrder() {
    const rows = [
      ["성북핏 제작 요청서 · 시연용"], ["실제 업체에 발송되지 않은 주문 정보입니다."],
      ["업체", supplier?.name || ""], ["단체 이름", order.group || "미입력"],
      ["의류", pricingGarment(order.pricingGarment).label], ["총 수량", `${totalQuantity(order)}벌`],
      ["사이즈별 수량", SIZES.map(size => `${size} ${order.sizes[size]}벌`).join(" / ")],
      ["제작 방식", order.method], ["희망 수령일", order.desiredDeliveryDate || "미입력"],
      ["수령 방법", details.delivery === "pickup" ? "방문 수령" : "택배 배송"],
      ...(details.delivery === "shipping" ? [["배송 주소", details.address || "미입력"]] : []),
      ["연락 이메일", order.contactEmail || "미입력"], ["연락처", details.phone || "미입력"],
      ["추가 요청", order.memo || "없음"], ["참고 이미지 파일명", filename || "없음"],
      ["첨부 안내", "도안 원본은 별도 파일로 보관해주세요. 이 파일에는 이미지와 생성된 의상이 포함되지 않습니다."],
    ];
    // Plain text avoids spreadsheet formula execution and renders user input as data.
    const file = new Blob(["\uFEFF", rows.map(row => row.join(": ")).join("\r\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file), anchor = document.createElement("a");
    anchor.href = url; anchor.download = "성북핏-제작요청서.txt"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setDownloaded(true);
  }

  if (!(hasResult || design.image) || !supplier) {
    return <main id="main-content" className="wf-page">
      <section className="wf-empty">
        <h1>{hasResult || design.image ? "업체를 먼저 선택해주세요." : "먼저 디자인을 만들어주세요."}</h1>
        <Link href={hasResult || design.image ? "/suppliers" : "/design"} className="primary">
          {hasResult || design.image ? "업체 선택하기" : "디자인 만들기"}
        </Link>
      </section>
    </main>;
  }

  const summary = <dl className="delivery-summary">
    <div><dt>단체 이름</dt><dd>{order.group || "아직 입력하지 않았어요"}</dd></div>
    <div><dt>의류 · 제작 방식</dt><dd>{pricingGarment(order.pricingGarment).label} · {order.method}</dd></div>
    <div><dt>주문 수량</dt><dd><strong>{totalQuantity(order)}벌</strong><span>{SIZES.filter(size => order.sizes[size] > 0).map(size => `${size} ${order.sizes[size]}`).join(" · ") || "수량 미입력"}</span></dd></div>
    <div><dt>희망 수령일</dt><dd>{order.desiredDeliveryDate || "업체와 일정 확인 필요"}</dd></div>
    <div><dt>수령 방법</dt><dd>{details.delivery === "pickup" ? "방문 수령" : "택배 배송"}</dd></div>
    <div><dt>연락 이메일</dt><dd>{order.contactEmail || "아직 입력하지 않았어요"}</dd></div>
  </dl>;

  return <main id="main-content" className="wf-page supplier-design-page">
    <div className="delivery-workspace">
      {delivered ? <section className="delivery-receipt" aria-labelledby="delivery-complete-title">
        <span className="supplier-delivery-check" aria-hidden="true"><CheckCheck size={34} strokeWidth={2} /></span>
        <h1 id="delivery-complete-title" ref={completionHeading} tabIndex={-1}>도안 전달을 마쳤어요.</h1>
        <p>선택한 업체와 주문 내용을 다시 확인하고, 요청서를 보관해주세요.</p>
        <div className="delivery-receipt-sheet"><div className="delivery-sheet-heading"><FileText size={20} /><h2>{supplier.name} 제작 요청서</h2><span>전달 완료</span></div>{summary}</div>
        <div className="delivery-demo-note"><ShieldCheck size={20} /><p>주문과 도안 전달 내역을 마이페이지에 저장했어요. 현재 탭을 닫으면 사라지니 중요한 자료는 내려받아주세요. 실제 업체 발송·결제는 별도예요.</p></div>
        <div className="delivery-receipt-actions"><button type="button" className="primary" onClick={downloadOrder}><Download size={17} />주문 정보 내려받기</button><Link href="/my?tab=orders" className="outline">마이페이지에서 주문 보기 <ArrowRight size={16} /></Link></div>
        <Link href="/suppliers" className="text-link"><ArrowLeft size={15} />업체 목록으로 돌아가기</Link>
      </section> : <>
        <header className="delivery-page-heading"><Link href="/suppliers" className="text-link"><ArrowLeft size={15} />업체 비교로 돌아가기</Link><div><h1>제작 요청서 최종 확인</h1><p>도안과 주문 조건을 살펴보고, 업체 전달 과정을 체험해보세요.</p></div></header>
        <div className="delivery-review-layout">
          <div className="delivery-document-column">
            <section className="delivery-artwork" aria-labelledby="delivery-artwork-title">
              <div className="delivery-sheet-heading"><FileText size={20} /><h2 id="delivery-artwork-title">업체 맞춤 도안</h2><span>전달 전 검토</span></div>
              {/* Keep this target available for the backend team's generated artwork. */}
              <div id="supplier-generated-design" className="supplier-generated-design" aria-label="AI 생성 맞춤 도안" data-supplier-id={supplier.id}>
                {clothData.completed === 1 && clothData.front && clothData.back && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <img src={clothData.front} alt="앞면" style={{ width: "calc(50% - 4px)", height: "auto" }} />
                    <img src={clothData.back} alt="뒷면" style={{ width: "calc(50% - 4px)", height: "auto" }} />
                  </div>
                )}
              </div>
              <div className="delivery-artwork-caption"><span>도안 미리보기 영역</span><p>현재는 전달 흐름을 확인하는 시연이에요. 실제 생성 도안 연결을 준비 중이에요.</p></div>
            </section>
          </div>
          <aside className="delivery-order-column" aria-label="전달할 주문 조건">
            <section className="delivery-order-sheet"><div className="delivery-supplier"><span className="delivery-supplier-icon"><Send size={20} /></span><div><p>선택한 제작 업체</p><h2>{supplier.name}</h2><span><MapPin size={13} />성북구 {supplier.region} · 예시 업체</span></div></div><h3>주문 요약</h3>{summary}<Link href="/quotes/new" className="text-link">주문 정보 수정 <ArrowRight size={14} /></Link></section>
            <section className="delivery-confirm"><label><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /><span>도안 영역과 주문 조건을 확인했어요.</span></label><button type="button" className="primary wide" disabled={!reviewed} onClick={confirmDelivery}><Send size={17} />도안 전달하기</button><p>확인한 주문과 도안은 마이페이지에 보관해요. 실제 업체 발송·결제는 별도예요.</p>{saveError && <p className="error" role="alert">{saveError}</p>}</section>
            <button type="button" className="delivery-backup text-link" onClick={downloadOrder}><Download size={16} />주문 정보 내려받기</button>
          </aside>
        </div>
      </>}
      {downloaded && <p className="delivery-download-feedback" role="status"><Check size={16} />주문 정보 다운로드를 요청했어요. 도안 원본은 별도로 보관해주세요.</p>}
    </div>
  </main>;
}
