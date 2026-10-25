import type { Metadata } from "next";
import QuoteForm from "@/components/quote/QuoteForm";
export const metadata: Metadata = { title: "맞춤 도안 확인" };
export default function PreparationPage() { return <QuoteForm />; }
