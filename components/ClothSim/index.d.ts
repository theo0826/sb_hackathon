// ClothSim 타입 (TypeScript 프로젝트용)
import type { CSSProperties, ForwardRefExoticComponent, ReactElement, RefAttributes } from 'react';

export interface ClothSimOptions {
  strain: boolean;     // 늘어남 색
  tear: boolean;       // 원단 찢어짐
  seamTear: boolean;   // 봉제선 터짐
  push: boolean;       // 몸 점 -> 천 삼각형 충돌 (기본 켬: 점 사이 면을 몸이 뚫고 보이지 않게)
  body: boolean;       // 마네킹 보이기
  tearScale: number;   // 찢어짐 기준 배수에 곱하는 값
  speed: number;       // 화면 한 번에 계산할 프레임 수
}

/** 입히기 설정 (만들 때만 적용, 바꾸려면 다시 만듦) */
export interface DressOptions {
  /** 1단계(입히기) 사용: 중력 없이 몸 안에 들어간 천을 최소 간격 밖으로 밀어낸 뒤 중력 (기본 true) */
  dressing?: boolean;
  /** 1단계를 화면에 보여 줌. false 면 빨리 계산하고 2단계부터 보여 줌 (기본 true) */
  showDressing?: boolean;
  /** 몸과 천 최소 간격 cm (기본 0.2) */
  clearance?: number;
  /** 굽힘 강성 배수 (원단 대표값에 곱함, 기본 1) */
  bendScale?: number;
  /** 이중막: 속막이 겉막에서 최소한 떨어질 간격 비율 (처음 간격 x 이 값, 기본 0.7) */
  shellMin?: number;
  /** 1단계 최대 프레임 (기본 300) */
  dressMaxFrames?: number;
  /** 1단계 끝 기준: 한 프레임 최대 이동 cm (기본 0.01) */
  dressTol?: number;
  onDressingDone?: (info: { reason: 'converged' | 'max_frames'; frames: number; maxMovePerFrame: number | null; movePerFrameP99?: number | null }) => void;
}

export interface ClothSimStats {
  frame: number;
  seamMean: number;    // 봉제선 간격 평균 cm
  seamMax: number;
  tornEdges: number;   // 찢어진 원단 변 수
  tornSeams: number;   // 터진 봉제 점 수
  maxStretch: number;  // 가장 많이 늘어난 변 (길이 / 정지 길이)
  maxTearFrac: number; // 찢어지는 길이 대비 가장 큰 비율 (1 = 찢어짐)
  nanCount: number;
  msPerFrame: number;
  vertices: number;
  ramp: number;        // 봉제 프레임 수
}

export interface CreateClothSimParams extends Partial<ClothSimOptions>, DressOptions {
  /** scene.json, scene.bin 이 있는 폴더 주소, 또는 이미 받은 { meta, bin } */
  scene?: string | { meta: unknown; bin: ArrayBuffer | ArrayBufferView };
  /** 이미 만든 WebGPU 장치를 같이 쓸 때 (GPUDevice). 없으면 새로 만듦 */
  device?: unknown;
  autoplay?: boolean;
  look?: { background?: [number, number, number, number]; bodyColor?: string };
  offscreen?: boolean;
  onStats?: (s: ClothSimStats) => void;
  statsEvery?: number;
  onError?: (e: Error) => void;
  /** 임시: 옷에 표현할 문구 (추후 텍스처/장면 갱신용) */
  clothRepresentText?: string;
}

/** 로고 이미지 원본: 주소(data:, blob:, http), 파일, 이미지 요소, ImageBitmap */
export type LogoSource = string | Blob | HTMLImageElement | ImageBitmap;
/** 옷에 붙인 로고. panel: 패널(메쉬) 이름, x, y: 그 패널 도면 좌표 cm (y 는 아래 끝 0 에서 위로), width: 가로 cm, rotation: 도 */
export interface ClothLogo { src: LogoSource; panel?: string; x?: number; y?: number; width?: number; rotation?: number; visible?: boolean; }

export interface ClothSim {
  readonly frame: number;
  readonly playing: boolean;
  readonly options: ClothSimOptions;
  readonly lastStats: ClothSimStats | null;
  /** 1단계(입히기) 중인지 */
  readonly dressing: boolean;
  /** 다 내려앉았는지 (onSettled 가 불린 뒤 true) */
  readonly settled: boolean;
  /** 화면과 따로 앞면, 뒷면 등을 정사각 이미지로 그림 (늘어남 색 끔) */
  capture(o?: { views?: CaptureView[]; size?: number }): Promise<Partial<Record<CaptureView, ImageData>> & { settled: boolean }>;
  play(): void;
  pause(): void;
  reset(): void;
  set<K extends keyof ClothSimOptions>(name: K, value: ClothSimOptions[K]): void;
  setClothRepresentText(value: string): void;
  getClothRepresentText(): string;
  stats(): Promise<ClothSimStats>;
  step(frames?: number): Promise<ClothSimStats & { X: Float32Array }>;
  draw(): Promise<void>;
  /** 로고 붙이기 (bitmap 은 불러온 이미지). null 이면 지움 */
  setLogo(logo: (ClothLogo & { bitmap: ImageBitmap }) | null): void;
  destroy(): void;
}

export const DEFAULT_OPTIONS: ClothSimOptions;
export type CaptureView = 'front' | 'back' | 'left' | 'right';

/** 큰 카테고리 (팀 가격표 id 에 맞춤, shirt 는 추가) */
export type ClothCategoryId = 'hoodie' | 'windbreaker' | 'shirt' | 'sweatshirt' | 'long-sleeve' | 'tee';
export interface ClothCategory { id: ClothCategoryId; label: string; }
/** 옷 정보 보관함(clothData) 값. completed 0 = 만드는 중(또는 없음), 1 = 다 내려앉은 뒤 캡처 끝 */
export interface ClothData {
  completed: 0 | 1;
  /** 'data:image/jpeg;base64,...' 정사각 1024px */
  front: string | null;
  back: string | null;
  category: ClothCategory | null;
  /** 엔진이 고른 값 (경로 마지막 이름 -> 값), 예 { neck: 'hood', sleeve_length: 'long' } */
  tokens: Record<string, string | number | boolean> | null;
  logo: { panel: string; x: number; y: number; width: number; rotation: number } | null;
  /** 1벌당 제작 단가(인쇄 포함) 가격대. 결정 모델이 7개 가격대 중 가장 확률 높은 것을 고름. 실패하면 null */
  price: ClothPrice | null;
  text: string;
  updatedAt: string | null;
  /** 저장 공간이 모자라 이미지가 메모리에만 있을 때 true (새로 고치면 이미지 없음) */
  imagesInMemoryOnly?: boolean;
}
/** 가격대: label '1만원 미만' | '1~1.5만원' | '1.5~2만원' | '2~3만원' | '3~4만원' | '4~6만원' | '6만원 이상', max 는 마지막만 null */
export interface ClothPrice { label: string; min: number; max: number | null; probability: number; }
export const PRICE_BANDS: { label: string; min: number; max: number | null; text: string }[];
export function getClothData(): ClothData;
export function setClothData(next: Partial<ClothData>): ClothData;
export function updateClothData(patch: Partial<ClothData>): ClothData;
export function clearClothData(extra?: Partial<ClothData>): ClothData;
export function subscribeClothData(fn: (c: ClothData) => void): () => void;
/** React: 보관함이 바뀌면 다시 그림 */
export function useClothData(): ClothData;
export const clothData: { get(): ClothData; set(n: Partial<ClothData>): ClothData; update(p: Partial<ClothData>): ClothData; clear(e?: Partial<ClothData>): ClothData; subscribe(fn: (c: ClothData) => void): () => void; readonly completed: 0 | 1; };
export const CATEGORY_LABELS: Record<ClothCategoryId, string>;
export function tokensFromSpec(spec: unknown): Record<string, string | number | boolean>;
export function categoryFromTokens(tokens: Record<string, unknown> | null): ClothCategory | null;
export function createClothSim(canvas: HTMLCanvasElement, params: CreateClothSimParams): Promise<ClothSim>;

/** <ClothSim> 컴포넌트 속성 */
export interface ClothSimProps {
  /** scene.json, scene.bin 이 있는 폴더 주소, 또는 이미 받은 { meta, bin } */
  scene?: string | { meta: unknown; bin: ArrayBuffer | ArrayBufferView };
  /** 켜고 끄는 값 (바꾸면 바로 적용) + 입히기 설정 (만들 때만) */
  options?: Partial<ClothSimOptions> & DressOptions & Record<string, unknown>;
  autoplay?: boolean;
  look?: { background?: [number, number, number, number]; bodyColor?: string };
  onStats?: (s: ClothSimStats) => void;
  onError?: (e: Error) => void;
  onReady?: (sim: ClothSim) => void;
  /** 임시: 옷에 표현할 문구 (추후 텍스처/장면 갱신용) */
  clothRepresentText?: string;
  /** 로고 (위치까지 정한 값) */
  logo?: ClothLogo | null;
  style?: CSSProperties;
  className?: string;
}

/** ref 로 받는 조작 함수 */
export interface ClothSimHandle {
  play(): void;
  pause(): void;
  reset(): void;
  set<K extends keyof ClothSimOptions>(name: K, value: ClothSimOptions[K]): void;
  stats(): Promise<ClothSimStats | null>;
  readonly sim: ClothSim | null;
  /** 앞면, 뒷면 이미지 (ImageData) */
  captureImages?(o?: { views?: CaptureView[]; size?: number }): Promise<Partial<Record<CaptureView, ImageData>> & { settled: boolean }>;
}

/** <ClothSimView>: 장면만 보여 주기 */
export declare const ClothSimView: ForwardRefExoticComponent<ClothSimProps & RefAttributes<ClothSimHandle>>;

// ---------- 글자 -> 장면 (서버 없음, C++ 엔진 wasm + LLM) ----------

/** LLM 연결. 기본 'auto': localhost 에서는 Ollama (http://localhost:11434), 배포 사이트에서는 Cloudflare Worker (workerUrl).
 *  'api' 면 OpenAI 형식 /chat/completions, 'worker' 면 /decide (결정 모델), /generate (생성 모델) */
export interface LLMOptions {
  backend?: 'auto' | 'ollama' | 'api' | 'worker';
  /** Cloudflare Worker 주소 (backend 'worker' 또는 'auto' 의 배포 사이트) */
  workerUrl?: string;
  host?: string;        // Ollama 주소
  model?: string;       // Ollama 모델 (기본 qwen3-vl:8b-instruct)
  numCtx?: number;
  keepAlive?: string;
  timeoutMs?: number;
  baseUrl?: string;     // API 주소 (예: https://api.openai.com/v1)
  apiModel?: string;    // API 모델 이름
  apiKey?: string;      // 프론트에 넣으면 사용자에게 보임 (테스트용)
  onLog?: (line: string) => void;   // 연결 실패 기록
}
export const LLM_DEFAULTS: Required<Omit<LLMOptions, 'onLog'>>;
export interface LLM { name: string; config: LLMOptions; choose(q: unknown, signal?: AbortSignal): Promise<unknown>; generate(q: unknown, signal?: AbortSignal): Promise<unknown>; }
export function makeLLM(options?: LLMOptions): LLM;

/** 고른 토큰 묶음 (Python spec.json 과 같은 모양) */
export interface Spec { text: string; tree: string; info: Record<string, unknown>; body: Record<string, unknown>; tokens: Record<string, { value: string | number; label: string; meta: Record<string, unknown>; source: string; prob?: number; alts?: [string, number][] }>; }
export interface Scene { meta: Record<string, unknown>; bin: ArrayBuffer; }
export interface Progress { stage: 'translate' | 'choose' | 'number' | 'build' | 'done'; path?: string; count?: number; }

export function parseIntent(text: string, userFixed?: Record<string, string | number>): {
  fixed: Record<string, string | number>;
  explicit_slots: Record<string, boolean>;
};

export function specTokenRows(spec: Spec): Record<string, string | number | undefined>[];
export function logFinalSpecTokens(spec: Spec, onLine?: (line: string) => void): Record<string, string | number | undefined>[];

export function textToScene(text: string, o?: {
  llm?: LLM; onStep?: (p: Progress) => void; signal?: AbortSignal;
  fixed?: Record<string, string | number>;
  priors?: Record<string, unknown>;
  onTokenLog?: (line: string) => void;
  preprocess?: 'v1_translate_en' | 'none'; spec?: Spec;
}): Promise<{ spec: Spec; scene: Scene }>;
export function loadEngine(): Promise<unknown>;

/** <ClothSim> (기본): 글자 입력칸 + 시뮬레이션 화면 */
export interface ClothSimDesignerProps extends Omit<ClothSimProps, 'scene' | 'logo'> {
  /** 처음 보여 줄 장면 (없으면 입력을 기다림) */
  scene?: ClothSimProps['scene'];
  /** LLM 연결 설정 (기본 Ollama localhost) */
  llm?: LLMOptions;
  showInput?: boolean;
  defaultText?: string;
  placeholder?: string;
  preprocess?: 'v1_translate_en' | 'none';
  fixed?: Record<string, string | number>;
  onSpec?: (spec: Spec) => void;
  onScene?: (scene: Scene) => void;
  onLog?: (line: string) => void;
  onProgress?: (p: Progress) => void;
  /** 입력칸을 밖에 둘 때: 만들 옷 글자 (showInput={false} 와 같이) */
  clothRepresentText?: string;
  /** 밖의 전달 버튼: 이 값이 바뀔 때마다 clothRepresentText 로 새로 만듦 (onClick 에서 +1) */
  submit?: number;
  /** 로고: 이미지만 주면 앞판 가슴에 놓음, 위치까지 주면 그대로 */
  logo?: LogoSource | ClothLogo | null;
  /** 재단 도면에서 로고를 옮기거나 크기, 회전을 바꿀 때 */
  onLogoChange?: (logo: ClothLogo | null) => void;
  /** 화면 오른쪽 위 '도면 편집' 버튼 ('none' 이면 숨김) */
  patternEditor?: 'button' | 'none';
  /** 'pattern' 이면 3D 대신 재단 도면을 보여 줌 (3D 계산은 숨긴 채 유지) */
  view?: '3d' | 'pattern';
  patternFocus?: 'all' | 'front' | 'back' | 'sleeve';
}
export interface ClothSimDesignerHandle extends ClothSimHandle {
  generate(text?: string): Promise<{ spec: Spec; scene: Scene } | null>;
  cancel(): void;
  /** 로고 넣기 (이미지만 주면 앞판 가슴에) */
  setLogo(logo: LogoSource | ClothLogo | null): ClothLogo | null;
  getLogo(): ClothLogo | null;
  /** 재단 도면 편집 화면 열기, 닫기 */
  openPatternEditor(open?: boolean): void;
  /** 내려앉은 3D 장면의 앞·뒷면을 보관함에 저장. 아직 준비되지 않았으면 null */
  capture(): Promise<ClothData | null>;
  getClothData(): ClothData;
}

/** <ClothPatternEditor>: 재단 도면 위에서 로고 옮기기 (따로 배치할 때) */
export interface ClothPatternEditorProps { scene: Scene | null; logo: ClothLogo | null; onChange?: (logo: ClothLogo) => void; style?: CSSProperties; className?: string; background?: string; preview?: boolean; showGrid?: boolean; focus?: 'all' | 'front' | 'back' | 'sleeve'; }
export declare function ClothPatternEditor(props: ClothPatternEditorProps): ReactElement;
export function loadLogoBitmap(src: LogoSource): Promise<ImageBitmap | null>;
export function defaultLogoPlacement(scene: Scene, src?: LogoSource): ClothLogo | null;
declare const ClothSimDesigner: ForwardRefExoticComponent<ClothSimDesignerProps & RefAttributes<ClothSimDesignerHandle>>;
export default ClothSimDesigner;
