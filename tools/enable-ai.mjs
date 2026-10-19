import fs from "node:fs/promises";

const file = new URL("../.env.local", import.meta.url);
let source;
try {
  source = await fs.readFile(file, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  source = await fs.readFile(new URL("../.env.example", import.meta.url), "utf8");
}
const newline = source.includes("\r\n") ? "\r\n" : "\n";
source = /^\s*OPENAI_ENABLED\s*=/m.test(source)
  ? source.replace(/^[ \t]*OPENAI_ENABLED[ \t]*=[^\r\n]*/gm, "OPENAI_ENABLED=true")
  : source + `${newline}OPENAI_ENABLED=true${newline}`;
await fs.writeFile(file, source);
console.log("AI 시안 생성·업체 양식 변환을 활성화했습니다. 실행 중인 서버는 재시작해주세요.");
console.log("API 키는 서버의 .env.local에만 보관하세요. 실제 AI 요청은 실행하지 않았습니다.");
// Inspect configuration without printing secrets or making provider requests.
await import(new URL("./check-ai-readiness.mjs", import.meta.url));
