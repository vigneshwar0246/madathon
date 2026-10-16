import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const site = request.headers.get("sec-fetch-site");
    const contentType = request.headers.get("content-type") ?? "";
    let originMatches = !origin;
    if (origin) {
      try { originMatches = new URL(origin).host === request.headers.get("host"); }
      catch { originMatches = false; }
    }
    if (!originMatches || site === "cross-site" || !contentType.startsWith("application/json")) {
      return NextResponse.json({ error: "Invalid request origin or content type" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
  }
  return updateSession(request);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
