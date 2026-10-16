import type { Metadata } from "next";
import MyDashboard from "@/components/library/MyDashboard";
export const metadata: Metadata = { title: "마이페이지" };
export default function MyPage() { return <MyDashboard />; }
