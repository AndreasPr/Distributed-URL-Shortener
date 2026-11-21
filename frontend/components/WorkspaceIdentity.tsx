"use client";
import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { realClient, type Identity } from "../lib/api";

type State = { identity: Identity | null; error: string; refresh: () => Promise<Identity> };
const Context = createContext<State | null>(null);
/** Shell-only, in-memory identity. The switcher and navigation share one initial /me. */
export function WorkspaceIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [error, setError] = useState("");
  const initial = useRef<Promise<Identity> | null>(null);
  async function refresh() {
    try {
      const me = await realClient.me();
      setIdentity(me);
      setError("");
      return me;
    } catch (cause) {
      setIdentity(previous => previous ? { ...previous, platform_admin: false } : null); // Keep the prior workspace selectable; fail closed for privileged navigation.
      setError(cause instanceof Error ? cause.message : "Workspace unavailable");
      throw cause;
    }
  }
  useEffect(() => {
    let active = true;
    initial.current ??= realClient.me();
    initial.current.then(me => {
      if (!active) return;
      realClient.setWorkspace(me.workspace_id);
      setIdentity(me);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Workspace unavailable"); });
    return () => { active = false; };
  }, []);
  return <Context.Provider value={{ identity, error, refresh }}>{children}</Context.Provider>;
}
export function useWorkspaceIdentity() { return useContext(Context); }
