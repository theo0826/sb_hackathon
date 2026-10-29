import Image from "next/image";
import { publicPath } from "@/lib/deployment";

const sizes = {
  "cb3ac.svg": [17, 17], "50916.svg": [27, 27], "912f3.svg": [14, 14], "0ebe2.svg": [14, 14],
  "39bc0.svg": [14, 14], "7d1d6.svg": [34, 34], "efaf9.svg": [16, 16], "35511.svg": [18, 4],
  "9c237.svg": [14, 14], "fcf03.svg": [20, 20], "5fcd1.svg": [32, 32], "8452a.svg": [18, 18],
  "6f425.svg": [12, 12], "1a599.svg": [14.5, 3.5],
} as const;
export default function SupplierAsset({ name, className = "" }: { name: keyof typeof sizes; className?: string }) {
  const [width, height] = sizes[name];
  return <Image src={publicPath(`/figma/suppliers/${name}`)} alt="" width={width} height={height} className={className} unoptimized />;
}
