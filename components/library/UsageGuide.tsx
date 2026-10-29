import Link from "next/link";
import Asset from "@/components/layout/WorkspaceAsset";

const steps = [
  { icon: "2717e.svg", mobileIcon:"8ec64.svg", mobile:"원하는 색과 문구를 입력하거나 로고를 올리고 3D로 확인하세요.", title: "원하는 단체티를 디자인해요", description: "주민 모임, 동호회, 가족 행사, 상점의 직원복까지. 원하는 색과 문구를 입력하거나 로고를 올리고 3D로 확인하세요." },
  { icon: "c4502.svg", mobileIcon:"60932.svg", mobile:"사이즈별 수량이나 명단, 수령일과 배송 방법을 정해요.", title: "주문서와 도안을 확인해요", description: "사이즈별 수량이나 명단을 입력하고 수령일과 배송 방법을 정해요. 앞뒷면 도안을 확인한 뒤 다음 단계로 이동하세요." },
  { icon: "ddc2e.svg", mobileIcon:"99476.svg", mobile:"조건이 맞는 업체의 가격과 제작 기간을 비교하고 골라요.", title: "성북의 제작 업체 견적을 비교해요", description: "조건이 맞는 업체에만 견적을 요청해요. 도착한 견적의 가격과 제작 기간을 비교하고 업체를 고르세요." },
  { icon: "23cc0.svg", mobileIcon:"411df.svg", mobile:"전달한 요청서와 제작자료를 다시 보고 내려받을 수 있어요.", title: "주문 진행을 한곳에서 봐요", description: "마이페이지 주문에서 전달한 요청서와 제작자료를 다시 보고 내려받을 수 있어요." },
];
export default function UsageGuide() {
  return <section className="my-guide" aria-labelledby="usage-title"><div className="my-section-heading"><h2 id="usage-title">단체티, 이렇게 만들어요</h2><p>성북구의 모든 모임을 위한 제작 안내예요.</p></div><ol className="my-guide-steps">{steps.map(({ icon, mobileIcon, mobile, title, description }, index) => <li className="wf-card" key={title}><span className="my-guide-icon"><Asset name={icon} className="account-desktop"/><Asset name={mobileIcon} className="account-mobile"/></span><div><span className="account-step-number">0{index + 1}</span><h3>{title}</h3><p className="account-desktop">{description}</p><p className="account-mobile">{mobile}</p></div></li>)}</ol><div className="my-guide-end"><p>현재 반팔 디자인을 지원해요. 업체 견적과 제작 진행은 시연용이며 실제 결제·발송은 이루어지지 않아요.</p><Link href="/design" className="primary">단체티 디자인하기 <Asset name="f3484.svg"/></Link></div></section>;
}
