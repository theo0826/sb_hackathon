import type { Metadata } from "next";
import OrderProgress from "@/components/quote/OrderProgress";
export const metadata: Metadata = { title: "주문 진행 현황" };
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <OrderProgress id={id} />; }
