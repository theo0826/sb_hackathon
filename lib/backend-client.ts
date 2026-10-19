"use client";
import { useEffect, useState } from "react";
import { STATIC_SITE } from "./deployment";
export function useAIAvailability() {
  const [enabled, setEnabled] = useState<boolean | null>(STATIC_SITE ? false : null);
  useEffect(() => {
    if (STATIC_SITE) return;
    let active = true;
    void fetch("/api/status", { cache: "no-store" }).then(response => response.json()).then(result => { if (active) setEnabled(result.aiEnabled === true); }).catch(() => { if (active) setEnabled(false); });
    return () => { active = false; };
  }, []);
  return enabled;
}
export async function initializeBackendSession() {
  if (STATIC_SITE) throw new Error("이 사이트에서는 브라우저 편집과 목업 양식 변환을 이용해주세요.");
  const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "서버 연결을 확인해주세요.");
}
export async function aiRequest(url: string, body: Record<string, unknown>, requestKey: string) {
  await initializeBackendSession();
  let response: Response | undefined;
  try {
    response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, requestKey }), signal: AbortSignal.timeout(240_000) });
  } catch { /* The server may still be processing: recover the same job instead of paying twice. */ }
  if (response && response.status !== 409) {
    const result = await response.json();
    if (!response.ok) { const error = new Error(result.error || "AI 작업을 완료하지 못했어요."); Object.assign(error, { fields: result.fields }); throw error; }
    return result;
  }
  for (let attempt = 0; attempt < 60; attempt++) {
    const check = await fetch(`/api/jobs/${requestKey}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const job = await check.json();
    if (!check.ok) throw new Error(job.error || "작업 내역을 확인하지 못했어요.");
    if (job.status === "completed") return job.result;
    if (job.status === "failed") throw new Error("AI 작업이 완료되지 않았어요. 다시 시도해주세요.");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error("작업이 지연되고 있어요. 잠시 후 다시 확인해주세요.");
}
