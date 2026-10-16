import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new ApiError("서버 연결 설정이 아직 완료되지 않았어요. 관리자에게 문의해주세요.", 503);
  return value;
}
export function database() {
  const secret = required("SUPABASE_SECRET_KEY");
  if (secret.startsWith("sb_publishable_")) throw new ApiError("Supabase 공개용 키가 설정됐어요. 서버 환경변수에 비밀 키를 입력해주세요.", 503);
  return createClient(required("SUPABASE_URL"), secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
export function requireAI() {
  if (process.env.OPENAI_ENABLED !== "true") throw new ApiError("AI 생성이 현재 비활성화돼 있어요. 저장한 디자인과 제작자료는 계속 확인할 수 있어요.", 503);
  required("OPENAI_API_KEY");
}
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function owner(create = false) {
  const store = await cookies();
  const name = process.env.NODE_ENV === "production" ? "__Host-fit-session" : "fit-session";
  let token = store.get(name)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    if (!create) throw new ApiError("저장한 자료를 확인할 세션이 없어요.", 401);
    token = randomBytes(32).toString("hex");
    store.set(name, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return hash(token);
}
export async function readBody(request: Request) {
  const origin = request.headers.get("origin");
  // Next dev can normalize request.url to localhost while the browser uses 127.0.0.1.
  // Compare with the actual Host header; do not trust an arbitrary forwarded host.
  const requestURL = new URL(request.url);
  const expectedOrigin = `${requestURL.protocol}//${request.headers.get("host") || requestURL.host}`;
  if (origin && origin !== expectedOrigin) throw new ApiError("허용되지 않은 요청이에요.", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError("허용되지 않은 요청이에요.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ApiError("JSON 형식으로 요청해주세요.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("요청 정보가 필요해요.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 4_500_000) { await reader.cancel(); throw new ApiError("첨부 파일이 너무 커요.", 413); }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new ApiError("올바른 JSON 형식이 필요해요."); }
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
export function failure(error: unknown) {
  // Never relay upstream responses, credentials, prompts, or exception dumps to clients/logs.
  return json({ error: error instanceof ApiError ? error.message : "작업을 완료하지 못했어요. 잠시 후 다시 시도해주세요." }, error instanceof ApiError ? error.status : 500);
}
export function checked(error: unknown) { if (error) throw new ApiError("자료를 저장하거나 불러오지 못했어요.", 502); }
function limit(name: string, fallback: number) {
  const value = Number(process.env[name] || fallback);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 1000) : fallback;
}
export async function reserve(ownerHash: string, body: Record<string, unknown>, kind: "design" | "quote", prompt: string) {
  if (typeof body.requestKey !== "string" || !UUID.test(body.requestKey)) throw new ApiError("요청 식별자가 올바르지 않아요.");
  const { data, error } = await database().rpc("fit_reserve_job", {
    p_owner: ownerHash, p_key: body.requestKey, p_hash: hash(JSON.stringify(body)), p_kind: kind, p_prompt: prompt,
    p_daily: limit("AI_DAILY_LIMIT", 30), p_hourly: limit("AI_SESSION_HOURLY_LIMIT", 5),
  });
  if (error?.message.includes("LIMIT_REACHED")) throw new ApiError("AI 요청 한도에 도달했어요. 잠시 후 다시 이용해주세요.", 429);
  if (error?.message.includes("IDEMPOTENCY_CONFLICT")) throw new ApiError("이미 사용한 요청 식별자예요. 새 요청으로 시도해주세요.", 409);
  checked(error);
  return data as { fresh: boolean; job: { id: string; status: string; result: unknown } };
}
export function previous(job: { status: string; result: unknown }) {
  if (job.status === "completed") return json(job.result);
  throw new ApiError(job.status === "running" ? "이 요청은 이미 처리 중이에요. 잠시 후 내역을 확인해주세요." : "이전 요청이 실패했어요. 새 요청으로 다시 시도해주세요.", 409);
}
export async function finishJob(id: string, ownerHash: string, result: unknown) {
  const { error } = await database().from("fit_jobs").update({ status: "completed", result }).eq("id", id).eq("owner_hash", ownerHash);
  checked(error);
}
export async function failJob(id: string, ownerHash: string) {
  await database().from("fit_jobs").update({ status: "failed" }).eq("id", id).eq("owner_hash", ownerHash);
}
