const escapeXML=(value:string)=>value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
export function textArtworkSVG(text:string,ink:string,width=1024,height=940){
  const lines=text.split("\n"),units=(line:string)=>Array.from(line).reduce((n,c)=>n+(/[\u0000-\u007f]/.test(c)?.65:1),0);
  const font=Math.min(height/(lines.length*1.45),width*.9/Math.max(1,...lines.map(units)));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="${ink}" font-family="Arial, Malgun Gothic, sans-serif" font-weight="800" font-size="${font}" text-anchor="middle">${lines.map((line,i)=>`<text x="${width/2}" y="${height/2+(i-(lines.length-1)/2)*font*1.25}" dominant-baseline="central">${escapeXML(line)}</text>`).join("")}</g></svg>`;
}
