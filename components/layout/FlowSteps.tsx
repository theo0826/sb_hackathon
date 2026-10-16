import Link from "next/link";
import { Check } from "lucide-react";

const steps = [{ label: "디자인", href: "/design" }, { label: "주문서 확인", href: "/quotes/new" }, { label: "업체 견적", href: "/suppliers" }, { label: "제작 진행", href: "/my?tab=orders" }];

export default function FlowSteps({ current }: { current: number }) {
  return <nav className="wf-progress" aria-label="제작 단계"><ol className="progress-steps flow-steps">{steps.map((step, index) => <li key={step.href} className={index + 1 === current ? "active" : index + 1 < current ? "complete" : ""} aria-current={index + 1 === current ? "step" : undefined}><span>{index + 1 < current ? <Check size={12} /> : index + 1}</span>{index + 1 < current && current !== 4 ? <Link href={step.href}>{step.label}</Link> : step.label}</li>)}</ol><div className="wf-mobile-progress"><span>{current} / 4 {steps[current - 1]?.label}</span><div style={{ width: `${current * 25}%` }} /></div></nav>;
}
