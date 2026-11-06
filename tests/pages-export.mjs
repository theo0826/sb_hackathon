import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { loadTS } from "./helpers/load-ts.mjs";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "/sb_hackathon";
const root = process.argv[2] ?? "out";
const routes = ["", "main", "design", "editor", "my", "my/detail", "orders", "orders/detail", "quotes/detail", "quotes/new", "quotes/prepare", "patterns", "suppliers"];
let checkedLinks = 0;
for (const route of routes) {
  const html = await fs.readFile(path.join(root, route, "index.html"), "utf8");
  assert(html.includes(`${base}/_next/`), `Assets should use basePath: ${route}`);
  // Check actual exported files, including redirect destinations and public assets.
  const pageURL = new URL(`${base}/${route ? route + "/" : ""}`, "https://pages.test");
  for (const match of html.matchAll(/(?:src|href|poster)="([^"]+)"/g)) {
    const url = new URL(match[1].replaceAll("&amp;", "&"), pageURL);
    if (url.origin !== pageURL.origin) continue;
    assert(url.pathname.startsWith(`${base}/`), `URL escaped repository prefix: ${route}: ${url.pathname}`);
    const relative = decodeURIComponent(url.pathname.slice(base.length + 1));
    const target = path.resolve(root, relative);
    assert(target.startsWith(path.resolve(root) + path.sep) || target === path.resolve(root), "URL escaped output directory");
    const info = await fs.stat(target);
    if (info.isDirectory()) await fs.access(path.join(target, "index.html"));
    checkedLinks++;
  }
  if (["", "main", "design", "my", "quotes/prepare", "suppliers"].includes(route)) {
    assert(!html.includes('class="site-header"'), `Workspace must not render a second header: ${route}`);
  }
}
const home = await fs.readFile(path.join(root, "index.html"), "utf8");
for (const route of ["", "main", "design"]) {
  const html = await fs.readFile(path.join(root, route, "index.html"), "utf8");
  assert(html.includes('class="brand-logo"'), `Design entry must include the shared logo: ${route}`);
  for (const asset of ["symbol.svg", "wordmark.svg", "symbol-mobile.svg", "wordmark-mobile.svg"]) {
    assert(html.includes(`${base}/ui/brand/${asset}`), `Design entry must reference the published logo: ${route}/${asset}`);
    const svg = await fs.readFile(path.join(root, "ui/brand", asset), "utf8");
    assert(svg.includes("<svg"), `Published logo must be a non-empty SVG: ${asset}`);
  }
}
assert(home.includes("handdam-onboarding"), "Home should open the onboarding screen");
assert(home.includes(`href="${base}/main/"`), "Start should open the repository-prefixed main route");
assert(home.includes(`${base}/vendor/gsap-3.12.2.min.js`), "Onboarding should load local GSAP");
for (const asset of ["sweat_turn.mp4", "p_front.svg", "p_back.svg", "p_rib.svg", "p_sl1.svg", "p_sl2.svg"]) {
  assert((await fs.stat(path.join(root, "onboarding/img", asset))).size > 0, `Onboarding asset must be published: ${asset}`);
}
const { DESIGN_EXAMPLES } = await loadTS("lib/design-examples.ts");
for (const { id } of DESIGN_EXAMPLES) {
  for (const extension of ["json", "bin.gz"]) {
    const asset = `${id}.${extension}`;
    assert((await fs.stat(path.join(root, "design-examples", asset))).size > 0, `Design example asset must be published: ${asset}`);
  }
}
for (const route of ["main", "design"]) {
  const html = await fs.readFile(path.join(root, route, "index.html"), "utf8");
  assert(html.includes("handdam-studio"), `Studio should be available: ${route}`);
  assert(!html.includes('class="studio-pattern-pair"') && !html.includes('class="studio-pattern-miniature"'), `Sidebar pattern preview must be removed: ${route}`);
  assert(html.includes("로고 편집"), `Logo editing must remain available: ${route}`);
}
// Body assets are provided by the backend team and must remain byte-identical.
for (const name of await fs.readdir("public/cloth-bodies")) {
  const expected = await fs.readFile(path.join("public/cloth-bodies", name));
  const actual = await fs.readFile(path.join(root, "cloth-bodies", name));
  assert(expected.equals(actual), `Body asset changed during export: ${name}`);
}
await fs.access(path.join(root, ".nojekyll"));
for (const file of ["api", ".env.local", ".git", "lib", "components", "docs", "figma", "models", "previews", "404.html", "404"]) {
  await assert.rejects(fs.access(path.join(root, file)), `Source or server data must not be published: ${file}`);
}
const { detailHref } = await loadTS("lib/deployment.ts");
for (const section of ["my", "quotes", "orders"]) {
  assert.equal(detailHref(section, "demo /?한땀"), `/${section}/detail?id=${encodeURIComponent("demo /?한땀")}`);
}
console.log(`PASS ${root}: ${routes.length} static routes, ${checkedLinks} local asset/navigation references, encoded detail URLs, unchanged body assets, .nojekyll, no server/source/environment output`);
