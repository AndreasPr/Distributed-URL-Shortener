"use client";
import { useEffect, useState } from "react";
import { realClient, Workspace } from "../lib/api";
export function WorkspaceSwitcher() {
  const [rows, setRows] = useState<Workspace[]>([]);
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([realClient.me(), realClient.workspaces()])
      .then(([me, rows]) => {
        setRows(rows);
        setCurrent(me.workspace_id);
        realClient.setWorkspace(me.workspace_id);
      })
      .catch((error) => setError(error.message));
  }, []);
  async function switchTo(id: string) {
    setBusy(true);
    setError("");
    const previous = current;
    realClient.setWorkspace(id);
    try {
      await realClient.me();
      setCurrent(id);
      window.dispatchEvent(new Event("workspace-changed"));
    } catch (error) {
      realClient.setWorkspace(previous);
      setError(
        error instanceof Error ? error.message : "Workspace unavailable",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-48">
      <label className="sr-only" htmlFor="workspace">
        Workspace
      </label>
      <select
        className="w-full rounded border bg-background p-2"
        id="workspace"
        disabled={busy}
        value={current}
        onChange={(e) => switchTo(e.target.value)}
      >
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
