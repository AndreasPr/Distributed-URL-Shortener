"use client"

import { useDemoMode } from '../lib/auth/demo-route'
import React, { useState } from 'react'
import { shortLink } from '../lib/short-link'
import { apiClient } from '../lib/api'
import { useWorkspaceIdentity } from './WorkspaceIdentity'
import { Button } from './ui/button'
import { Input } from './ui/input'

export default function ShortenForm() {
  const demo = useDemoMode()
  const shared = useWorkspaceIdentity()
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')
  const [alias, setAlias] = useState('')
  const [expiry, setExpiry] = useState('')
  const [short, setShort] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (expiry && (!Number.isFinite(Date.parse(expiry)) || Date.parse(expiry) <= Date.now())) { setError('Expiry must be in the future.'); return }
    setLoading(true)
    setError(null)
    setShort(null)
    setCopied(false)
    try {
      const result = await apiClient.shorten(url, alias || undefined, expiry ? new Date(expiry).toISOString() : undefined)
      setShort(result.short_code)
      window.dispatchEvent(new CustomEvent('onboarding', { detail: 'create' }))
      window.dispatchEvent(new Event('links-changed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to shorten URL')
    } finally {
      setLoading(false)
    }
  }

  if (!demo && !shared?.identity) return <p role="status">Checking workspace permissions…</p>
  if (!demo && shared?.identity?.role === 'viewer') return <p role="status">This workspace is read-only for viewers. You can view links and analytics.</p>
  return (
    <form id="create-link" onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="long-url" className="block text-sm font-medium text-foreground mb-2">Long URL</label>
        <Input
          id="long-url" type="url"
          maxLength={2048}
          aria-describedby={error ? 'shorten-error' : undefined}
          onInvalid={event => { event.preventDefault(); setError('Enter a valid URL, at most 2048 characters.'); }}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/very/long/url"
          required
        />
      </div>

      <div>
        <label htmlFor="custom-alias" className="block text-sm font-medium mb-2">Custom alias (optional)</label>
        <Input id="custom-alias" value={alias} onChange={(e) => setAlias(e.target.value)}
          aria-describedby={error ? 'shorten-error' : undefined}
          onInvalid={event => { event.preventDefault(); setError('Alias must contain 3–32 letters, digits, hyphens or underscores.'); }}
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
        <div id="shorten-error" role="alert" className="p-3 bg-muted border border-destructive rounded text-destructive text-sm">
          {error}
        </div>
      )}

      {short && (
        <div className="p-4 bg-accent border border-border rounded">
          <div className="text-sm font-medium text-accent-foreground mb-2">{demo ? "Created in this tab only. This is not a working redirect link." : "Success!"}</div>
          <div className="text-sm text-accent-foreground mb-2">{demo ? "Short code:" : "Short link:"}</div>
          <div className="text-lg font-mono font-semibold text-accent-foreground break-all">{demo ? short : shortLink(short)}</div>
          <button type="button" className="border rounded px-3 py-2 mt-3" onClick={async () => {
            try { await navigator.clipboard.writeText(demo ? short : shortLink(short)); setCopied(true); window.dispatchEvent(new CustomEvent('onboarding', { detail: 'copy' })) }
            catch { setError('Copy unavailable; select the code to copy it manually.') }
          }}>{copied ? 'Copied!' : demo ? 'Copy code' : 'Copy short link'}</button>
        </div>
      )}
    </form>
  )
}
