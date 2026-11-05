"use client";
import { useEffect, useState } from "react";
import { realClient, ProgrammaticKey } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
export default function Keys() {
  const [rows, setRows] = useState<ProgrammaticKey[]>([]);
  const [name, setName] = useState("");
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [scope, setScope] = useState("read");
  const reload = () =>
    realClient
      .keys()
      .then(setRows)
      .catch((error) => setMessage(error.message));
  useEffect(() => {
    reload();
    const change = () => {
      setRows([]);
      setSecret("");
      reload();
    };
    window.addEventListener("workspace-changed", change);
    return () => window.removeEventListener("workspace-changed", change);
  }, []);
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="text-3xl font-semibold">Programmatic API keys</h1>
      <p>
        Keys are for scripts. Your browser uses your signed-in session. Only
        workspace admins and owners can manage keys.
      </p>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setMessage("");
          setSecret("");
          try {
            const key = await realClient.createKey(
              name,
              scope === "write" ? ["read", "write"] : [scope],
            );
            setSecret(key.key);
            setName("");
            await reload();
          } catch (error) {
            setMessage((error as Error).message);
          }
        }}
      >
        <label htmlFor="key-name">Key name</label>
        <Input
          id="key-name"
          maxLength={100}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="key-scope">Scopes</label>
        <select
          className="block rounded border p-2 bg-background"
          id="key-scope"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="read">Read</option>
          <option value="write">Read and write</option>
          <option value="admin">Admin</option>
        </select>
        <Button>Create key</Button>
      </form>
      {secret && (
        <section aria-label="New key" className="rounded border p-4 space-y-3">
          <p>Copy this key now. It cannot be retrieved later.</p>
          <code className="break-all">{secret}</code>
          <div className="flex gap-3">
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(secret);
                  setMessage("Key copied.");
                } catch {
                  setMessage("Copy failed; select the key manually.");
                }
              }}
            >
              Copy key
            </Button>
            <Button variant="outline" onClick={() => setSecret("")}>
              Dismiss secret
            </Button>
          </div>
        </section>
      )}
      <p role="status">{message}</p>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3">
            <span>
              {row.name} ({row.prefix}…) —{" "}
              {row.revoked_at ? "Revoked" : row.scopes.join(", ")}
            </span>
            {!row.revoked_at && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await realClient.revokeKey(row.id);
                    await reload();
                  } catch (error) {
                    setMessage((error as Error).message);
                  }
                }}
              >
                Revoke {row.name}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
