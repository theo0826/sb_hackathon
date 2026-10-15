"use client";
import Image from "next/image";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Check, Download, LoaderCircle, X, ZoomIn } from "lucide-react";
import Artwork from "@/components/design/Artwork";
import type { Design } from "@/lib/design";
import { conversionRows, type ProductionPacket } from "@/lib/production-mapping";
import { factoryPatternPayload, renderCustomerUV, renderFactoryPattern } from "@/lib/production-svg";
import { downloadText } from "@/lib/production-export";

export type PatternHandle = { pngs: () => Promise<{ uvPNG: string; patternPNG: string }> };
const svgURL = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/(width|height)="(\d+)mm"/g,'$1="$2"'))}`;
async function png(svg: string, width: number, height: number) {
  const image = new window.Image();
  await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("패턴 미리보기를 만들지 못했어요."));image.src=svgURL(svg);});
  const canvas = document.createElement("canvas");canvas.width=width;canvas.height=height;
  const context = canvas.getContext("2d");if(!context)throw new Error("이미지를 내보낼 수 없어요.");
  context.drawImage(image,0,0,width,height);return canvas.toDataURL("image/png");
}
export default function PatternComparison({ packet, design, exportRef }: { packet: ProductionPacket; design: Design; exportRef?: Ref<PatternHandle> }) {
  const artwork = useRef<SVGSVGElement>(null);
  const [source,setSource] = useState("");
  const [error,setError] = useState("");
  const [zoomed,setZoomed] = useState<"uv"|"pattern">("uv");
  const [fabricData,setFabricData]=useState<{key:string;data:string}|null>(null);
  useEffect(()=>{let active=true;if(!design.fabricImage)return;const key=design.fabricImage;void fetch(key).then(response=>{if(!response.ok)throw new Error();return response.blob();}).then(blob=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error());reader.readAsDataURL(blob);})).then(data=>{if(active)setFabricData({key,data});}).catch(()=>{if(active)setError("원단 무늬를 불러오지 못했어요.");});return()=>{active=false;};},[design.fabricImage]);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    let active=true;
    void (async()=>{
      if(design.image){
        const response=await fetch(design.image);if(!response.ok)throw new Error("도안 원본을 불러오지 못했어요.");
        const blob=await response.blob();
        return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("도안을 읽지 못했어요."));reader.readAsDataURL(blob);});
      }
      if(!artwork.current)throw new Error("원본 도안이 준비되지 않았어요.");
      return svgURL(new XMLSerializer().serializeToString(artwork.current));
    })().then(value=>{if(active){setSource(value);setError("");}}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:"도안을 불러오지 못했어요.");});
    return()=>{active=false;};
  },[design]);
  const fabricSource=fabricData?.key===design.fabricImage?fabricData?.data:undefined;
  const ready=source && (design.fabric?.pattern!=="custom" || fabricSource);
  const uv = ready ? renderCustomerUV(packet.source,source,fabricSource) : "";
  const pattern = ready ? renderFactoryPattern(packet,source,fabricSource) : "";
  useImperativeHandle(exportRef,()=>({pngs:async()=>{
    if(!uv||!pattern)throw new Error("UV와 패턴이 준비된 뒤 다시 내려받아주세요.");
    const [uvPNG,patternPNG]=await Promise.all([png(uv,1500,1215),png(pattern,2000,1850)]);
    return {uvPNG,patternPNG};
  }}),[uv,pattern]);
  return <section className="pattern-comparison" aria-label="고객 UV에서 업체 봉제 패턴으로 변환" data-template={packet.template.id} data-verification={packet.verification.status}>
    <div className="sr-only" aria-hidden="true"><Artwork design={design} exportRef={artwork}/></div>
    <div className="pattern-comparison-heading"><h3>고객 UV → 업체 봉제 패턴</h3><p>{packet.template.description}</p></div>
    {!source&&!error?<p role="status"><LoaderCircle className="animate-spin" size={16}/>도안과 패턴을 준비하고 있어요.</p>:error?<p className="error" role="alert">{error}</p>:<div className="pattern-comparison-images"><figure><Image src={svgURL(uv)} width={1000} height={810} alt="고객 확인용 앞뒤 UV 전개도" unoptimized/><figcaption>고객 확인용 UV · 주문 인쇄 치수 반영</figcaption><button className="text-link" onClick={()=>{setZoomed("uv");dialog.current?.showModal();}}><ZoomIn size={15}/>UV 확대 보기</button></figure><figure><Image src={svgURL(pattern)} width={2000} height={1850} alt={`${packet.template.name}의 봉제·인쇄 패널 목업`} unoptimized/><figcaption>업체 제출용 패턴 · {packet.template.unit} · {packet.template.name}</figcaption><button className="text-link" onClick={()=>{setZoomed("pattern");dialog.current?.showModal();}}><ZoomIn size={15}/>패턴 확대 보기</button></figure></div>}
    <dialog ref={dialog} className="pattern-zoom-dialog" aria-label="도면 확대 보기"><div className="pattern-zoom-toolbar"><strong>{zoomed==="uv"?"고객 UV 전개도":"업체 봉제 패턴"}</strong><button className="icon-button" aria-label="도면 확대 닫기" onClick={()=>dialog.current?.close()}><X size={20}/></button></div><p>확대된 도면을 좌우·위아래로 이동해서 확인하세요.</p><div className="pattern-zoom-scroll">{source&&<Image src={svgURL(zoomed==="uv"?uv:pattern)} width={zoomed==="uv"?1000:2000} height={zoomed==="uv"?810:1850} alt="확대된 도면" unoptimized/>}</div></dialog>
    <p className="pattern-verification"><Check size={16}/>원본 도안 유지 · 위치·크기 역변환 오차 {packet.verification.maxDeviationMm.toFixed(4)} mm</p>
    {packet.verification.issues.map(issue=><p className="pattern-review-note" key={issue}>{issue}</p>)}
    <details className="flow-disclosure"><summary>업체 좌표·봉제 기준 확인</summary><dl className="document-rows">{conversionRows(packet).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>이 목업은 M 한 사이즈의 가상 패널입니다. 실제 업체 패턴·곡선 시접·소재 수축률·사이즈 그레이딩 검수 후 재단할 수 있어요.</p></details>
    <div className="pattern-downloads"><button className="outline" disabled={!uv} onClick={()=>downloadText(`seongbuk-fit-${packet.template.supplierId}-customer-uv.svg`,uv,"image/svg+xml;charset=utf-8")}><Download size={15}/>고객 UV SVG</button><button className="outline" disabled={!pattern} onClick={()=>downloadText(`seongbuk-fit-${packet.template.supplierId}-sewing-pattern.svg`,pattern,"image/svg+xml;charset=utf-8")}><Download size={15}/>업체 봉제 패턴 SVG</button><button className="outline" onClick={()=>downloadText(`seongbuk-fit-${packet.template.supplierId}-production.json`,JSON.stringify(factoryPatternPayload(packet),null,2),"application/json;charset=utf-8")}><Download size={15}/>업체 변환 명세 JSON</button></div>
  </section>;
}
