/** Prefer the direct API origin until the deployed /s proxy passes its smoke check. */
export function shortLink(code: string): string {
  const base = process.env.NEXT_PUBLIC_SHORT_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
  return base ? `${base.replace(/\/$/, "")}/${encodeURIComponent(code)}` : code;
}

export async function proxyShort(code: string): Promise<Response> {
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(code)) return new Response(null, { status: 404 });
  try {
    const origin = new URL(process.env.API_ORIGIN || "");
    if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash ||
        (origin.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && origin.protocol === "http:"))) {
      return new Response(null, { status: 503 });
    }
    const upstream = await fetch(`${origin.origin}/${encodeURIComponent(code)}`, {
      redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(10000),
      // Never forward browser credentials, cookies or spoofable forwarded-IP headers.
    });
    const headers = new Headers({ "Cache-Control": "no-store" });
    const location = upstream.headers.get("Location");
    if (location) headers.set("Location", location);
    const retry = upstream.headers.get("Retry-After");
    if (retry) headers.set("Retry-After", retry);
    await upstream.body?.cancel();
    return new Response(null, { status: upstream.status, headers });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
