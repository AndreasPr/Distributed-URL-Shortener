"use client";
import { useEffect, useState } from "react";
import { displayName } from "../../lib/auth/display-name";
import { browserAuth, signOut } from "../../lib/auth/browser";
import { realClient } from "../../lib/api";
import { designFont } from "../../lib/design-font";
import { useWorkspaceIdentity } from "../../components/WorkspaceIdentity";
import { SettingsNav } from "../../components/SettingsNav";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "../../components/ui/dialog";

export default function Account() {
  const shared = useWorkspaceIdentity();
  const identity = shared?.identity;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [globalOpen, setGlobalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const local = process.env.NEXT_PUBLIC_LOCAL_AUTH === "true";
  useEffect(() => {
    let active = true;
    if (!local) browserAuth().auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error) { setMessage("Profile unavailable. Please retry."); return; }
      setName(displayName(data.user?.user_metadata));
      setEmail(data.user?.email || "");
    }).catch(() => { if (active) setMessage("Profile unavailable. Please retry."); });
    return () => { active = false; };
  }, [local]);
  async function exportData() {
    try {
      const data = await realClient.request<unknown>("/me/export");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = "relaymark-data.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Your export has been downloaded.");
    } catch (error) { setMessage((error as Error).message); }
  }
  async function logout(global: boolean) {
    setBusy(true);
    try {
      if (local) {
        setMessage("LocalAuth is an automatic demo login. Stop the isolated demo to end access.");
        return;
      }
      await signOut(global ? "global" : "local");
      location.assign(new URL("/login", location.origin).href);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); setGlobalOpen(false); }
  }
  return <main data-design="v2" className={`${designFont.variable} mx-auto max-w-3xl p-4 sm:p-8 space-y-6`}>
    <SettingsNav />
    <h1 className="text-3xl font-semibold">Account</h1>
    <p role="status" aria-live="polite">{message || shared?.error}</p>
    <section aria-labelledby="profile-title" className="rounded-xl border bg-card p-5 space-y-4">
      <h2 id="profile-title" className="text-xl font-semibold">Profile</h2>
      <p className="break-all">{email} · {identity?.role} · {identity ? (identity.email_verified ? "Email verified" : "Email not verified") : (shared?.error ? "Verification status unavailable — cannot reach the API." : "Checking email verification…")}</p>
      <form className="space-y-3" onSubmit={async event => {
        event.preventDefault();
        try {
          const { error } = await browserAuth().auth.updateUser({ data: { display_name: name } });
          if (error) throw new Error("Profile update failed.");
          setMessage("Profile saved. Display names never grant permissions.");
        } catch (error) { setMessage((error as Error).message); }
      }}>
        <label htmlFor="display-name">Display name</label>
        <Input id="display-name" maxLength={200} value={name} onChange={event => setName(event.target.value)} disabled={local} />
        <Button disabled={local}>Save profile</Button>
      </form>
    </section>
    <section aria-labelledby="export-title" className="rounded-xl border bg-card p-5 space-y-3">
      <h2 id="export-title" className="text-xl font-semibold">Data export</h2>
      <p>Download your application data as JSON.</p><Button onClick={exportData}>Export my data</Button>
    </section>
    <section aria-labelledby="sessions-title" className="rounded-xl border bg-card p-5 space-y-3">
      <h2 id="sessions-title" className="text-xl font-semibold">Sessions</h2>
      <p>Global sign-out revokes refresh sessions. Already issued access tokens can remain valid until expiry.</p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={() => logout(false)}>Sign out</Button>
        <Dialog open={globalOpen} onOpenChange={open => {if (!busy) setGlobalOpen(open);}}>
          <DialogTrigger asChild><Button variant="outline" disabled={busy}>Sign out everywhere</Button></DialogTrigger>
          <DialogContent data-design="v2" className={designFont.variable}>
            <DialogTitle>Sign out everywhere?</DialogTitle>
            <DialogDescription>Global sign-out revokes refresh sessions. Already issued access tokens can remain valid until expiry.</DialogDescription>
            <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => setGlobalOpen(false)}>Cancel</Button><Button disabled={busy} onClick={() => logout(true)}>{busy ? "Signing out…" : "Confirm sign out everywhere"}</Button></div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
    <section aria-labelledby="danger-title" className="rounded-xl border border-destructive bg-card p-5 space-y-3">
      <h2 id="danger-title" className="text-xl font-semibold">Danger zone</h2>
      <h3 className="font-semibold">Delete application account</h3>
      <p>Disables your Relaymark account, owned links and keys immediately.
        Your profile and links are purged after 30 days when cleanup runs.
        Transfer ownership first if you are the last owner of a shared workspace. Your Supabase identity is not deleted.</p>
      <label htmlFor="delete-confirmation">Type DELETE to confirm</label>
      <Input id="delete-confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} />
      <Button variant="destructive" disabled={confirmation !== "DELETE"} onClick={async () => {
        try {
          await realClient.deleteAccount();
          if (!local) await signOut("global");
          location.assign(new URL("/login", location.origin).href);
        } catch (error) { setMessage((error as Error).message); }
      }}>Delete account</Button>
    </section>
  </main>;
}
