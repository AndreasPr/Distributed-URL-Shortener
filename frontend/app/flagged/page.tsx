'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { apiClient, DEMO_MODE, FlaggedURL } from '../../lib/api'
import { Card } from '../../components/ui/card'

export default function FlaggedPage() {
  const [rows, setRows] = useState<FlaggedURL[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [offset, setOffset] = useState(0)
  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try { setRows(await apiClient.listFlagged(offset)) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load review queue') }
    finally { setBusy(false) }
  }, [offset])
  useEffect(() => { void load() }, [load])

  async function review(code: string, decision: 'allow' | 'block') {
    setBusy(true)
    setError('')
    try {
      await apiClient.reviewFlagged(code, decision)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed')
    } finally { setBusy(false) }
  }

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Flagged URLs</h1>
      <p className="mb-4">{DEMO_MODE ? 'Sample review queue; decisions stay in this tab until reload.' : 'Use an admin API key to review flagged links.'} Destinations are shown as text to avoid accidental visits.</p>
      <button disabled={busy} onClick={() => void load()} className="border rounded px-3 py-2 mb-4">Refresh</button>
      {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
      {busy && <p role="status">Loading…</p>}
      {!busy && !error && rows.length === 0 && <p>No unreviewed links on this page.</p>}
      {!error && rows.map(row => (
        <Card key={row.short_code} className="p-4 mb-4">
          <h2 className="font-bold">{row.short_code} — {row.verdict}</h2>
          <p className="break-all">{row.long_url}</p>
          <p>Risk score: {row.score.toFixed(2)} · Source: {row.source}</p>
          <ul className="list-disc pl-5">{row.reasons.map(reason => <li key={reason}>{reason.replaceAll('_', ' ')}</li>)}</ul>
          <div className="flex gap-3 mt-3">
            <button disabled={busy} className="border rounded px-3 py-2" onClick={() => void review(row.short_code, 'allow')}>Allow</button>
            <button disabled={busy} className="border rounded px-3 py-2" onClick={() => void review(row.short_code, 'block')}>Block</button>
          </div>
        </Card>
      ))}
      <div className="flex gap-3 mt-4">
        <button disabled={busy || offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</button>
        <button disabled={busy || rows.length < 50} onClick={() => setOffset(offset + 50)}>Next</button>
      </div>
    </main>
  )
}
