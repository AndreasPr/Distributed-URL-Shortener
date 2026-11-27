"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { APIError, realClient, type ProgrammaticKey } from "../../../lib/api";
import { designFont } from "../../../lib/design-font";
import { formatKeyDate } from "../../../lib/key-dates";
import { SettingsNav } from "../../../components/SettingsNav";
import { useWorkspaceIdentity } from "../../../components/WorkspaceIdentity";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { EmptyState } from "../../../components/ui/empty-state";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../../components/ui/dialog";

const forbidden = "Only workspace owners and admins can manage API keys. Ask an owner or admin for access.";
const scopeDescriptions = {
  read: "Read links and their click analytics without changing them.",
  write: "Read links and analytics, create links and delete links as permitted by the key owner's membership.",
  admin: "Admin keys can manage other keys and workspace links. They do not grant platform-admin access.",
};
export default function Keys() {
  const shared = useWorkspaceIdentity();
  const identity = shared?.identity;
  return <main data-design="v2" className={`${designFont.variable} mx-auto max-w-4xl space-y-6 p-4 sm:p-8`}>
    <SettingsNav />
    <h1 className="text-3xl font-semibold">Programmatic API keys</h1>
    <p>Keys are for scripts. Your browser uses your signed-in session. Only workspace admins and owners can manage keys.</p>
    {!identity ? <p role="status">{shared?.error || "Checking workspace permissions…"}</p>
      : !["owner", "admin"].includes(identity.role) ? <section aria-label="Key access"><p>{forbidden}</p></section>
      : <WorkspaceKeys key={identity.workspace_id} />}
  </main>;
}
function WorkspaceKeys() {
  const [rows, setRows] = useState<ProgrammaticKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<keyof typeof scopeDescriptions>("read");
  const [secret, setSecret] = useState("");
  const [selected, setSelected] = useState<ProgrammaticKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const generation = useRef(0);
  const createButton = useRef<HTMLButtonElement>(null);
  const revokeButton = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const reload = useCallback(async () => {
    const ticket = generation.current;
    try {
      const keys = await realClient.keys();
      if (ticket === generation.current) { setRows(keys); setError(""); }
    } catch (cause) {
      if (ticket !== generation.current) return;
      if (cause instanceof APIError && cause.status === 403) { setDenied(true); setSecret(""); }
      else setError(cause instanceof Error ? cause.message : "Keys unavailable.");
    } finally { if (ticket === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const lifecycle = generation;
    const ticket = lifecycle.current;
    void Promise.resolve().then(() => { if (ticket === lifecycle.current) void reload(); });
    const changed = () => {
      generation.current++;
      setSecret(""); setSelected(null); setCreateOpen(false); setRows([]); setLoading(true);
      void reload();
    };
    window.addEventListener("workspace-changed", changed);
    return () => { lifecycle.current++; window.removeEventListener("workspace-changed", changed); };
  }, [reload]);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const ticket = generation.current;
    setBusy(true); setActionError(""); setMessage(""); setSecret("");
    try {
      const result = await realClient.createKey(name.trim(), scope === "write" ? ["read", "write"] : [scope]);
      if (ticket !== generation.current) return;
      setSecret(result.key); setCreateOpen(false); setName(""); setCopyMessage("");
      void reload();
    } catch (cause) {
      if (ticket === generation.current) setActionError(cause instanceof Error ? cause.message : "Could not create key.");
    } finally { if (ticket === generation.current) setBusy(false); }
  }
  async function revoke() {
    if (!selected || busy) return;
    const ticket = generation.current;
    setBusy(true); setActionError("");
    try {
      await realClient.revokeKey(selected.id);
      if (ticket !== generation.current) return;
      revokeButton.current = null; // The revoked row loses its action; return focus to the list heading.
      setSelected(null); setMessage("Key revoked."); void reload();
    } catch (cause) {
      if (ticket === generation.current) setActionError(cause instanceof Error ? cause.message : "Could not revoke key.");
    } finally { if (ticket === generation.current) setBusy(false); }
  }
  async function copy() {
    const ticket = generation.current;
    try { await navigator.clipboard.writeText(secret); if (ticket === generation.current) setCopyMessage("Key copied."); }
    catch { if (ticket === generation.current) setCopyMessage("Copy failed; select the key manually."); }
  }
  if (denied) return <section aria-label="Key access"><p>{forbidden}</p></section>;
  return <div className="space-y-5">
    <Button ref={createButton} onClick={() => { setActionError(""); setScope("read"); setName(""); setCreateOpen(true); }}>Create key</Button>
    <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold">Workspace keys</h2>
    <p role="status" aria-live="polite">{message}</p>
    {loading ? <p role="status">Loading keys…</p> : error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={reload}>Retry</Button></div>
      : !rows.length ? <EmptyState title="No API keys yet" description="Create a scoped key when a script needs access to this workspace." />
      : <ul className="grid gap-4 sm:grid-cols-2">{rows.map(row => <li key={row.id} className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
        <h3 className="break-words font-semibold">{row.name}</h3>
        <p className="font-mono break-all">Prefix: {row.prefix}…</p>
        <div className="flex flex-wrap gap-2" aria-label="Scopes">{row.scopes.map(value => <Badge key={value} variant="secondary">{value}</Badge>)}</div>
        <Badge variant="outline">{row.revoked_at ? "Revoked" : "Active"}</Badge>
        <dl className="space-y-2 text-sm"><div><dt className="text-muted-foreground">Created</dt><dd>{formatKeyDate(row.created_at)}</dd></div><div><dt className="text-muted-foreground">Last used</dt><dd>{formatKeyDate(row.last_used_at)}</dd></div></dl>
        {!row.revoked_at && <Button variant="outline" aria-label={`Revoke ${row.name}`} onClick={event => { revokeButton.current=event.currentTarget; setActionError(""); setSelected(row); }}>Revoke</Button>}
      </li>)}</ul>}
    <Dialog open={createOpen} onOpenChange={open => { if (!busy) setCreateOpen(open); }}>
      <DialogContent data-design="v2" className={designFont.variable} onCloseAutoFocus={event => { event.preventDefault(); if (!secret) createButton.current?.focus(); }}>
        <DialogTitle>Create API key</DialogTitle><DialogDescription>Choose the least access your script needs. The secret is shown once.</DialogDescription>
        <form onSubmit={create} className="space-y-4">
          <label className="block" htmlFor="key-name">Key name</label><Input id="key-name" maxLength={100} required value={name} onChange={event => setName(event.target.value)} />
          <label className="block" htmlFor="key-scope">Scopes</label>
          <select id="key-scope" className="w-full rounded border bg-background p-2" aria-describedby="scope-help" value={scope} onChange={event => setScope(event.target.value as keyof typeof scopeDescriptions)}>
            <option value="read">Read</option><option value="write">Read and write</option><option value="admin">Admin</option>
          </select><p id="scope-help">{scopeDescriptions[scope]}</p>
          {actionError && <p role="alert">{actionError}</p>}
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create key"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={!!secret} onOpenChange={open => { if (!open) { setSecret(""); setCopyMessage(""); } }}>
      <DialogContent data-design="v2" className={designFont.variable} onCloseAutoFocus={event => {event.preventDefault();createButton.current?.focus();}}>
        <DialogTitle>Save your API key</DialogTitle><DialogDescription>This secret is shown once. Copy it now; it cannot be retrieved later.</DialogDescription>
        <code className="block break-all rounded border bg-muted p-3 select-all">{secret}</code>
        <p role="status" aria-live="polite">{copyMessage}</p>
        <div className="flex flex-wrap gap-2"><Button onClick={copy}>Copy key</Button><Button variant="outline" onClick={() => {setSecret("");setCopyMessage("");}}>Dismiss secret</Button></div>
      </DialogContent>
    </Dialog>
    <Dialog open={!!selected} onOpenChange={open => {if (!open && !busy) setSelected(null);}}>
      <DialogContent data-design="v2" className={designFont.variable} onCloseAutoFocus={event => {event.preventDefault();(revokeButton.current?.isConnected ? revokeButton.current : heading.current)?.focus();}}>
        <DialogTitle>Revoke API key?</DialogTitle><DialogDescription className="break-words">Revoke {selected?.name}? Scripts using this key will lose access. This cannot be undone.</DialogDescription>
        {actionError && <p role="alert">{actionError}</p>}
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => setSelected(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={revoke}>{busy ? "Revoking…" : "Confirm revoke"}</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
}
