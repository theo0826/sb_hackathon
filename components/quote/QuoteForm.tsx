"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { useDesignSession } from "@/lib/design-session";
import { getSupplier } from "@/lib/suppliers";

export default function QuoteForm() {
  const { design, supplierId, hasResult } = useDesignSession();
  const supplier = getSupplier(supplierId);
  const [delivered, setDelivered] = useState(false);
  const completionHeading = useRef<HTMLHeadingElement>(null);

  function confirmDelivery() {
    // Frontend demonstration only; wire the team's delivery API here when available.
    setDelivered(true);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => completionHeading.current?.focus());
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

  return <main id="main-content" className="wf-page supplier-design-page">
    {delivered ? <section className="supplier-design-complete" aria-labelledby="delivery-complete-title">
      <span className="supplier-delivery-check" aria-hidden="true"><Check size={36} strokeWidth={2.5} /></span>
      <h1 id="delivery-complete-title" ref={completionHeading} tabIndex={-1}>도안이 전달되었습니다!</h1>
      <Link href="/" className="primary">홈으로</Link>
    </section> : <div className="supplier-design-content">
      {/* The backend team's generated artwork will be rendered inside this region. */}
      <section id="supplier-generated-design" className="supplier-generated-design" aria-label="AI 생성 맞춤 도안" data-supplier-id={supplier.id} />
      <section className="supplier-design-confirmation" aria-labelledby="supplier-design-title">
        <div>
          <h1 id="supplier-design-title">맞춤 도안이 만들어졌어요.</h1>
          <p>업체에 도안을 전달할까요?</p>
        </div>
        <div className="supplier-design-actions">
          <Link href="/suppliers" className="outline">나중에 할게요</Link>
          <button type="button" className="primary" onClick={confirmDelivery}>도안 전달하기</button>
        </div>
      </section>
    </div>}
  </main>;
}
