import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

// Build an isolated static copy. Keep the original server routes for local work.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging = path.resolve(root, ".tools", "pages-source");
const output = path.resolve(root, "out");
for (const target of [staging, output]) {
  if (path.relative(root, target).startsWith("..") || target === root) throw new Error("Unsafe build path");
  await fs.rm(target, { recursive: true, force: true });
}
await fs.mkdir(staging, { recursive: true });
for (const item of ["app", "components", "lib", "public", "package.json", "next.config.ts", "postcss.config.mjs", "tsconfig.json"]) {
  await fs.cp(path.join(root, item), path.join(staging, item), {
    recursive: true,
    filter: source => {
      const relative = path.relative(root, source).split(path.sep).join("/");
      return relative !== "app/api" && !/^app\/(my|quotes|orders)\/\[id\](\/|$)/.test(relative) && relative !== "lib/server";
    },
  });
}
const require = createRequire(import.meta.url);
const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build", staging], {
  cwd: staging, stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: "true", NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH ?? "/sb_hackathon", NEXT_TELEMETRY_DISABLED: "1" },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
await fs.cp(path.join(staging, "out"), output, { recursive: true });
await fs.writeFile(path.join(output, ".nojekyll"), "");
console.log("GitHub Pages output: out/ (server routes and environment files excluded)");
