"use client";
import { useState } from "react";
import { Button } from "./button";
export function CodeBlock({ code, title }: { code: string; title: string }) {
  const [status, setStatus] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(code); setStatus("Code copied."); }
    catch { setStatus("Copy unavailable. Select the code and copy it manually."); }
  }
  return <section className="min-w-0 rounded-lg border p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{title}</h2><Button variant="outline" onClick={copy}>Copy code</Button></div>
    <pre className="v2-code mt-3 rounded-md" tabIndex={0} aria-label={title}><code>{code}</code></pre>
    <p role="status" aria-label="Code copy status" className="mt-2 text-sm text-muted-foreground">{status}</p>
  </section>;
}
