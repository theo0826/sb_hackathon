"use client";
import { COLORS, defaultClubPlacements, type Design, type PrintPlacement } from "@/lib/design";
export default function DesignSettings({design,onChange,disabled}:{design:Design;onChange:(patch:Partial<Design>)=>void;disabled:boolean}) {
  function place(position:"chest"|"front"|"back"|"both"){
    const chest=defaultClubPlacements()[0],back=defaultClubPlacements()[1];
    const placements:PrintPlacement[]=position==="both"?[chest,back]:[position==="chest"?chest:position==="back"?back:{...back,id:"front-main",side:"front"}];
    onChange({placements:placements.map(p=>({...p,content:"artwork"})),side:placements[0].side});
  }
  return <details className="design-settings"><summary>티셔츠 색상·로고 위치</summary><fieldset disabled={disabled}>
    <label>티셔츠 색상<input type="color" aria-label="티셔츠 색상" value={design.color} onChange={e=>onChange({color:e.target.value})}/></label>
    <div className="simple-logo-options" role="group" aria-label="티셔츠 색상 선택">{COLORS.map(color=><button key={color.hex} type="button" className="text-link" aria-pressed={design.color===color.hex} onClick={()=>onChange({color:color.hex})}>{color.name}</button>)}</div>
    <div className="simple-logo-options" role="group" aria-label="로고 위치">{([['chest','왼쪽 가슴'],['front','앞면 중앙'],['back','등판'],['both','가슴 + 등판']] as const).map(([value,label])=><button className="outline" key={value} type="button" onClick={()=>place(value)}>{label}</button>)}</div>
    {design.placements?.map(p=><label className="simple-logo-size" key={p.id}>{p.side==="front"?"앞면":"등판"} 로고 크기 <input type="range" aria-label={`${p.id} 로고 크기`} min={2} max={30} step={1} value={p.widthCm} onChange={e=>onChange({placements:design.placements?.map(item=>item.id===p.id?{...item,widthCm:Number(e.target.value),heightCm:Number(e.target.value)}:item)})}/>{p.widthCm}cm</label>)}
  </fieldset></details>;
}
