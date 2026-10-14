import { DEFAULT_DESIGN, isDesign, mockDesign } from "@/lib/design";

// 실제 AI 호출 전, 프론트엔드 요청/응답을 확인하는 테스트용 API입니다.
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "올바른 JSON 형식으로 요청해주세요." }, { status: 400 }); }
  const prompt = body && typeof body === "object" && "prompt" in body ? body.prompt : null;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 300) {
    return Response.json({ error: "디자인 설명을 1~300자로 입력해주세요." }, { status: 400 });
  }
  const current = body && typeof body === "object" && "currentDesign" in body ? body.currentDesign : DEFAULT_DESIGN;
  if (!isDesign(current)) return Response.json({ error: "현재 디자인 정보가 올바르지 않아요." }, { status: 400 });
  const design = { ...current, ...mockDesign(prompt.trim(), current) };
  return Response.json({ mode: "mock", status: "completed", design, reply: "요청한 방향으로 예시 디자인을 준비했어요. 추가로 바꾸고 싶은 내용을 아래에 이어서 말해주세요." });
}
