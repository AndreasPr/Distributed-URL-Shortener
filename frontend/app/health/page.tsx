'use client';
import { useEffect, useState } from 'react';
import { apiClient, type HealthResponse } from '../../lib/api';
import type { Controls } from '../../lib/reliability';
import { designFont } from '../../lib/design-font';
import { Button } from '../../components/ui/button';
export default function HealthPage() {
  const [health,setHealth] = useState<HealthResponse | null>(null), [controls,setControls] = useState<Controls | null>(null);
  const [error,setError] = useState(''), [loading,setLoading] = useState(true), [attempt,setAttempt] = useState(0);
  useEffect(() => {
    let active=true;
    async function load() {
      try {
        const result = await apiClient.getHealth();
        if(active) setHealth(result);
        const settings = await apiClient.getControls();
        if(active) setControls(settings);
      } catch(cause) { if(active) setError(cause instanceof Error ? cause.message : 'Status unavailable.'); }
      finally { if(active) setLoading(false); }
    }
    void load(); return () => { active=false; };
  },[attempt]);
  const workers = health?.workers ? Object.values(health.workers) : [];
  return <main data-design="v2" className={`${designFont.variable} p-4 sm:p-8`}><section className="mx-auto max-w-4xl space-y-5">
    <h1 className="text-3xl font-semibold">System Health</h1><p>Status at page load.</p>
    {loading && <p role="status">Checking service status…</p>}
    {error && <div role="alert"><p>{error}</p><Button onClick={() => {setError('');setLoading(true);setAttempt(value=>value+1);}}>Retry</Button></div>}
    {health && <dl className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
      {Object.entries({API:health.status,Database:health.db ?? 'unknown',Redis:health.redis,'Background workers':workers.length ? workers.every(worker=>worker.healthy) ? 'ready' : 'not ready' : 'not reported','Migrations':health.migrations ?? 'not reported'}).map(([label,value])=><div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>)}
    </dl>}
    {controls && <section className="rounded-xl border bg-card p-5 space-y-2"><h2 className="text-xl font-semibold">Current controls</h2>
      <p>Signups: {controls.signups_enabled ? 'enabled' : 'paused'}</p><p>Link creation: {controls.link_creation_enabled ? 'enabled' : 'paused'}</p><p>LLM checks: {controls.llm_enabled ? 'enabled' : 'paused'}</p><p>Read-only mode: {controls.read_only_mode ? 'on' : 'off'}</p>
    </section>}
  </section></main>;
}
