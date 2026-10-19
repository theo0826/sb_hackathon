"use client";

type Operation = "design" | "quote";

/** Backend-owned endpoints. Never fall back to the previous personal /api integration. */
async function requestAI(operation: Operation, body: Record<string, unknown>, requestKey: string, signal?: AbortSignal) {
  const endpoint = (operation === "design" ? process.env.NEXT_PUBLIC_AI_DESIGN_URL : process.env.NEXT_PUBLIC_AI_QUOTE_URL)?.trim();
  if (!endpoint) throw new Error("AI 서버 연결을 준비 중이에요. 연결 후 다시 시도해주세요.");
  if (!/^\/(?!\/)/.test(endpoint)) {
    const url = new URL(endpoint);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("AI 서버 주소 설정을 확인해주세요.");
  }
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, requestKey }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(240_000)]) : AbortSignal.timeout(240_000),
    });
  } catch { throw new Error("AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요."); }
  let result: Record<string, unknown>;
  try {
    const value: unknown = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    result = value as Record<string, unknown>;
  } catch { throw new Error("AI 서버 응답 형식을 확인해주세요."); }
  if (!response.ok) {
    const error = new Error(typeof result.error === "string" ? result.error : "AI 요청을 완료하지 못했어요.");
    if (result.fields && typeof result.fields === "object" && !Array.isArray(result.fields)
      && Object.values(result.fields).every(value => typeof value === "string")) Object.assign(error, { fields: result.fields });
    throw error;
  }
  return result;
}

export async function generateAIDesign(body: Record<string, unknown>, requestKey: string, signal?: AbortSignal) {
  const result = await requestAI("design", body, requestKey, signal);
  return { design: result.design, reply: typeof result.reply === "string" ? result.reply : undefined };
}

export async function convertAIQuote(body: Record<string, unknown>, requestKey: string) {
  const result = await requestAI("quote", body, requestKey);
  return { quote: result.quote };
}
