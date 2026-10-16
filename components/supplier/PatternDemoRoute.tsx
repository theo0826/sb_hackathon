"use client";
import { useSyncExternalStore } from "react";
import { todayKST } from "@/lib/quote";
import PatternDemo from "./PatternDemo";
const subscribe = () => () => {};
const deliveryDate = () => todayKST(new Date(Date.now() + 14 * 86400000));
export default function PatternDemoRoute() {
  const date = useSyncExternalStore(subscribe, deliveryDate, () => "");
  if (!date) return <main id="main-content">목업 양식을 불러오는 중…</main>;
  return <PatternDemo deliveryDate={date} />;
}
