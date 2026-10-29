import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "/sb_hackathon";
for (const route of ["", "design", "editor", "my", "my/detail", "orders/detail", "quotes/detail", "quotes/new", "quotes/prepare", "patterns", "suppliers"]) {
  const html = await fs.readFile(path.join("out", route, "index.html"), "utf8");
  assert(html.includes(`${base}/_next/`), `Assets should use basePath: ${route}`);
}
const home = await fs.readFile("out/index.html", "utf8");
assert(home.includes("handdam-studio"), "Home should open the design studio directly");
assert(home.includes(`href="${base}/my/"`), "The studio should link to the repository-prefixed library route");
await fs.access("out/models/garment-masters-v2.glb");
await fs.access("out/.nojekyll");
for (const file of ["api", ".env.local", "lib", "components"]) {
  await assert.rejects(fs.access(path.join("out", file)), `Source or server data must not be published: ${file}`);
}
console.log("PASS static routes, repository-prefixed assets and navigation, model, .nojekyll, no server/source/environment output");
