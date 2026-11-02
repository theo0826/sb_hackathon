"use client";
import { usePathname } from "next/navigation";
import BrandLogo from "./BrandLogo";
import AccountMenu from "./AccountMenu";
import SupplierHeader from "@/components/supplier/SupplierHeader";
export default function Header() {
  const pathname = usePathname().replace(/\/+$/, "") || "/";
  if (["/my", "/quotes/prepare", "/", "/main", "/design", "/suppliers"].includes(pathname)) return null;
  if (pathname === "/quotes/new") return <SupplierHeader/>;
  return <header className="site-header"><div className="header-inner"><BrandLogo/><AccountMenu/></div></header>;
}
