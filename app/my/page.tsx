import type { Metadata } from "next";
import { Suspense } from "react";
import MyDashboardRoute from "@/components/library/MyDashboardRoute";
export const metadata: Metadata = { title: "마이페이지" };
export default function MyPage() {
  return <Suspense fallback={<main id="main-content">마이페이지를 불러오는 중…</main>}><MyDashboardRoute /></Suspense>;
}
