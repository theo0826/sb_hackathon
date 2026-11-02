import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "/sb_hackathon";
const root = process.argv[2] ?? "out";
for (const route of ["", "main", "design", "editor", "my", "my/detail", "orders/detail", "quotes/detail", "quotes/new", "quotes/prepare", "patterns", "suppliers"]) {
  const html = await fs.readFile(path.join(root, route, "index.html"), "utf8");
  assert(html.includes(`${base}/_next/`), `Assets should use basePath: ${route}`);
  if (["", "main", "design", "my", "quotes/prepare", "suppliers"].includes(route)) {
    assert(!html.includes('class="site-header"'), `Workspace must not render a second header: ${route}`);
  }
}
const home = await fs.readFile(path.join(root, "index.html"), "utf8");
for (const route of ["", "main", "design"]) {
  const html = await fs.readFile(path.join(root, route, "index.html"), "utf8");
  assert(html.includes('class="brand-logo"'), `Design entry must include the shared logo: ${route}`);
  for (const asset of ["symbol.svg", "wordmark.svg", "symbol-mobile.svg", "wordmark-mobile.svg"]) {
    assert(html.includes(`${base}/figma/brand/${asset}`), `Design entry must reference the published logo: ${route}/${asset}`);
    const svg = await fs.readFile(path.join(root, "figma/brand", asset), "utf8");
    assert(svg.includes("<svg"), `Published logo must be a non-empty SVG: ${asset}`);
  }
}
assert(home.includes("handdam-onboarding"), "Home should open the onboarding screen");
assert(home.includes(`href="${base}/main/"`), "Start should open the repository-prefixed main route");
assert(home.includes(`${base}/vendor/gsap-3.12.2.min.js`), "Onboarding should load local GSAP");
for (const asset of ["sweat_turn.mp4", "p_front.svg", "p_back.svg", "p_rib.svg", "p_sl1.svg", "p_sl2.svg"]) {
  assert((await fs.stat(path.join(root, "onboarding/img", asset))).size > 0, `Onboarding asset must be published: ${asset}`);
}
for (const route of ["main", "design"]) {
  const html = await fs.readFile(path.join(root, route, "index.html"), "utf8");
  assert(html.includes("handdam-studio"), `Studio should be available: ${route}`);
  assert(!html.includes('class="studio-pattern-pair"') && !html.includes('class="studio-pattern-miniature"'), `Sidebar pattern preview must be removed: ${route}`);
  assert(html.includes("로고 편집"), `Logo editing must remain available: ${route}`);
}
await fs.access(path.join(root, "models/garment-masters-v2.glb"));
await fs.access(path.join(root, ".nojekyll"));
for (const file of ["api", ".env.local", "lib", "components"]) {
  await assert.rejects(fs.access(path.join(root, file)), `Source or server data must not be published: ${file}`);
}
console.log(`PASS ${root}: static routes, repository-prefixed assets and navigation, single workspace header, model, .nojekyll, no server/source/environment output`);
