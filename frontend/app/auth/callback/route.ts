import { NextRequest, NextResponse } from "next/server";
import { serverAuth } from "../../../lib/auth/server";
import { safeNext } from "../../../lib/auth/redirect";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    try {
      const { error } = await (
        await serverAuth()
      ).auth.exchangeCodeForSession(code);
      if (!error)
        return new NextResponse(null, {
          status: 303,
          headers: {
            Location: safeNext(request.nextUrl.searchParams.get("next")),
            "Cache-Control": "no-store",
          },
        });
    } catch {
      /* Never return provider bodies or credentials. */
    }
  }
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/login?error=callback", "Cache-Control": "no-store" },
  });
}
