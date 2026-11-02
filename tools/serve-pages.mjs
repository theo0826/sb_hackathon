import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../out");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/sb_hackathon";
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".glb": "model/gltf-binary" };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === basePath && basePath) { response.writeHead(308, { Location: basePath + "/" }); response.end(); return; }
    if (!url.pathname.startsWith(basePath + "/")) throw new Error("Outside base path");
    const filePath = path.resolve(root, "." + decodeURIComponent(url.pathname.slice(basePath.length)));
    if (filePath !== root && !filePath.startsWith(root + path.sep)) throw new Error("Outside output");
    const info = await stat(filePath);
    if (info.isDirectory() && !url.pathname.endsWith("/")) { response.writeHead(308, { Location: url.pathname + "/" + url.search }); response.end(); return; }
    const file = info.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const details = await stat(file);
    response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Content-Length": details.size });
    createReadStream(file).pipe(response);
  } catch { response.writeHead(404); response.end("Not found"); }
});
server.listen(port, "127.0.0.1", () => console.log(`Pages preview: http://127.0.0.1:${port}${basePath}/`));
