import Link from "next/link";
import { Check } from "lucide-react";

const steps = [{ label: "디자인 생성", href: "/design" }, { label: "업체 선택", href: "/suppliers" }, { label: "맞춤 도안 확인", href: "/quotes/new" }, { label: "전달·견적 대기", href: "/my?tab=waiting" }];

export default function FlowSteps({ current }: { current: number }) {
  return <ol className="progress-steps flow-steps" aria-label="제작 단계">{steps.map((step, index) => <li key={step.href} className={index + 1 === current ? "active" : ""} aria-current={index + 1 === current ? "step" : undefined}><span>{index + 1 < current ? <Check size={12} /> : index + 1}</span>{index + 1 < current && current !== 4 ? <Link href={step.href}>{step.label}</Link> : step.label}</li>)}</ol>;
}
