"use client";
import { useEffect, useState } from "react";
import { displayName } from "../../lib/auth/display-name";
import { browserAuth, signOut } from "../../lib/auth/browser";
import { realClient, Identity } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
export default function Account() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [identityFailed, setIdentityFailed] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const local = process.env.NEXT_PUBLIC_LOCAL_AUTH === "true";
  useEffect(() => {
    realClient
      .me()
      .then(setIdentity)
      .catch((error) => { setIdentityFailed(true); setMessage(error.message); });
    if (!local)
      browserAuth()
        .auth.getUser()
        .then(({ data }) => {
          setName(displayName(data.user?.user_metadata));
          setEmail(data.user?.email || "");
        });
  }, [local]);
  async function logout(global: boolean) {
    try {
      if (local) {
        setMessage(
          "LocalAuth is an automatic demo login. Stop the isolated demo to end access.",
        );
        return;
      }
      await signOut(global ? "global" : "local");
      location.assign(new URL("/login", location.origin).href);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  return (
    <main className="mx-auto max-w-2xl p-8 space-y-6">
      <h1 className="text-3xl font-semibold">Account</h1>
      <p>
        {email} · {identity?.role} ·{" "}
        {identity ? (identity.email_verified ? "Email verified" : "Email not verified") : (identityFailed ? "Verification status unavailable — cannot reach the API." : "Checking email verification…")}
      </p>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const { error } = await browserAuth().auth.updateUser({
              data: { display_name: name },
            });
            if (error) throw new Error("Profile update failed.");
            setMessage("Profile saved. Display names never grant permissions.");
          } catch (error) {
            setMessage((error as Error).message);
          }
        }}
      >
        <label htmlFor="display-name">Display name</label>
        <Input
          id="display-name"
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={local}
        />
        <Button disabled={local}>Save profile</Button>
      </form>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => logout(false)}>Sign out</Button>
        <Button variant="outline" onClick={() => logout(true)}>
          Sign out everywhere
        </Button>
      </div>
      <p>
        Global sign-out revokes refresh sessions. Already issued access tokens
        can remain valid until expiry.
      </p>
      <section className="border rounded p-4 space-y-3">
        <h2 className="text-xl font-semibold">Delete application account</h2>
        <p>
          Deactivates your Relaymark account and revokes your keys. Shared
          workspace links remain. Transfer ownership first if you are a
          workspace’s last owner. Your Supabase identity is not deleted.
        </p>
        <label htmlFor="delete-confirmation">Type DELETE to confirm</label>
        <Input
          id="delete-confirmation"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <Button
          variant="destructive"
          disabled={confirmation !== "DELETE"}
          onClick={async () => {
            try {
              await realClient.deleteAccount();
              if (!local) await signOut("global");
              location.assign(new URL("/login", location.origin).href);
            } catch (error) {
              setMessage((error as Error).message);
            }
          }}
        >
          Delete account
        </Button>
      </section>
      <p role="status">{message}</p>
    </main>
  );
}
