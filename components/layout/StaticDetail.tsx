"use client";
import { useSearchParams } from "next/navigation";
import LibraryDetail from "@/components/library/LibraryDetail";
import QuoteDetail from "@/components/quote/QuoteDetail";
import OrderProgress from "@/components/quote/OrderProgress";

export default function StaticDetail({ section }: { section: "my" | "quotes" | "orders" }) {
  const id = useSearchParams().get("id") || "";
  if (section === "my") return <LibraryDetail id={id} />;
  if (section === "quotes") return <QuoteDetail id={id} />;
  return <OrderProgress id={id} />;
}
