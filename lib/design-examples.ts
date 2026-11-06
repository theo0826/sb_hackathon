import type { ClothData, Scene } from "@/components/ClothSim";
import { readyClothCapture } from "./cloth-capture";
import { isClothScene } from "./cloth-scene-session";
import { DEFAULT_DESIGN, isDesign, type Design } from "./design";
import { publicPath } from "./deployment";

export const DESIGN_EXAMPLES = [
  { id: "tee", prompt: "네이비 반팔티, 한땀대 STATISTICS 엠블럼", ink: "#fff3dc" },
  { id: "hoodie", prompt: "검정 후드티, 한땀대 CREW 엠블럼", ink: "#ffffff" },
  { id: "long-sleeve", prompt: "크림색 긴팔티, 한땀대 캠퍼스 엠블럼", ink: "#253952" },
] as const;

export type DesignExample = (typeof DESIGN_EXAMPLES)[number];
type ExampleAsset = Pick<ClothData, "front" | "back" | "category" | "tokens" | "logo"> & {
  title: string;
  color: string;
  image: string;
  meta: Scene["meta"];
};

async function fetchExampleFile(example: DesignExample, extension: "json" | "bin.gz") {
  const response = await fetch(publicPath(`/design-examples/${example.id}.${extension}`));
  if (!response.ok) throw new Error("예시 파일을 불러오지 못했어요.");
  return response;
}

async function loadExampleDesign(example: DesignExample) {
  const [asset, bin]: [ExampleAsset, ArrayBuffer] = await Promise.all([
    fetchExampleFile(example, "json").then(response => response.json()),
    fetchExampleBin(example),
  ]);
  const scene = { meta: asset.meta, bin };
  if (!isClothScene(scene)) throw new Error("예시 3D 파일을 확인해주세요.");
  const data: ClothData = {
    completed: 1,
    front: asset.front,
    back: asset.back,
    category: asset.category,
    tokens: asset.tokens,
    logo: asset.logo,
    price: null,
    text: example.prompt,
    updatedAt: new Date().toISOString(),
  };
  const design: Design = {
    ...DEFAULT_DESIGN,
    color: asset.color,
    ink: example.ink,
    text: asset.title,
    style: "type",
    side: asset.logo?.panel === "back" ? "back" : "front",
    image: asset.image,
    logoPlacement: asset.logo ?? undefined,
  };
  if (!readyClothCapture(data) || !isDesign(design)) throw new Error("예시 디자인 파일을 확인해주세요.");
  return { design, prompt: example.prompt, filename: `${asset.title}.png`, cloth: { data, scene } };
}

const examples = new Map<DesignExample["id"], ReturnType<typeof loadExampleDesign>>();

export function getExampleDesign(example: DesignExample) {
  const cached = examples.get(example.id);
  if (cached) return cached;
  const loading = loadExampleDesign(example).catch(error => {
    examples.delete(example.id);
    throw error;
  });
  examples.set(example.id, loading);
  return loading;
}

async function fetchExampleBin(example: DesignExample) {
  const response = await fetchExampleFile(example, "bin.gz");
  if (!response.body) throw new Error("예시 3D 파일을 불러오지 못했어요.");
  return new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}
