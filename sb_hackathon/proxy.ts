import { NextResponse, type NextRequest } from "next/server";

// Reject accidental deployments, public tunnel hosts, and DNS rebinding.
// TCP binding is independently restricted by the npm dev/start scripts.
export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (!/^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/i.test(host)) return new NextResponse("Local access only", { status: 403 });
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded && forwarded.toLowerCase() !== host.toLowerCase()) return new NextResponse("Local access only", { status: 403 });
  return NextResponse.next();
}
