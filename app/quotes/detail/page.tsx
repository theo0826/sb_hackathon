import { Suspense } from "react";
import StaticDetail from "@/components/layout/StaticDetail";
export const metadata = { title: "견적 요청 내역" };
export default function Page() { return <Suspense fallback={<main id="main-content">불러오는 중…</main>}><StaticDetail section="quotes" /></Suspense>; }
