// Never decode a destination into an authority, backslash or control character.
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return "/dashboard";
  try {
    const decoded = decodeURIComponent(value);
    if (/[\\\x00-\x20]/.test(decoded) || decoded.startsWith("//"))
      return "/dashboard";
    const url = new URL(value, "https://relaymark.invalid");
    if (
      url.origin !== "https://relaymark.invalid" ||
      url.pathname.startsWith("/auth/") ||
      url.pathname === "/login"
    )
      return "/dashboard";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/dashboard";
  }
}
