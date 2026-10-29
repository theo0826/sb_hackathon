import Image from "next/image";
import Artwork from "@/components/design/Artwork";
import type { LibraryItem } from "@/lib/library";

export default function LibraryThumbnail({ item }: { item: LibraryItem }) {
  const preview = item.preview || item.design.image;
  return <div className={`library-thumbnail ${item.kind}`} style={{ backgroundColor: item.design.color }}>
    {preview ? <Image src={preview} alt={item.title} width={800} height={800} unoptimized /> : <Artwork design={item.design} />}
    <span className="library-format">{item.kind === "design" ? "디자인" : item.format || "도안"}</span>
  </div>;
}
