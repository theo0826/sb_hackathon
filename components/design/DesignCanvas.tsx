"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Stage, Layer, Group, Path, Circle, Text, Rect, Line, Image as KonvaImage, Ellipse, Star } from "react-konva";
import type Konva from "konva";
import { LONG_SLEEVE_PATH, SHIRT_PATH, placementDesign, type Design, type Side } from "@/lib/design";

export type CanvasHandle = { previewPNG: (side?:Side) => string | undefined };
type Props = { design: Design; onChange: (patch: Partial<Design>) => void; exportRef: Ref<CanvasHandle>; editable?: boolean; maxHeight?: number; showArtwork?: boolean };

export default function DesignCanvas({ design, onChange, exportRef, editable = true, maxHeight = 470, showArtwork = true }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);
  const [width, setWidth] = useState(520);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, entry.contentRect.width)));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!design.image) return;
    let active = true;
    const nextImage = new window.Image();
    nextImage.onload = () => { if (active) setImage(nextImage); };
    nextImage.src = design.image;
    return () => { active = false; };
  }, [design.image]);

  const height = Math.min(width, maxHeight);
  const ratio = height / 520;
  const horizontalOffset = (width - height) / 2;
  const layers = design.placements ? design.placements.filter(p=>p.side===design.side).map(p=>({design:placementDesign(design,p),content:p.content,text:p.text,ink:p.ink})) : [{design,content:"artwork",text:design.text,ink:design.ink}];
  const activeImage = image && image.src === (design.image ? new URL(design.image, window.location.href).href : null) ? image : null;
  const imageRatio = activeImage ? Math.min(180 / activeImage.width, 160 / activeImage.height) : 1;
  useImperativeHandle(exportRef, () => ({
    previewPNG: (side) => (side && side!==design.side) || (design.image && !activeImage) ? undefined : stage.current?.toDataURL({ x: horizontalOffset, y: 0, width: height, height, pixelRatio: 1040 / height }),
  }), [height, horizontalOffset, design.side, design.image, activeImage]);

  return (
    <div ref={host} className="canvas-host" role="group" tabIndex={editable ? 0 : -1}
      aria-label={showArtwork ? `${design.side === "front" ? "앞면" : "뒷면"}의 ${design.text} 도안.${editable ? " 도안을 드래그하거나 방향키로 이동하세요." : " 배치 확인용 미리보기."}` : "선택한 의류의 빈 미리보기. 하단 입력창에서 디자인을 요청하세요."}
      onKeyDown={(event) => {
        const direction: Record<string, [number, number]> = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] };
        const delta = editable ? direction[event.key] : undefined;
        if (delta) {
          event.preventDefault();
          onChange({ x: Math.max(160, Math.min(360, design.x + delta[0])), y: Math.max(165, Math.min(375, design.y + delta[1])) });
        }
      }}>
      <Stage ref={stage} width={width} height={height} x={horizontalOffset} scaleX={ratio} scaleY={ratio}>
        <Layer>
          <Rect x={-horizontalOffset / ratio} width={width / ratio} height={520} fill="#f5f5f7" />
          <Ellipse x={260} y={480} radiusX={104} radiusY={9} fill="#253952" opacity={.08} />
          <Group x={60} y={12} listening={false}>
            <Path data={design.garment && design.garment !== "tee" ? LONG_SLEEVE_PATH : SHIRT_PATH} fill={design.color} stroke="#15243730" strokeWidth={1.5} shadowColor="#253952" shadowBlur={22} shadowOpacity={.12} shadowOffsetY={16} />
            {design.garment === "hoodie" && <><Path data="M132 48 Q124 -6 200 5 Q276 -6 268 48 Q200 105 132 48" fill={design.color} stroke="#15243750" strokeWidth={2} /><Line points={[184, 95, 180, 140]} stroke={design.ink} opacity={.3} strokeWidth={2} /><Line points={[216, 95, 220, 140]} stroke={design.ink} opacity={.3} strokeWidth={2} /></>}
            {design.garment === "varsity" && <><Line points={[200, 104, 200, 425]} stroke={design.ink} opacity={.2} strokeWidth={2} />{[125, 185, 245, 305, 365].map((y) => <Circle key={y} x={200} y={y} radius={3} fill={design.ink} opacity={.5} />)}</>}
            {design.side === "front" ? <Path data="M132 48 Q155 104 200 104 Q245 104 268 48 Q250 65 200 66 Q150 65 132 48" fill="#000" opacity={.15} /> : <Path data="M132 48 Q200 82 268 48" stroke="#000" opacity={.17} strokeWidth={7} />}
            <Path data={`M144 57 Q159 95 200 95 Q241 95 256 57 M100 412 Q200 426 300 412 ${design.garment && design.garment !== "tee" ? "M25 327 L74 340 M375 327 L326 340" : "M18 153 L67 181 M382 153 L333 181"}`} stroke={design.ink} opacity={.15} strokeWidth={2} />
            <Path data="M107 153 Q118 285 108 407 M293 153 Q282 285 292 407" stroke="#000" opacity={.05} strokeWidth={7} />
          </Group>
          {showArtwork && <Group clipX={168} clipY={155} clipWidth={184} clipHeight={265}>
            {layers.map(({design,content,text,ink},index)=><Group key={index} x={design.x} y={design.y} scaleX={.68*design.scale/100} scaleY={.68*design.scale/100} rotation={design.rotation}
              draggable={editable} listening={editable} onDragEnd={(event) => onChange({ x: event.target.x(), y: event.target.y() })}
              dragBoundFunc={(position) => ({ x: Math.max(horizontalOffset + 160 * ratio, Math.min(horizontalOffset + 360 * ratio, position.x)), y: Math.max(165 * ratio, Math.min(375 * ratio, position.y)) })}>
              <Rect x={-100} y={-92} width={200} height={184} fill="transparent" />
              {content==="text" ? <Text x={-100} y={-22} width={200} text={text || design.text} align="center" fontStyle="bold" fontSize={24} fill={ink || design.ink}/> : activeImage ? <KonvaImage image={activeImage} x={-activeImage.width * imageRatio / 2} y={-activeImage.height * imageRatio / 2} width={activeImage.width * imageRatio} height={activeImage.height * imageRatio} /> : <>
                {design.style === "campus" && <>
                  <Circle radius={83} stroke={design.ink} strokeWidth={2.5} />
                  <Circle radius={74} stroke={design.ink} strokeWidth={1} opacity={.65} />
                  <Text x={-90} y={-62} width={180} align="center" text="SEONGBUK" fontSize={12} letterSpacing={3} fill={design.ink} />
                  <Star x={0} y={-19} numPoints={5} innerRadius={13} outerRadius={28} fill={design.ink} />
                  <Text x={-98} y={20} width={196} align="center" text={design.text || "OUR CLUB"} fontFamily="Arial, Malgun Gothic" fontSize={design.text.length > 16 ? 13 : 20} fontStyle="bold" fill={design.ink} />
                  <Text x={-90} y={50} width={180} align="center" text="MADE FOR OUR CREW" fontSize={9} letterSpacing={1} fill={design.ink} />
                </>}
                {design.style === "type" && <>
                  <Text x={-100} y={-20} width={200} align="center" text={design.text || "OUR CLUB"} fontSize={design.text.length > 16 ? 16 : 27} fontStyle="bold" fill={design.ink} />
                  <Line points={[-94, 20, 94, 20]} stroke={design.ink} strokeWidth={3} />
                  <Text x={-100} y={38} width={200} align="center" text="OUR IDEAS. OUR FIT." fontSize={11} letterSpacing={2} fill={design.ink} />
                </>}
                {design.style === "wave" && <>
                  {[-20, 0, 20].map((y) => <Path key={y} y={y} data="M-80 0 Q-40 -50 0 0 T80 0" stroke={design.ink} strokeWidth={6} lineCap="round" />)}
                  <Text x={-100} y={55} width={200} align="center" text={design.text || "OUR CLUB"} fontSize={design.text.length > 16 ? 14 : 20} fontStyle="bold" fill={design.ink} />
                </>}
              </>}
            </Group>)}
          </Group>}
        </Layer>
      </Stage>
    </div>
  );
}
