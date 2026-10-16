import type { Metadata } from "next";
import OrderReview from "@/components/quote/OrderReview";
export const metadata: Metadata = { title: "주문서 · 도안 확인" };
export default function NewQuotePage() { return <OrderReview />; }
