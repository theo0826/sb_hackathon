"use client";
import Link from "next/link";
import Asset from "@/components/layout/WorkspaceAsset";
import { useDesignSession } from "@/lib/design-session";
import { resetOrderDetails } from "@/lib/order-workflow-client";
const steps = [
  ["원하는 옷을 말해요", "색·문구만 말하면 AI가 디자인해요"],
  ["주문서를 확인해요", "수량·사이즈·수령일을 정해요"],
  ["성북 업체를 골라요", "견적과 제작 기간을 비교해요"],
  ["요청서를 받아요", "마이페이지에서 언제든 다시 봐요"],
];
export default function UsageGuide() {
  const { resetSession } = useDesignSession();
  return <section className="my-guide" aria-labelledby="usage-title"><div className="my-section-heading"><h2 id="usage-title">단체티, 이렇게 만들어요</h2></div><ol className="account-guide-steps">{steps.map(([title, description], index) => <li key={title}><span className="account-guide-number">{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div>{index < 3 && <Asset name="1e784.svg" className="account-guide-arrow"/>}</li>)}</ol><div className="my-guide-end"><p>반팔만 지원 · 견적과 제작은 시연용이에요</p><Link href="/design" onClick={() => { resetSession(); resetOrderDetails(); }} className="primary">단체티 디자인하기 <Asset name="f3484.svg"/></Link></div></section>;
}
