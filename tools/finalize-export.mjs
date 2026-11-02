import { rm, writeFile } from "node:fs/promises";

// GitHub Pages must serve Next.js's _next assets without running Jekyll.
await writeFile(new URL("../out/.nojekyll", import.meta.url), "");

// Use GitHub's normal 404 response, without an exported custom error page.
await rm(new URL("../out/404.html", import.meta.url), { force: true });
await rm(new URL("../out/404/", import.meta.url), { recursive: true, force: true });
