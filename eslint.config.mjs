import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Public files include vendored GSAP and generated body data, not lint targets.
  globalIgnores([".next/**", "out/**", ".tools/**", "public/**", "next-env.d.ts"]),
]);
