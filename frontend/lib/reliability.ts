// One readiness flight per API origin; never replay a non-idempotent request.
export type Controls = {
  signups_enabled: boolean;
  link_creation_enabled: boolean;
  llm_enabled: boolean;
  read_only_mode: boolean;
};
export type ServiceState = {
  phase: "idle" | "connecting" | "waking" | "healthy" | "unavailable";
  health: "unknown" | "ok" | "degraded";
  controls: Controls | null;
};
let state: ServiceState = { phase: "idle", health: "unknown", controls: null };
const listeners = new Set<() => void>();
export const serviceSnapshot = () => state;
export function subscribeService(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function updateService(change: Partial<ServiceState>) {
  state = { ...state, ...change };
  listeners.forEach(listener => listener());
}
export const unavailableMessage = "The server is taking longer than expected. Please try again shortly.";
export function createReadiness(
  fetcher: typeof fetch = fetch,
  now = () => Date.now(),
  wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)),
  notify = updateService,
) {
  let ready = false;
  let flight: Promise<void> | null = null;
  return {
    reset() { ready = false; },
    ensure(base: string): Promise<void> {
      if (ready) return Promise.resolve();
      if (flight) return flight;
      flight = (async () => {
        const deadline = now() + 90000;
        notify({ phase: "connecting" });
        const timer = setTimeout(() => notify({ phase: "waking" }), 3000);
        let delay = 1000;
        try {
          while (now() < deadline) {
            try {
              const response = await fetcher(base + "/health", {
                cache: "no-store", redirect: "error",
                signal: AbortSignal.timeout(Math.max(1, Math.min(10000, deadline - now()))),
              });
              const body = await response.json();
              if (response.ok && body.status === "ok") {
                ready = true;
                notify({ phase: "healthy", health: "ok" });
                return;
              }
              notify({ health: "degraded" });
            } catch { /* All transport/provider errors stay private during warmup. */ }
            await wait(Math.max(0, Math.min(delay, deadline - now())));
            delay = Math.min(delay * 2, 10000);
          }
          notify({ phase: "unavailable", health: "degraded" });
          throw new Error(unavailableMessage);
        } finally {
          clearTimeout(timer);
          flight = null;
        }
      })();
      return flight;
    },
  };
}
const gates = new Map<string, ReturnType<typeof createReadiness>>();
export function readiness(base: string) {
  let gate = gates.get(base);
  if (!gate) { gate = createReadiness(); gates.set(base, gate); }
  return gate;
}

/** Health display accepts a real degraded body; mutation readiness still requires ok. */
export function createHealthProbe(
  fetcher: typeof fetch = fetch,
  now = () => Date.now(),
  wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)),
  notify = updateService,
) {
  return async (base: string): Promise<{ status: string; db?: string; redis: string; workers?: Record<string, { healthy?: boolean }>; migrations?: string }> => {
    const deadline = now() + 90000;
    const timer = setTimeout(() => notify({ phase: 'waking' }), 3000);
    let delay = 1000;
    try {
      while (now() < deadline) {
        try {
          const response = await fetcher(base + '/health', { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(Math.max(1, Math.min(10000, deadline - now()))) });
          const body = await response.json();
          if ((response.ok || response.status === 503) && ['ok', 'degraded'].includes(body.status) && typeof body.redis === 'string') {
            notify({ phase: body.status === 'ok' ? 'healthy' : 'idle', health: body.status });
            return body;
          }
        } catch { /* Retry transient transport/cold-start failures, never expose raw details. */ }
        await wait(Math.min(delay, Math.max(0, deadline - now()))); delay = Math.min(delay * 2, 10000);
      }
      notify({ phase: 'unavailable', health: 'degraded' });
      throw new Error(unavailableMessage);
    } finally { clearTimeout(timer); }
  };
}
export const probeHealth = createHealthProbe();
