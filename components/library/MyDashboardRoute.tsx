"use client";
import { useSearchParams } from "next/navigation";
import MyDashboard, { type DashboardTab } from "./MyDashboard";
export default function MyDashboardRoute() {
  const tab = useSearchParams().get("tab");
  const selected: DashboardTab = tab && ["orders", "guide", "waiting", "trash"].includes(tab) ? tab as DashboardTab : "design";
  return <MyDashboard key={selected} initialTab={selected} />;
}
