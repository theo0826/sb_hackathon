import assert from "node:assert/strict";
import { loadTS } from "./helpers/load-ts.mjs";
const client = await loadTS("lib/ai-client.ts");
const originalFetch = globalThis.fetch;
const keys = ["NEXT_PUBLIC_AI_DESIGN_URL", "NEXT_PUBLIC_AI_QUOTE_URL"];
const previous = keys.map(key => process.env[key]);
const requestKey = "11111111-1111-4111-8111-111111111111";
try {
  keys.forEach(key => delete process.env[key]);
  let calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({ design: { image: null }, reply: "new backend", quote: { id: "new quote" } }); };
  await assert.rejects(client.generateAIDesign({ prompt: "test" }, requestKey), /서버 연결을 준비/);
  assert.equal(calls.length, 0, "No fallback to personal APIs when the new backend is missing");
  process.env.NEXT_PUBLIC_AI_DESIGN_URL = "https://new-backend.example/create-design";
  process.env.NEXT_PUBLIC_AI_QUOTE_URL = "https://new-backend.example/convert-pattern";
  assert.equal((await client.generateAIDesign({ prompt: "test" }, requestKey)).reply, "new backend");
  assert.deepEqual((await client.convertAIQuote({ supplierId: "jangwi" }, requestKey)).quote, { id: "new quote" });
  assert.deepEqual(calls.map(call => call.url), keys.map(key => process.env[key]));
  assert(calls.every(call => call.options.credentials === "omit" && !call.options.headers.Authorization));
  assert(calls.every(call => JSON.parse(call.options.body).requestKey === requestKey));
  globalThis.fetch = async () => Response.json({ error: "입력을 확인해주세요", fields: { group: "단체 이름 필요" } }, { status: 422 });
  await assert.rejects(client.convertAIQuote({}, requestKey), error => error.fields.group === "단체 이름 필요");
  globalThis.fetch = async () => new Response("<html>Not found</html>", { status: 404 });
  await assert.rejects(client.generateAIDesign({}, requestKey), /응답 형식/);
  globalThis.fetch = async () => { throw new TypeError("Network error"); };
  await assert.rejects(client.generateAIDesign({}, requestKey), /연결하지 못했어요/);
  console.log("PASS new backend URLs, no personal fallback/cookies/keys, request payload, validation errors and disconnected response; no real network or AI calls");
} finally {
  globalThis.fetch = originalFetch;
  keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
}
