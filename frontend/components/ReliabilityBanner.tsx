"use client";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { realClient } from "../lib/api";
import { Controls, serviceSnapshot, subscribeService, updateService } from "../lib/reliability";

export function ReliabilityBanner() {
  const path = usePathname();
  const demo = path === "/demo" || path.startsWith("/demo/");
  const state = useSyncExternalStore(subscribeService, serviceSnapshot, serviceSnapshot);
  useEffect(() => {
    if (demo || !process.env.NEXT_PUBLIC_API_URL) return;
    let active = true;
    async function poll() {
      if (document.visibilityState === "hidden") return;
      try {
        const health = await realClient.getHealth();
        const controls = await realClient.request<Controls>("/status", {}, false);
        if (active) updateService({ health: health.status === "ok" ? "ok" : "degraded", controls });
      } catch { if (active) updateService({ health: "degraded" }); }
    }
    void poll();
    const timer = setInterval(() => { void poll(); }, 60000);
    return () => { active = false; clearInterval(timer); };
  }, [demo]);
  if (demo || !process.env.NEXT_PUBLIC_API_URL) return null;
  const messages = [];
  if (state.phase === "waking") messages.push("Waking up the free-tier server, this takes up to about a minute");
  if (state.phase === "unavailable") messages.push("The server is taking longer than expected. Please try again shortly.");
  if (state.controls?.read_only_mode) messages.push("Read-only mode: changes are paused. Existing links still work.");
  if (state.controls?.signups_enabled === false) messages.push("New account signup is temporarily disabled.");
  if (state.controls?.link_creation_enabled === false) messages.push("Link creation is temporarily disabled.");
  if (state.controls?.llm_enabled === false) messages.push("AI checks are paused; heuristic safety checks remain active.");
  return <aside aria-label="Service status" className="border-b bg-muted px-4 py-2 text-sm text-foreground">
    <span className="rounded border px-2 py-1">Server: {state.phase === "waking" || state.phase === "connecting" ? "connecting" : state.health === "ok" ? "healthy" : state.health === "degraded" ? "degraded" : "checking"}</span>
    <div role="status" aria-live="polite">{messages.map(message => <p key={message}>{message}</p>)}</div>
  </aside>;
}
