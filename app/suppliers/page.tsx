import type { Metadata } from "next";
import SupplierList from "@/components/supplier/SupplierList";
export const metadata: Metadata = { title: "제작 업체 찾기" };
export default function SuppliersPage() { return <SupplierList />; }
