import Link from 'next/link'
import React from 'react'

export default function Navbar() {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between min-h-14 gap-3 py-3">
          <div className="flex items-center">
            <Link href="/" className="font-bold text-slate-800">URL Shortener</Link>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className="text-slate-600">Dashboard</Link>
            <Link href="/analytics" className="text-slate-600">Analytics</Link>
            <Link href="/flagged" className="text-slate-600">Flagged</Link>
            <Link href="/health" className="text-slate-600">Health</Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
