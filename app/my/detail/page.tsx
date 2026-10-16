import { Suspense } from "react";
import StaticDetail from "@/components/layout/StaticDetail";
export const metadata = { title: "보관함 상세" };
export default function Page() { return <Suspense fallback={<main id="main-content">불러오는 중…</main>}><StaticDetail section="my" /></Suspense>; }
