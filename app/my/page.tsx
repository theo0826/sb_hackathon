import type { Metadata } from "next";
import MyDashboard, { type DashboardTab } from "@/components/library/MyDashboard";
export const metadata: Metadata = { title: "마이페이지" };
export default async function MyPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const { tab } = await searchParams;
  const selected: DashboardTab = typeof tab === "string" && ["orders", "guide", "waiting", "trash"].includes(tab) ? tab as DashboardTab : "design";
  return <MyDashboard key={selected} initialTab={selected} />;
}
