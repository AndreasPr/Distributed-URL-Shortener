import React from 'react'

export default function URLTable() {
  return (
    <div className="overflow-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left">Short Code</th>
            <th className="px-4 py-2 text-left">Long URL</th>
            <th className="px-4 py-2 text-left">Clicks</th>
            <th className="px-4 py-2 text-left">Created</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-4 py-2 font-mono">abc123</td>
            <td className="px-4 py-2">https://example.com/long/url</td>
            <td className="px-4 py-2">42</td>
            <td className="px-4 py-2">2026-05-18</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
