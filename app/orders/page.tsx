import type { Metadata } from "next";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "내 주문" };
export default function OrdersPage() { redirect("/my?tab=orders"); }
