import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "/sb_hackathon";
const root = process.argv[2] ?? "out";
for (const route of ["", "design", "editor", "my", "my/detail", "orders/detail", "quotes/detail", "quotes/new", "quotes/prepare", "patterns", "suppliers"]) {
  const html = await fs.readFile(path.join(root, route, "index.html"), "utf8");
  assert(html.includes(`${base}/_next/`), `Assets should use basePath: ${route}`);
  if (["", "design", "my", "quotes/prepare", "suppliers"].includes(route)) {
    assert(!html.includes('class="site-header"'), `Workspace must not render a second header: ${route}`);
  }
}
const home = await fs.readFile(path.join(root, "index.html"), "utf8");
assert(home.includes("handdam-studio"), "Home should open the design studio directly");
assert(home.includes(`href="${base}/my/"`), "The studio should link to the repository-prefixed library route");
await fs.access(path.join(root, "models/garment-masters-v2.glb"));
await fs.access(path.join(root, ".nojekyll"));
for (const file of ["api", ".env.local", "lib", "components"]) {
  await assert.rejects(fs.access(path.join(root, file)), `Source or server data must not be published: ${file}`);
}
console.log(`PASS ${root}: static routes, repository-prefixed assets and navigation, single workspace header, model, .nojekyll, no server/source/environment output`);
