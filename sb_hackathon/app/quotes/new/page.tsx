import type { Metadata } from "next";
import QuoteForm from "@/components/quote/QuoteForm";
export const metadata: Metadata = { title: "견적 요청" };
export default function NewQuotePage() { return <QuoteForm />; }
