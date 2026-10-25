// Illustrative per-garment adjustments to the short-sleeve supplier estimate.
// These choices affect pricing only, never the generated design or its geometry.
export const GARMENT_PRICING = [
  { id: "tee", label: "반팔", adjustment: 0 },
  { id: "long-sleeve", label: "긴팔", adjustment: 5000 },
  { id: "hoodie", label: "후드", adjustment: 25000 },
  { id: "sweatshirt", label: "맨투맨", adjustment: 15000 },
  { id: "varsity", label: "과잠", adjustment: 45000 },
  { id: "windbreaker", label: "바람막이", adjustment: 20000 },
  { id: "puffer", label: "패딩", adjustment: 65000 },
] as const;

export type PricingGarment = (typeof GARMENT_PRICING)[number]["id"];
export function isPricingGarment(value: unknown): value is PricingGarment {
  return GARMENT_PRICING.some(item => item.id === value);
}
export function pricingGarment(value?: PricingGarment) {
  return GARMENT_PRICING.find(item => item.id === value) || GARMENT_PRICING[0];
}
