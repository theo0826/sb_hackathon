import type { Metadata } from "next";
import DesignStudio from "@/components/design/DesignStudio";

export const metadata: Metadata = { title: "단체티 만들기" };

export default function DesignPage() {
  return <DesignStudio />;
}
