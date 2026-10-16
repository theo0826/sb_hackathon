import { redirect } from "next/navigation";

// Preserve old bookmarks while using one production flow.
export default function EditorPage() { redirect("/quotes/new"); }
