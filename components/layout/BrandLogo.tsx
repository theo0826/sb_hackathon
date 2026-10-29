import Image from "next/image";
import Link from "next/link";
import { publicPath } from "@/lib/deployment";

/** The lockup used in Figma's design-screen header (533:89). */
export default function BrandLogo() {
  return <Link href="/" className="brand-logo" aria-label="한땀 홈">
    <span className="brand-logo-desktop" aria-hidden="true">
      <Image src={publicPath("/figma/brand/symbol.svg")} alt="" width={33.1004} height={26} unoptimized/>
      <Image src={publicPath("/figma/brand/wordmark.svg")} alt="" width={46.2222} height={24.7619} unoptimized/>
    </span>
    <span className="brand-logo-mobile" aria-hidden="true">
      <Image src={publicPath("/figma/brand/symbol-mobile.svg")} alt="" width={25.4618} height={20} unoptimized/>
      <Image src={publicPath("/figma/brand/wordmark-mobile.svg")} alt="" width={35.5556} height={19.0476} unoptimized/>
    </span>
  </Link>;
}
