import type { Ref } from "react";
import type { Design } from "@/lib/design";

export default function Artwork({ design, exportRef }: { design: Design; exportRef?: Ref<SVGSVGElement> }) {
  if(design.placements?.every(p=>p.content==="text")){
    const p=design.placements[0],text=p.text||design.text;
    return <svg ref={exportRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 220" role="img" aria-label={`${text} 문구 원본`} fontFamily="Arial, Malgun Gothic, sans-serif"><text x="120" y="110" textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(30,200/Math.max(1,Array.from(text).length)*1.3)} fontWeight="700" fill={p.ink||design.ink}>{text}</text></svg>;
  }
  return (
    <svg ref={exportRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 220" role="img" aria-label={`${design.text || "OUR CLUB"} ${design.style} 도안`} fontFamily="Arial, Malgun Gothic, sans-serif">
      <g transform="translate(120 105)" fill={design.ink} stroke={design.ink}>
        {design.style === "campus" && <>
          <circle r="83" fill="none" strokeWidth="2.5" /><circle r="74" fill="none" strokeWidth="1" opacity=".65" />
          <text y="-50" textAnchor="middle" fontSize="12" letterSpacing="3" stroke="none">SEONGBUK</text>
          <path d="M0 -47 L8 -28 L28 -28 L12 -15 L18 6 L0 -6 L-18 6 L-12 -15 L-28 -28 L-8 -28 Z" stroke="none" />
          <text y="38" textAnchor="middle" fontSize={design.text.length > 16 ? 13 : 20} fontWeight="700" stroke="none">{design.text || "OUR CLUB"}</text>
          <text y="59" textAnchor="middle" fontSize="9" letterSpacing="1" stroke="none">MADE FOR OUR CREW</text>
        </>}
        {design.style === "type" && <>
          <text y="3" textAnchor="middle" fontSize={design.text.length > 16 ? 16 : 27} fontWeight="700" stroke="none">{design.text || "OUR CLUB"}</text>
          <path d="M-94 20 H94" fill="none" strokeWidth="3" />
          <text y="49" textAnchor="middle" fontSize="11" letterSpacing="2" stroke="none">OUR IDEAS. OUR FIT.</text>
        </>}
        {design.style === "wave" && <>
          {[-20, 0, 20].map((y) => <path key={y} transform={`translate(0 ${y})`} d="M-80 0 Q-40 -50 0 0 T80 0" fill="none" strokeWidth="6" strokeLinecap="round" />)}
          <text y="74" textAnchor="middle" fontSize={design.text.length > 16 ? 14 : 20} fontWeight="700" stroke="none">{design.text || "OUR CLUB"}</text>
        </>}
      </g>
    </svg>
  );
}
