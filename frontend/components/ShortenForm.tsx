"use client"

import React, { useState } from 'react'
import { apiClient, DEMO_MODE } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'

export default function ShortenForm() {
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')
  const [alias, setAlias] = useState('')
  const [expiry, setExpiry] = useState('')
  const [short, setShort] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setShort(null)
    setCopied(false)
    try {
      const result = await apiClient.shorten(url, alias || undefined, expiry ? new Date(expiry).toISOString() : undefined)
      setShort(result.short_code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to shorten URL')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="long-url" className="block text-sm font-medium text-slate-700 mb-2">Long URL</label>
        <Input
          id="long-url" type="url"
          maxLength={2048}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/very/long/url"
          required
        />
      </div>

      <div>
        <label htmlFor="custom-alias" className="block text-sm font-medium mb-2">Custom alias (optional)</label>
        <Input id="custom-alias" value={alias} onChange={(e) => setAlias(e.target.value)}
          minLength={3} maxLength={32} pattern={'[A-Za-z0-9_\\-]+'} placeholder="my-link" />
      </div>
      <div>
        <label htmlFor="expires-at" className="block text-sm font-medium mb-2">Expires at (optional, your local time)</label>
        <Input id="expires-at" type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
      </div>
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Shortening…' : 'Shorten'}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {short && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <div className="text-sm font-medium text-green-900 mb-2">{DEMO_MODE ? "Created in this tab only. This is not a working redirect link." : "Success!"}</div>
          <div className="text-sm text-green-800 mb-2">Short code:</div>
          <div className="text-lg font-mono font-semibold text-green-900 break-all">{short}</div>
          <button type="button" className="border rounded px-3 py-2 mt-3" onClick={async () => {
            try { await navigator.clipboard.writeText(short); setCopied(true) }
            catch { setError('Copy unavailable; select the code to copy it manually.') }
          }}>{copied ? 'Copied!' : 'Copy code'}</button>
        </div>
      )}
    </form>
  )
}
