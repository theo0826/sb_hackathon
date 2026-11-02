import type { Metadata } from "next";
import { Suspense } from "react";
import MyDashboardRoute from "@/components/library/MyDashboardRoute";
import SupplierHeader from "@/components/supplier/SupplierHeader";
export const metadata: Metadata = { title: "마이페이지" };
export default function MyPage() {
  return <Suspense fallback={<main id="main-content" className="account-page" data-ui><SupplierHeader /><div className="account-content" role="status">마이페이지를 불러오는 중…</div></main>}><MyDashboardRoute /></Suspense>;
}
