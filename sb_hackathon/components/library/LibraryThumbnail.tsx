import Image from "next/image";
import Artwork from "@/components/design/Artwork";
import ShirtPreview from "@/components/design/ShirtPreview";
import type { LibraryItem } from "@/lib/library";

export default function LibraryThumbnail({ item }: { item: LibraryItem }) {
  return <div className={`library-thumbnail ${item.kind}`} style={item.preview ? undefined : { backgroundColor: item.kind === "design" ? "#eef2f7" : item.design.color }}>
    {item.preview ? <Image src={item.preview} alt={item.title} width={520} height={470} unoptimized /> : item.design.image ? <Image src={item.design.image} alt={item.title} width={800} height={800} unoptimized /> : item.kind === "design" ? <ShirtPreview color={item.design.color} ink={item.design.ink} style={item.design.style} text={item.design.text} garment={item.design.garment} /> : <Artwork design={item.design} />}
    <span className="library-format">{item.kind === "design" ? "디자인" : item.format || "도안"}</span>
  </div>;
}
