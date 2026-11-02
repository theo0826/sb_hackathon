import Image from "next/image";
import { publicPath } from "@/lib/deployment";

const sizes: Record<string, [number, number]> = {
  "308e7.svg":[24,24], "3e0cf.svg":[18,18], "ebe36.svg":[14,14],
  "1e784.svg":[20,32], "e88f7.svg":[26,26], "15d1c.svg":[24,24], "c304f.svg":[22,22],
  "3093c.svg":[16,16], "7262f.svg":[20,20], "d25e5.svg":[14,14], "d5d2c.svg":[15,15], "cdaee.svg":[26,26],
  "f3484.svg":[16,16], "062f7.svg":[18,18], "03f14.svg":[18,18], "751c5.svg":[18,18],
  "2717e.svg":[22,22], "c4502.svg":[22,22], "ddc2e.svg":[22,22], "23cc0.svg":[22,22],
  "8ec64.svg":[20,20], "60932.svg":[20,20], "99476.svg":[20,20], "411df.svg":[20,20],
  "bc434.svg":[20,20], "6dc1c.svg":[14,14], "8b40a.svg":[18,18], "646e5.svg":[16,16],
  "e02d5.svg":[28,28], "62b36.svg":[24,24], "a4513.svg":[14,14], "27c53.svg":[13,13],
  "11319.svg":[20,20], "1368c.svg":[18,18], "b782c.svg":[18,18], "2930d.svg":[18,18], "d1b55.svg":[16,16],
  "b683e.svg":[14,14], "cd7aa.svg":[15,15], "8a879.svg":[20,20], "24f20.svg":[14,14], "8f128.svg":[18,18],
  "b6355.svg":[13,13], "8ebb5.svg":[14,14], "d790e.svg":[24,24], "173c1.svg":[46,46], "9c640.svg":[18,18], "ddd93.svg":[18,18],
};
export default function WorkspaceAsset({ name, className = "" }: { name: string; className?: string }) {
  const [width, height] = sizes[name];
  return <Image src={publicPath(`/figma/workspace/${name}`)} alt="" width={width} height={height} className={className} unoptimized />;
}
