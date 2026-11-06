import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeNext } from "./lib/auth/redirect";
export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const api = new URL(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  ).origin;
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : "";
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src 'self' ${api} ${supabase} https://challenges.cloudflare.com${process.env.NODE_ENV === "development" ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  let response = NextResponse.next({ request: { headers } });
  const path = request.nextUrl.pathname;
  const protectedRoute = [
    "/dashboard",
    "/analytics",
    "/flagged",
    "/settings",
    "/health",
    "/api-keys",
    "/account",
    "/app",
  ].some((p) => path === p || path.startsWith(p + "/"));
  const local =
    process.env.NEXT_PUBLIC_LOCAL_AUTH === "true" &&
    process.env.VERCEL_ENV !== "production";
  let authenticated = local;
  if (
    !local &&
    supabase &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    (protectedRoute || path === "/login")
  ) {
    const client = createServerClient(
      supabase,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (values) => {
            values.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            headers.set("cookie", request.cookies.toString());
            response = NextResponse.next({ request: { headers } });
            values.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    try {
      const { data, error } = await client.auth.getUser();
      authenticated = !error && !!data.user;
    } catch {
      authenticated = false;
    }
  }
  // Use the request Host, never X-Forwarded-Host; Next normalizes loopback URLs.
  const origin = new URL(request.url);
  const host = request.headers.get("host");
  if (host && /^[a-zA-Z0-9.:[\]-]+$/.test(host)) origin.host = host;
  let destination: URL | undefined;
  if (protectedRoute && !authenticated) {
    destination = new URL("/login", origin);
    destination.searchParams.set(
      "next",
      safeNext(path + request.nextUrl.search),
    );
  } else if (path === "/login" && authenticated)
    destination = new URL("/dashboard", origin);
  if (destination) {
    const redirected = NextResponse.redirect(destination);
    response.cookies
      .getAll()
      .forEach((cookie) => redirected.cookies.set(cookie));
    response = redirected;
  }
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|architecture.svg|opengraph-image).*)",
  ],
};
