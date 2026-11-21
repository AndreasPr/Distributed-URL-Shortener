"use client";
import { useEffect, useState } from "react";
import { useWorkspaceIdentity } from "./WorkspaceIdentity";
import { realClient, Workspace } from "../lib/api";
export function WorkspaceSwitcher() {
  const [rows, setRows] = useState<Workspace[]>([]);
  const shared = useWorkspaceIdentity();
  const current = shared?.identity?.workspace_id ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    realClient.workspaces().then(rows => { if (active) setRows(rows); })
      .catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, []);
  async function switchTo(id: string) {
    setBusy(true);
    setError("");
    const previous = current;
    realClient.setWorkspace(id);
    try {
      await shared?.refresh();
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
        disabled={busy || !current}
        value={current}
        onChange={(e) => switchTo(e.target.value)}
      >
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
      {(error || shared?.error) && (
        <p role="alert" className="text-xs">
          {error || shared?.error}
        </p>
      )}
    </div>
  );
}
