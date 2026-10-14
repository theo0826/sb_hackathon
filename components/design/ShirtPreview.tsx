import { LONG_SLEEVE_PATH, SHIRT_PATH, type ArtStyle, type Garment } from "@/lib/design";

export default function ShirtPreview({ color = "#253952", ink = "#e9dec2", style = "campus", text = "CAMPUS CLUB", className = "", garment = "tee" }: { color?: string; ink?: string; style?: ArtStyle; text?: string; className?: string; garment?: Garment }) {
  return (
    <svg viewBox="0 0 400 470" role="img" aria-label={`${text} 도안이 있는 반팔 티셔츠`} className={className} fontFamily="Arial, Malgun Gothic, sans-serif">
      <ellipse cx="200" cy="451" rx="98" ry="9" fill="#253952" opacity=".08" />
      <path d={garment === "tee" ? SHIRT_PATH : LONG_SLEEVE_PATH} fill={color} stroke="#1e304420" strokeWidth="2" />
      {garment === "hoodie" && <path d="M132 48 Q124 -6 200 5 Q276 -6 268 48 Q200 105 132 48" fill={color} stroke="#15243750" strokeWidth="2" />}
      {garment === "varsity" && <path d="M200 104 V426" fill="none" stroke={ink} strokeWidth="2" opacity=".3" />}
      <path d="M132 48 Q155 104 200 104 Q245 104 268 48 Q250 65 200 66 Q150 65 132 48" fill="#000" opacity=".14" />
      <path d={`M144 57 Q159 95 200 95 Q241 95 256 57 M100 412 Q200 426 300 412 ${garment === "tee" ? "M18 153 L67 181 M382 153 L333 181" : "M25 327 L74 340 M375 327 L326 340"}`} fill="none" stroke={ink} opacity=".18" strokeWidth="2" />
      <g transform="translate(200 229)" fill={ink} stroke={ink}>
        {style === "campus" && <><circle r="62" fill="none" strokeWidth="2" /><circle r="54" fill="none" opacity=".6" /><text y="-34" textAnchor="middle" fontSize="9" letterSpacing="3" stroke="none">SEONGBUK</text><path d="M0 -23 L4 -11 L17 -11 L7 -3 L11 9 L0 2 L-11 9 L-7 -3 L-17 -11 L-4 -11 Z" stroke="none" /><text y="31" textAnchor="middle" fontSize={text.length > 16 ? 11 : 15} fontWeight="800" stroke="none">{text}</text><text y="46" textAnchor="middle" fontSize="7" letterSpacing="2" stroke="none">MADE FOR OUR CREW</text></>}
        {style === "type" && <><text y="0" textAnchor="middle" fontSize={text.length > 16 ? 13 : 19} fontWeight="900" stroke="none">{text}</text><path d="M-62 14 H62" fill="none" strokeWidth="2" /><text y="32" textAnchor="middle" fontSize="8" letterSpacing="3" stroke="none">OUR IDEAS. OUR FIT.</text></>}
        {style === "wave" && <><path d="M-58 -13 Q-28 -48 0 -13 T58 -13 M-58 2 Q-28 -33 0 2 T58 2 M-58 17 Q-28 -18 0 17 T58 17" fill="none" strokeWidth="5" strokeLinecap="round" /><text y="46" textAnchor="middle" fontSize="14" fontWeight="800" stroke="none">{text}</text></>}
      </g>
    </svg>
  );
}
