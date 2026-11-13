"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Turnstile } from "./Turnstile";

const base = process.env.NEXT_PUBLIC_API_URL || "";
const reasons: Record<string, string> = {
  public_report: "Someone reported this link for review.",
  homoglyph: "The host contains characters resembling other letters.",
  punycode: "The host uses an internationalized domain name.",
  mixed_script: "The host mixes writing systems.",
  brand_subdomain: "A subdomain resembles a brand name.",
  credential_path: "The path uses account or password-related words.",
  suspicious_tld: "The domain ending is on the project's caution list.",
  deep_subdomains: "The host has unusually many subdomains.",
  random_label: "Part of the host looks randomly generated.",
  base64_query: "The query contains a long encoded value.",
  shortener_chain: "The destination appears to be another shortener.",
  ip_literal: "The destination uses an IP address instead of a domain name.",
  long_url: "The destination URL is unusually long.",
  many_digits: "The destination contains many digits.",
  many_specials: "The destination contains many special characters.",
};
async function publicRequest(path: string, body?: unknown) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "omit",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error(`Too many requests. Retry after ${response.headers.get("Retry-After") || "60"} seconds.`);
    if (response.status === 451) throw new Error("This link is blocked. You cannot continue.");
    if (response.status === 404 || response.status === 410) throw new Error("This link is unavailable or expired.");
    throw new Error("Unable to complete this request. Please retry the security check.");
  }
  return response.json();
}
export function WarningPage({ code }: { code: string }) {
  const [data, setData] = useState<{host: string; reasons: string[]} | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    publicRequest(`/warnings/${encodeURIComponent(code)}`).then(value => { if (active) setData(value); }).catch(() => { if (active) setError("This link is unavailable, expired or blocked."); });
    return () => { active = false; };
  }, [code]);
  async function proceed() {
    setBusy(true);
    try {
      const result = await publicRequest(`/warnings/${encodeURIComponent(code)}/continue`, {});
      const destination = new URL(result.redirect_url);
      if (!["https:", "http:"].includes(destination.protocol) || destination.username || destination.password) throw new Error("Invalid destination");
      window.location.assign(destination.href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to continue");
      setBusy(false);
    }
  }
  return <main className="mx-auto max-w-xl space-y-4 p-8">
    <h1 className="text-2xl font-bold">Review this destination</h1>
    <p>This link is suspicious and may be unsafe. A warning is not a claim that the destination is safe.</p>
    {error && <p role="alert">{error}</p>}
    {data && <><p>Destination host: <strong className="break-all">{data.host}</strong></p>
      <ul className="list-disc pl-6">{data.reasons.map(reason => <li key={reason}>{reasons[reason] || "Automated checks could not establish confidence in this destination."}</li>)}</ul>
      <Button disabled={busy || !!error} onClick={proceed}>Continue</Button></>}
    <Link href="/" className="ml-4 underline">Go back</Link>
    <p><Link href={`/report/${encodeURIComponent(code)}`} className="underline">Report this link</Link></p>
  </main>;
}
export function ReportPage({ code, nonce }: { code: string; nonce: string }) {
  const [token, setToken] = useState("");
  const onToken = useCallback((value: string) => setToken(value), []);
  const [category, setCategory] = useState("phishing");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [widget, setWidget] = useState(0);
  return <main className="mx-auto max-w-xl space-y-4 p-8"><h1 className="text-2xl font-bold">Report a link</h1>
    <p>No account is required. Do not submit passwords or personal information.</p>
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setMessage("");
      try { await publicRequest("/reports", { short_code: code, category, captcha_token: token }); setMessage("Report received. It is queued for review."); }
      catch (cause) { setMessage(cause instanceof Error ? cause.message : "Report failed"); }
      finally { setBusy(false); setToken(""); setWidget(value => value + 1); }
    }}>
      <label className="block">Reason<select className="ml-3 rounded border p-2" value={category} onChange={event => setCategory(event.target.value)}>
        <option value="phishing">Phishing</option><option value="malware">Malware</option><option value="spam">Spam</option><option value="other">Other abuse</option>
      </select></label>
      <Turnstile key={widget} nonce={nonce} onToken={onToken} action="report" />
      <Button type="submit" disabled={!token || busy}>Submit report</Button>
    </form><p role="status">{message}</p><Link className="underline" href="/abuse">Abuse contact and policy</Link>
  </main>;
}

export function ReportEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return <form className="flex flex-wrap gap-3" onSubmit={event => {
    event.preventDefault();
    if (/^[A-Za-z0-9_-]{1,32}$/.test(code)) router.push(`/report/${encodeURIComponent(code)}`);
  }}><label>Short code <input className="rounded border p-2" required pattern="[A-Za-z0-9_-]{1,32}" maxLength={32} value={code} onChange={event => setCode(event.target.value)} /></label><Button type="submit">Report a link</Button></form>;
}
