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
console.log(`${env.NEXT_PUBLIC_CLOTH_WORKER_URL ? "설정됨" : "팀 기본 URL 사용"} · ClothSim Worker`);
console.log("구형 개인 서버 코드는 제거되었습니다. 외부 요청·생성·DB 쓰기를 실행하지 않았습니다.");
