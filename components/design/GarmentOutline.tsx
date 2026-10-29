import { SHIRT_PATH } from "@/lib/design";
import { useId } from "react";

/** An empty-state illustration, never a substitute for the generated garment. */
export default function GarmentOutline({ back = false, className = "", shimmer = false }: { back?: boolean; className?: string; shimmer?: boolean }) {
  const id = useId().replaceAll(":", "");
  return <svg className={`studio-garment-outline ${className}`} width="300" height="350" viewBox="0 0 400 470" fill="none" aria-hidden="true">
    <path d={SHIRT_PATH} fill="currentColor" stroke="var(--studio-outline, #c4cddd)" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray={shimmer ? "6 6" : undefined}/>
    <path d={back ? "M145 56 Q200 79 255 56" : "M135 51 Q151 104 200 104 Q249 104 265 51"} stroke="var(--studio-outline, #c4cddd)" strokeWidth="2.5" />
    {shimmer && <><defs><clipPath id={`${id}-clip`}><path d={SHIRT_PATH}/></clipPath><linearGradient id={`${id}-light`}><stop stopColor="#d9ed9b" stopOpacity="0"/><stop offset=".38" stopColor="#e7f3c2" stopOpacity=".32"/><stop offset=".5" stopColor="white" stopOpacity=".8"/><stop offset=".62" stopColor="#e5f3ba" stopOpacity=".36"/><stop offset="1" stopColor="#d9ed9b" stopOpacity="0"/></linearGradient></defs><g clipPath={`url(#${id}-clip)`}><rect x="160" width="100" height="470" fill={`url(#${id}-light)`} opacity=".25"/><rect className="studio-loading-sheen" x="-240" width="240" height="470" fill={`url(#${id}-light)`}/></g></>}
  </svg>;
}
