"use client"

import React, { useState } from 'react'
import { apiClient } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'

export default function ShortenForm() {
  const [url, setUrl] = useState('')
  const [short, setShort] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setShort(null)
    try {
      const result = await apiClient.shorten(url)
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
        <label className="block text-sm font-medium text-slate-700 mb-2">Long URL</label>
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/very/long/url"
          required
        />
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
          <div className="text-sm font-medium text-green-900 mb-2">Success!</div>
          <div className="text-sm text-green-800 mb-2">Short code:</div>
          <div className="text-lg font-mono font-semibold text-green-900 break-all">{short}</div>
        </div>
      )}
    </form>
  )
}
