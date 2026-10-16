import Link from "next/link";
import { ArrowRight, PenLine, ClipboardCheck, Store, PackageCheck } from "lucide-react";

const steps = [
  { icon: PenLine, title: "원하는 단체티를 디자인해요", description: "주민 모임, 동호회, 가족 행사, 상점의 직원복까지. 원하는 색과 문구를 입력하거나 로고를 올리고 3D로 확인하세요." },
  { icon: ClipboardCheck, title: "주문서와 도안을 확인해요", description: "사이즈별 수량이나 명단을 입력하고 수령일과 배송 방법을 정해요. 앞뒷면 도안을 확인한 뒤 다음 단계로 이동하세요." },
  { icon: Store, title: "성북의 제작 업체를 비교해요", description: "같은 주문 조건으로 가격과 제작 기간을 비교해요. 최소 수량과 인쇄 크기에 맞는 업체를 선택할 수 있어요." },
  { icon: PackageCheck, title: "주문 진행을 한곳에서 봐요", description: "마이페이지의 주문에서 도안 확인부터 제작과 수령까지의 진행을 살펴보고, 업체 맞춤 제작자료를 준비하세요." },
];
export default function UsageGuide() {
  return <section className="my-guide" aria-labelledby="usage-title"><div className="my-section-heading"><h2 id="usage-title">단체티, 이렇게 만들어요</h2><p>성북구의 모든 모임을 위한 제작 안내.</p></div><ol className="my-guide-steps">{steps.map(({ icon: Icon, title, description }) => <li className="wf-card" key={title}><span className="my-guide-icon"><Icon size={22}/></span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol><div className="my-guide-end"><p>현재 반팔 디자인을 지원해요. 업체 견적과 제작 진행은 시연용이며 실제 결제·발송은 이루어지지 않아요.</p><Link href="/design" className="primary">단체티 디자인하기 <ArrowRight size={16}/></Link></div></section>;
}
