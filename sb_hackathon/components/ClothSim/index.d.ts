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
  scene: string | { meta: unknown; bin: ArrayBuffer | ArrayBufferView };
  /** 이미 만든 WebGPU 장치를 같이 쓸 때 (GPUDevice). 없으면 새로 만듦 */
  device?: any;
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
  scene: string | { meta: unknown; bin: ArrayBuffer | ArrayBufferView };
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

declare const ClothSimView: ForwardRefExoticComponent<ClothSimProps & RefAttributes<ClothSimHandle>>;
export default ClothSimView;
