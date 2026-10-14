"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight, Clock3, Info } from "lucide-react";
import { useQuoteHistory } from "@/lib/quote-history";
import { getSupplier } from "@/lib/suppliers";
import FlowSteps from "@/components/layout/FlowSteps";
import ProductionDocument from "@/components/supplier/ProductionDocument";
const subscribeReady = () => () => {};
export default function QuoteDetail({ id }: { id: string }) {
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const record = useQuoteHistory().find(item => item.id === id);
  const supplier = getSupplier(record?.supplierId);
  return <main id="main-content" className="shell studio-main waiting-page">
    {!ready ? <div className="empty-state">요청 내역을 불러오고 있어요.</div> : !record || !supplier ? <section className="empty-state"><Info size={28} /><h1>요청 내역을 찾지 못했어요.</h1><p>도안을 전달한 브라우저에서 다시 확인해주세요.</p><Link href="/my?tab=waiting" className="primary">견적 대기 내역 보기</Link></section> : <>
      <FlowSteps current={4} />
      <section className="panel quote-complete"><span className="completion-check"><Clock3 size={32} /></span><h1>이제 견적을 기다려요.</h1><p>{supplier.name} · {record.order.group} · {record.quantity}벌</p><p className="waiting-explanation">전달한 도안은 마이페이지에서 다시 확인할 수 있어요.</p><div className="demo-notice"><Info size={16} /><span>체험용 대기 상태예요. 실제 업체에 전송되지 않았으며 견적 회신은 오지 않아요.</span></div><Link href="/my?tab=waiting" className="primary">마이페이지에서 확인 <ArrowRight size={16} /></Link></section>
      <details className="waiting-document"><summary>전달한 도안 확인하기</summary><ProductionDocument supplier={supplier} design={record.design} order={record.order} filename={record.filename} /></details>
    </>}
  </main>;
}
