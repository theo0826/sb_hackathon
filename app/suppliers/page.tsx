import type { Metadata } from "next";
import SupplierList from "@/components/supplier/SupplierComparison";
export const metadata: Metadata = { title: "업체 견적 비교" };
export default function SuppliersPage() { return <SupplierList />; }
