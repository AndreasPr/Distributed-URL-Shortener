import React from 'react'
import { URLEntry } from '../lib/api'

type URLTableProps = {
  entries: URLEntry[]
  loading?: boolean
  error?: string | null
}

export default function URLTable({
  entries,
  loading = false,
  error = null,
}: URLTableProps) {
  if (loading) {
    return <div className="text-muted-foreground">Loading recent URLs...</div>
  }

  if (error) {
    return (
      <div className="p-3 rounded border border-destructive bg-muted text-destructive">
        {error}
      </div>
    )
  }

  if (!entries.length) {
    return <div className="text-muted-foreground">No URLs found yet.</div>
  }

  return (
    <div className="overflow-auto">
      <table className="min-w-full bg-card">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left">Short Code</th>
            <th className="px-4 py-2 text-left">Long URL</th>
            <th className="px-4 py-2 text-left">Clicks</th>
            <th className="px-4 py-2 text-left">Created</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.short_code} className="border-t">
              <td className="px-4 py-2 font-mono">{entry.short_code}</td>
              <td className="px-4 py-2 max-w-xl truncate" title={entry.long_url}>
                {entry.long_url}
              </td>
              <td className="px-4 py-2">{entry.click_count}</td>
              <td className="px-4 py-2">
                {entry.created_at
                  ? new Date(entry.created_at).toLocaleString()
                  : 'n/a'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
