import type { Metadata } from "next";
import QuoteForm from "@/components/quote/QuoteForm";
export const metadata: Metadata = { title: "업체 맞춤 제작자료" };
export default function PreparationPage() { return <QuoteForm />; }
