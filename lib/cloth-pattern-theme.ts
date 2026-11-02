import type { PatternTheme } from "@/components/ClothSim";

/** Figma 도안 색과 글꼴 (ClothSim 재단 도면에 넘김) */
export const CLOTH_PATTERN_THEME: PatternTheme & { background: string } = {
  background: "#f7f8fa",
  grid: "rgba(8, 35, 72, 0.025)",
  panel: "#ffffff",
  activePanel: "#ffffff",
  line: "#cbd1dc",
  label: "#5b6478",
  logoBorder: "#b3d214",
  logoBorderActive: "#b3d214",
  logoText: "#5b6478",
  fontFamily: '"Supplier Noto Sans KR", sans-serif',
  fontWeight: 500,
};
