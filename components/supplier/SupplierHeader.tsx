import BrandLogo from "@/components/layout/BrandLogo";
import AccountMenu from "@/components/layout/AccountMenu";

export default function SupplierHeader() {
  return <header className="supplier-header"><BrandLogo/><div className="supplier-header-actions"><AccountMenu/></div></header>;
}
