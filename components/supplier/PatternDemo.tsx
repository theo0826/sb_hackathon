"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { DEFAULT_DESIGN, GARMENTS, type Garment, type Side } from "@/lib/design";
import type { OrderDraft } from "@/lib/quote";
import { getSupplier } from "@/lib/suppliers";
import { PATTERN_TEMPLATES } from "@/lib/production-mapping";
import { sampleProductionDocument } from "@/lib/production-document";
import { useDesignSession } from "@/lib/design-session";
import ProductionDocument from "./ProductionDocument";

export default function PatternDemo({deliveryDate}:{deliveryDate:string}) {
  const [supplierId,setSupplierId]=useState("jangwi");
  const [garment,setGarment]=useState<Garment>("tee");
  const [side,setSide]=useState<Side>("front");
  const [rotation,setRotation]=useState(0);
  const {loadDesign,selectSupplier,setOrder}=useDesignSession();
  const router=useRouter();
  const supplier=getSupplier(supplierId)!;
  const design=useMemo(()=>({...DEFAULT_DESIGN,garment,side,rotation,text:"SEONGBUK CREW"}),[garment,side,rotation]);
  const order:OrderDraft=useMemo(()=>({group:"성북 이웃 모임 · 목업",contactEmail:"sample@example.com",sizes:{S:5,M:15,L:10,XL:0},desiredDeliveryDate:deliveryDate,method:supplier.methods[0],printWidthCm:Math.min(18,supplier.maxPrintWidthCm),printHeightCm:Math.min(18,supplier.maxPrintHeightCm),memo:"업체 양식과 봉제 패턴 변환을 확인하는 목업입니다."}),[supplier,deliveryDate]);
  const document=useMemo(()=>sampleProductionDocument(supplier,design,order,`sample-${garment}-${side}-${rotation}`),[supplier,design,order,garment,side,rotation]);
  const template=document.production!.template;
  function continueOrder(){loadDesign({design,prompt:"목업 디자인",filename:""});selectSupplier(supplier.id);setOrder(order);router.push("/quotes/new");}
  return <main id="main-content" className="shell pattern-demo" data-ui>
    <div className="intro"><div><h1>업체 도안 양식 3종</h1><p>고객 UV를 기준으로 봉제·인쇄 패턴을 변환하는 목업입니다.</p></div><Link href="/design" className="outline">디자인 화면</Link></div>
    <div className="pattern-template-tabs" role="group" aria-label="업체 목업 양식 선택">{PATTERN_TEMPLATES.map(item=><button key={item.supplierId} aria-pressed={supplierId===item.supplierId} onClick={()=>setSupplierId(item.supplierId)}>{getSupplier(item.supplierId)!.name}</button>)}</div>
    <div className="pattern-demo-controls"><label>의류<select aria-label="목업 의류" value={garment} onChange={event=>setGarment(event.target.value as Garment)}>{GARMENTS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>도안 면<select aria-label="목업 도안 면" value={side} onChange={event=>setSide(event.target.value as Side)}><option value="front">앞면</option><option value="back">뒷면</option></select></label><label>도안 회전<select aria-label="목업 도안 회전" value={rotation} onChange={event=>setRotation(Number(event.target.value))}><option value={0}>0°</option><option value={15}>15°</option><option value={-15}>-15°</option></select></label></div>
    <section className="pattern-demo-template"><h2>{template.name}</h2><p>{template.description}</p><p>필수 항목: {template.fields.join(" · ")}</p><p>납품 자료: {template.files.join(" · ")}</p><p>추가 AI 비용 없이 목업 변환을 확인합니다. 실제 업체 양식·실측치·그레이딩은 아직 적용되지 않았습니다.</p></section>
    <ProductionDocument key={`${supplierId}-${garment}-${side}-${rotation}`} supplier={supplier} design={design} order={order} filename="" document={document}/>
    <div className="bottom-action"><div><strong>이 예시로 변환·저장 흐름을 확인할 수 있어요.</strong><p>주문 화면에서 목업 변환 또는 AI 변환을 선택합니다.</p></div><button className="primary" onClick={continueOrder}>이 예시로 주문 정보 입력<ArrowRight size={16}/></button></div>
  </main>;
}
