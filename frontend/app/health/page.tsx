"use client"

import React, { useEffect, useState } from 'react'
import { apiClient, HealthResponse } from '../../lib/api'
import { Card } from '../../components/ui/card'

export default function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await apiClient.getHealth()
        setHealth(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Health check failed')
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
  }, [])

  const statusColor =
    health?.status === 'ok'
      ? 'text-green-700'
      : health?.status === 'degraded'
      ? 'text-amber-700'
      : 'text-red-700'

  return (
    <main className="p-8">
      <section className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">System Health</h2>
        <Card className="shadow rounded p-6">
          {loading && <div className="text-slate-600">Loading...</div>}

          {error && (
            <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && health && (
            <div className="space-y-2 text-slate-800">
              <div>
                API: <span className={statusColor}>{health.status}</span>
              </div>
              <div>Database: {health.db ?? 'unknown'}</div>
              <div>Redis: {health.redis}</div>
              <div>Redis DB size: {health.dbsize ?? 'n/a'}</div>
              <div>Total URLs: {health.total_urls ?? 0}</div>
            </div>
          )}
        </Card>
      </section>
    </main>
  )
}
