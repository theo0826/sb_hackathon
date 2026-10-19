// ClothSim 타입 (TypeScript 프로젝트용)
import type { CSSProperties, ForwardRefExoticComponent, RefAttributes } from 'react';

export interface ClothSimOptions {
  strain: boolean;     // 늘어남 색
  tear: boolean;       // 원단 찢어짐
  seamTear: boolean;   // 봉제선 터짐
  push: boolean;       // 손가락 충돌
  body: boolean;       // 마네킹 보이기
  tearScale: number;   // 찢어짐 기준 배수에 곱하는 값
  speed: number;       // 화면 한 번에 계산할 프레임 수
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

export interface CreateClothSimParams extends Partial<ClothSimOptions> {
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

export interface ClothSim {
  readonly frame: number;
  readonly playing: boolean;
  readonly options: ClothSimOptions;
  readonly lastStats: ClothSimStats | null;
  play(): void;
  pause(): void;
  reset(): void;
  set<K extends keyof ClothSimOptions>(name: K, value: ClothSimOptions[K]): void;
  setClothRepresentText(value: string): void;
  getClothRepresentText(): string;
  stats(): Promise<ClothSimStats>;
  step(frames?: number): Promise<ClothSimStats & { X: Float32Array }>;
  draw(): Promise<void>;
  destroy(): void;
}

export const DEFAULT_OPTIONS: ClothSimOptions;
export function createClothSim(canvas: HTMLCanvasElement, params: CreateClothSimParams): Promise<ClothSim>;

/** <ClothSim> 컴포넌트 속성 */
export interface ClothSimProps {
  /** scene.json, scene.bin 이 있는 폴더 주소, 또는 이미 받은 { meta, bin } */
  scene?: string | { meta: unknown; bin: ArrayBuffer | ArrayBufferView };
  /** 켜고 끄는 값. 바꾸면 바로 적용 (다시 만들지 않음) */
  options?: Partial<ClothSimOptions>;
  autoplay?: boolean;
  look?: { background?: [number, number, number, number]; bodyColor?: string };
  onStats?: (s: ClothSimStats) => void;
  onError?: (e: Error) => void;
  onReady?: (sim: ClothSim) => void;
  /** 임시: 옷에 표현할 문구 (추후 텍스처/장면 갱신용) */
  clothRepresentText?: string;
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
}

/** <ClothSimView>: 장면만 보여 주기 */
export declare const ClothSimView: ForwardRefExoticComponent<ClothSimProps & RefAttributes<ClothSimHandle>>;

// ---------- 글자 -> 장면 (서버 없음, C++ 엔진 wasm + LLM) ----------

/** LLM 연결. 기본 Ollama (http://localhost:11434). backend 'api' 면 OpenAI 형식 /chat/completions */
export interface LLMOptions {
  backend?: 'ollama' | 'api';
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
export interface ClothSimDesignerProps extends Omit<ClothSimProps, 'scene'> {
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
}
export interface ClothSimDesignerHandle extends ClothSimHandle {
  generate(text?: string): Promise<{ spec: Spec; scene: Scene } | null>;
  cancel(): void;
}
declare const ClothSimDesigner: ForwardRefExoticComponent<ClothSimDesignerProps & RefAttributes<ClothSimDesignerHandle>>;
export default ClothSimDesigner;
