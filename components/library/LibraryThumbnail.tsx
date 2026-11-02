import CaptureImage from "@/components/design/CaptureImage";
import Artwork from "@/components/design/Artwork";
import type { LibraryItem } from "@/lib/library";

export default function LibraryThumbnail({ item }: { item: LibraryItem }) {
  const preview = item.preview || item.design.image;
  return <div className={`library-thumbnail ${item.kind}`}>
    {preview ? <CaptureImage src={preview} normalizeBackground={!!item.preview} alt={item.title} width={800} height={800} /> : <Artwork design={item.design} />}
    <span className="library-format">{item.kind === "design" ? "디자인" : item.format || "도안"}</span>
  </div>;
}
