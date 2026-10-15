import { assetBytes } from "@/lib/server/assets";
import { failure, owner } from "@/lib/server/backend";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const file = await assetBytes(id, await owner());
    return new Response(new Uint8Array(file.bytes), { headers: { "Content-Type": file.type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" } });
  } catch (error) { return failure(error); }
}
