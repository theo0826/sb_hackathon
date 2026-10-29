import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "out");
const docs = path.join(root, "docs");
const manifest = path.join(docs, ".pages-export.json");
await fs.access(path.join(output, "index.html"));
await fs.access(path.join(output, ".nojekyll"));
if (!(await fs.lstat(docs)).isDirectory()) throw new Error("docs must be a real directory");

const entries = (await fs.readdir(output)).sort();
let previous = [];
try { previous = JSON.parse(await fs.readFile(manifest, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (!Array.isArray(previous)) throw new Error("Invalid Pages export manifest");
function target(name) {
  if (typeof name !== "string" || !name || name === "." || name === ".." || /[/\\]/.test(name)) throw new Error("Invalid export entry");
  const resolved = path.resolve(docs, name);
  if (!resolved.startsWith(docs + path.sep) || resolved === manifest) throw new Error("Unsafe export path");
  return resolved;
}
// Remove only the previous export, preserving the project's Markdown documentation.
for (const name of [...previous, ...entries]) target(name);
for (const name of entries) {
  if (previous.includes(name)) continue;
  try { await fs.lstat(target(name)); }
  catch (error) { if (error.code === "ENOENT") continue; throw error; }
  throw new Error(`Refusing to overwrite existing documentation: ${name}`);
}
for (const name of previous) await fs.rm(target(name), { recursive: true, force: true });
for (const name of entries) await fs.cp(path.join(output, name), target(name), { recursive: true });
await fs.writeFile(manifest, JSON.stringify(entries, null, 2) + "\n");
console.log("Prepared main /docs for branch-based GitHub Pages. Commit docs/ with the source changes.");
