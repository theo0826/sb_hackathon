/** assets/bodies → public/cloth-bodies (Turbopack/SMB에서 import() 대신 fetch 로 제공) */
import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "components", "ClothSim", "anny", "assets", "bodies");
const dest = path.join(root, "public", "cloth-bodies");

if (!fs.existsSync(src)) {
  console.error("sync-cloth-bodies: source missing:", src);
  process.exit(1);
}
fs.mkdirSync(dest, { recursive: true });
let n = 0;
for (const name of fs.readdirSync(src)) {
  if (!name.startsWith("anny_") || !name.endsWith(".js")) continue;
  fs.copyFileSync(path.join(src, name), path.join(dest, name));
  n++;
}
console.log(`sync-cloth-bodies: ${n} files → public/cloth-bodies/`);
