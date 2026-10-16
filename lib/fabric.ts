import type { Design } from "./design";
export function fabricSVG(design: Design) {
  const f=design.fabric, color=design.color, other=f?.secondaryColor || color, density=f?.density || 6, step=512/density;
  const pattern=f?.pattern || "solid";
  let content=`<rect width="512" height="512" fill="${color}"/>`;
  if(pattern==="gradient")content=`<defs><linearGradient id="fade" x2="0" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="${other}"/></linearGradient></defs><rect width="512" height="512" fill="url(#fade)"/>`;
  if(["stripes","hoops","diagonal"].includes(pattern)){
    const bars=Array.from({length:density*3},(_,i)=>`<rect x="${(i-density)*step}" y="-512" width="${step*.42}" height="1536" fill="${other}"/>`).join("");
    content+=`<g transform="rotate(${pattern==="hoops"?90:pattern==="diagonal"?35:0} 256 256)">${bars}</g>`;
  }
  if(pattern==="checker")for(let y=0;y<density;y++)for(let x=0;x<density;x++)if((x+y)%2===0)content+=`<rect x="${x*step}" y="${y*step}" width="${step}" height="${step}" fill="${other}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${content}</svg>`;
}
export const fabricURL=(design:Design)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(fabricSVG(design))}`;
