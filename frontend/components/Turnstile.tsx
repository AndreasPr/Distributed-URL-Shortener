"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
type Widget = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Widget;
  }
}
export function Turnstile({
  nonce,
  onToken,
  action,
}: {
  nonce: string;
  action?: string;
  onToken: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!ready || !key || !ref.current || !window.turnstile) return;
    const widget = window.turnstile;
    const id = widget.render(ref.current, {
      sitekey: key,
      ...(action ? { action } : {}),
      callback: onToken,
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });
    return () => widget.remove(id);
  }, [ready, key, onToken, action]);
  if (!key)
    return (
      <p role="status">
        Security check is not configured. Email signup and recovery are
        unavailable.
      </p>
    );
  return (
    <>
      <Script
        nonce={nonce}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
      />
      <div ref={ref} role="group" aria-label="Security check" />
    </>
  );
}
