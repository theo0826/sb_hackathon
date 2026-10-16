"use client";
import { STATIC_SITE } from "@/lib/deployment";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight, Clock3, Info } from "lucide-react";
import { useQuoteHistoryState } from "@/lib/quote-history";
import { getSupplier } from "@/lib/suppliers";
import FlowSteps from "@/components/layout/FlowSteps";
import ProductionDocument from "@/components/supplier/ProductionDocument";
const subscribeReady = () => () => {};
export default function QuoteDetail({ id }: { id: string }) {
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const { records, loading, error } = useQuoteHistoryState();
  const record = records.find(item => item.id === id);
  const supplier = getSupplier(record?.supplierId);
  return <main id="main-content" className="shell studio-main waiting-page">
    {!ready || loading ? <div className="empty-state">요청 내역을 불러오고 있어요.</div> : !record || !supplier ? <section className="empty-state"><Info size={28} /><h1>요청 내역을 찾지 못했어요.</h1><p>{error || "요청서를 만든 브라우저에서 다시 확인해주세요."}</p><Link href="/my?tab=waiting" className="primary">견적 요청서 보기</Link></section> : <>
      <FlowSteps current={4} />
      {record.trashedAt&&<div className="demo-notice"><span>이 요청서는 휴지통에 있어요.</span><Link href="/my?tab=trash" className="text-link">휴지통에서 복원하기</Link></div>}
      <section className="panel quote-complete"><span className="completion-check"><Clock3 size={32} /></span><h1>견적 요청서가 준비됐어요.</h1><p>{supplier.name} · {record.order.group} · {record.quantity}벌</p><p className="waiting-explanation">{record.sourceOrderId ? "선택한 주문서와 도안을 바탕으로 제작자료 초안을 준비했어요." : STATIC_SITE ? "목업 변환 결과와 도안을 현재 브라우저 탭에 보관했어요." : record.document?.production?.converter === "sample" ? "목업 변환 결과와 도안을 서버에 보관했어요." : "AI 제작 설명과 도안을 서버에 보관했어요."} 업체 양식으로 내려받을 수 있어요.</p><div className="demo-notice"><Info size={16} /><span>업체 발송 전 초안이에요. 최종 제작 조건과 견적 금액은 업체 확인이 필요해요.</span></div><Link href="/my?tab=waiting" className="primary">마이페이지에서 확인 <ArrowRight size={16} /></Link></section>
      <details className="waiting-document" open><summary>견적 요청서 확인하기</summary><ProductionDocument supplier={supplier} design={record.design} order={record.order} filename={record.filename} document={record.document} /></details>
    </>}
  </main>;
}
