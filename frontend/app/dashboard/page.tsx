'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDemoMode } from '../../lib/auth/demo-route'
import { apiClient, type URLEntry } from '../../lib/api'
import { designFont } from '../../lib/design-font'
import { linkStats } from '../../lib/link-dates'
import { Card } from '../../components/ui/card'
import { StatCard } from '../../components/ui/stat-card'
import { Onboarding } from '../../components/Onboarding'
import ShortenForm from '../../components/ShortenForm'
import URLTable from '../../components/URLTable'
export default function DashboardPage() {
  const demo = useDemoMode()
  const [status, setStatus] = useState('Checking')
  const [urls, setUrls] = useState<URLEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now)
  const request = useRef({ generation: 0 })
  const reload = useCallback(async () => {
    const generation = ++request.current.generation
    setLoading(true); setError(null)
    try { const rows = await apiClient.listUrls(); if (generation === request.current.generation) setUrls(rows.slice(0, 20)); }
    catch (error) { if (generation === request.current.generation) setError(error instanceof Error ? error.message : 'Could not load links.'); }
    finally { if (generation === request.current.generation) { setLoading(false); setNow(Date.now()); } }
  }, [])
  useEffect(() => {
    let active = true
    const tracker = request.current
    void Promise.resolve().then(() => { if (active) void reload() })
    apiClient.getHealth().then(health => { if (active) setStatus(health.status) }).catch(() => { if (active) setStatus('Unavailable') })
    const refresh = () => { void reload() }
    window.addEventListener('links-changed', refresh)
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => { active = false; tracker.generation++; clearInterval(timer); window.removeEventListener('links-changed', refresh) }
  }, [reload])
  const stats = linkStats(urls, now)
  const subset = urls.length === 20 ? 'Latest 20 links only' : 'Across shown links only'
  return <main data-design="v2" className={`${designFont.variable} min-h-screen p-4 sm:p-8`}>
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <section aria-label="Get started" className="space-y-6"><Onboarding /><Card className="p-4 sm:p-6"><ShortenForm /></Card></section>
      <section aria-label="Link statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {([['Links shown',stats.links],['Clicks across shown links',stats.clicks],['Expiring within 7 days',stats.expiring],['Expired',stats.expired]] as const).map(([title,value]) => <StatCard key={title} title={title} value={loading ? '…' : error ? 'Unavailable' : String(value)} description={subset} />)}
      </section>
      <Card className="p-4 sm:p-6"><h2 className="mb-4 text-xl font-semibold">Recent URLs</h2><URLTable entries={urls} loading={loading} error={error} reload={() => { void reload() }} /></Card>
      <Card className="p-4"><h2 className="font-semibold">Service status</h2><p>{status}</p><p className="text-sm text-muted-foreground">Status at page load</p><Link href={demo ? '/demo/health' : '/health'} className="underline">View health</Link></Card>
    </div>
  </main>
}
