import React, { useState } from 'react'

export default function ShortenForm() {
  const [url, setUrl] = useState('')
  const [short, setShort] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ long_url: url }),
      })
      const json = await res.json()
      setShort(json.short_code || json.shortCode || json.short)
    } catch (err) {
      setShort('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Long URL</label>
        <input
          className="mt-1 block w-full border rounded px-3 py-2"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/very/long/url"
        />
      </div>

      <div>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 bg-slate-800 text-white rounded"
          disabled={loading}
        >
          {loading ? 'Shortening…' : 'Shorten'}
        </button>
      </div>

      {short && (
        <div className="mt-4">
          <div className="text-sm text-slate-600">Short code</div>
          <div className="mt-1 font-mono">{short}</div>
        </div>
      )}
    </form>
  )
}
