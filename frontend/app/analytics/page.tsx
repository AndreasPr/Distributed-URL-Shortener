'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDemoMode } from '../../lib/auth/demo-route'
import { apiClient, type Analytics, type URLEntry } from '../../lib/api'
import { designFont } from '../../lib/design-font'
import { AnalyticsResults, analyticsPrivacy } from '../../components/AnalyticsResults'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
export default function AnalyticsPage() {
  const demo = useDemoMode(), query = useSearchParams().get('code') || ''
  const [shortCode,setShortCode] = useState(query), [rows,setRows] = useState<URLEntry[]>([])
  const [data,setData] = useState<Analytics|null>(null), [loading,setLoading] = useState(false)
  const [error,setError] = useState(''), [listError,setListError] = useState('')
  const flight = useRef({generation:0})
  const load = useCallback(async (code: string) => {
    const id = ++flight.current.generation
    setShortCode(code); setLoading(true); setError(''); setData(null)
    try { const result=await apiClient.getAnalytics(code.trim()); if(id===flight.current.generation) setData(result) }
    catch(error) { if(id===flight.current.generation) setError(error instanceof Error ? error.message : 'Analytics unavailable') }
    finally { if(id===flight.current.generation) setLoading(false) }
  },[])
  async function loadList() { try { setRows(await apiClient.listUrls(100)); setListError('') } catch(error) { setListError(error instanceof Error ? error.message : 'Links unavailable') } }
  useEffect(() => { let active=true; const tracker=flight.current; void Promise.resolve().then(() => { if(active) { void loadList(); if(query) void load(query) } }); return () => { active=false; tracker.generation++ } },[query,load])
  return <main data-design="v2" className={`${designFont.variable} min-h-screen p-4 sm:p-8`}><div className="mx-auto max-w-6xl space-y-6">
    <h1 className="text-3xl font-semibold">Analytics</h1>
    <Card className="space-y-4 p-4 sm:p-6">
      <label className="block">Latest links (up to 100)<select className="mt-2 block w-full rounded border bg-background p-2" value={rows.some(row=>row.short_code===shortCode) ? shortCode : ''} onChange={e=>{if(e.target.value) void load(e.target.value)}}><option value="">Choose a link</option>{rows.map(row=><option key={row.short_code} value={row.short_code}>{row.short_code}</option>)}</select></label>
      {listError && <div role="alert"><p>{listError}</p><Button variant="outline" onClick={loadList}>Retry links</Button></div>}
      <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();if(shortCode.trim()) void load(shortCode);else setError('Please enter a short code')}}><Input className="min-w-0 flex-1" aria-label="Short code" value={shortCode} placeholder={demo?'Try sample01':'Enter short code'} onChange={e=>setShortCode(e.target.value)} /><Button disabled={loading}>Search</Button></form>
    </Card>
    {loading && <p role="status">Loading analytics…</p>}
    {error && <div role="alert"><p>{error}</p><Button onClick={()=>load(shortCode)}>Retry</Button></div>}
    {data ? <AnalyticsResults key={data.short_code} data={data} /> : <p className="text-sm text-muted-foreground">{analyticsPrivacy}</p>}
  </div></main>
}
