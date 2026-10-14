import type { Metadata } from "next";
import QuoteDetail from "@/components/quote/QuoteDetail";
export const metadata: Metadata = { title: "견적 요청 내역" };
export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteDetail id={id} />;
}
