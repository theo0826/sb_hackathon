import type { Metadata } from "next";
import LibraryDetail from "@/components/library/LibraryDetail";
export const metadata: Metadata = { title: "보관함 상세" };
export default async function SavedItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LibraryDetail id={id} />;
}
