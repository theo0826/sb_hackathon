import fs from "node:fs/promises";
const raw = await fs.readFile(".env.local", "utf8").catch(() => "");
const env = { ...process.env };
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (match && env[match[1]] === undefined) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
}
for (const [key, label] of [["NEXT_PUBLIC_AI_DESIGN_URL", "새 디자인 API"], ["NEXT_PUBLIC_AI_QUOTE_URL", "새 업체 변환 API"]]) {
  console.log(`${env[key] ? "설정됨" : "연결 대기"} · ${label}`);
}
console.log(`${env.LEGACY_BACKEND_ENABLED !== "true" ? "차단됨" : "확인 필요: 이전 연결 활성화됨"} · 이전 개인 백엔드`);
console.log("개인 Supabase·GPT 키는 새 프론트엔드에 사용하지 않습니다. 외부 요청·생성·DB 쓰기를 실행하지 않았습니다.");
