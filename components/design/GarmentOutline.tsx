import { SHIRT_PATH } from "@/lib/design";
import { useId } from "react";

/** An empty-state illustration, never a substitute for the generated garment. */
export default function GarmentOutline({ back = false, className = "", shimmer = false }: { back?: boolean; className?: string; shimmer?: boolean }) {
  const id = useId().replaceAll(":", "");
  if (shimmer) {
    const path = "M79.2102 12.4878L37.5831 29.1386L6.36274 79.0912L37.5831 97.8234L52.1526 79.0912V245.6H197.848V79.0912L212.417 97.8234L243.637 79.0912L212.417 29.1386L170.79 12.4878C164.546 24.9759 145.814 37.4641 125 37.4641C104.187 37.4641 85.4543 24.9759 79.2102 12.4878Z";
    return <svg className={`studio-garment-outline ${className}`} width="250" height="258.088" viewBox="0 0 250 258.088" fill="none" aria-hidden="true"><defs><linearGradient id={`${id}-base`}><stop stopColor="#e9ecf0"/><stop offset=".45" stopColor="#f7f8fa"/><stop offset=".55" stopColor="#f1f6d6"/><stop offset="1" stopColor="#e9ecf0"/></linearGradient><clipPath id={`${id}-clip`}><path d={path}/></clipPath><linearGradient id={`${id}-light`}><stop stopColor="white" stopOpacity="0"/><stop offset=".5" stopColor="white" stopOpacity=".8"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient></defs><path d={path} fill={`url(#${id}-base)`} stroke="#d5dae2" strokeWidth="1.66509" strokeLinejoin="round" strokeDasharray="6 6"/><g clipPath={`url(#${id}-clip)`}><rect className="studio-loading-sheen" x="-240" width="120" height="258.088" fill={`url(#${id}-light)`}/></g></svg>;
  }
  return <svg className={`studio-garment-outline ${className}`} width="300" height="350" viewBox="0 0 400 470" fill="none" aria-hidden="true">
    <path d={SHIRT_PATH} fill="currentColor" stroke="var(--studio-outline, #c4cddd)" strokeWidth="2.5" strokeLinejoin="round"/>
    <path d={back ? "M145 56 Q200 79 255 56" : "M135 51 Q151 104 200 104 Q249 104 265 51"} stroke="var(--studio-outline, #c4cddd)" strokeWidth="2.5" />
  </svg>;
}
