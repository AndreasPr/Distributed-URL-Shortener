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
    (health?.status === 'ok' || health?.status === 'sample healthy')
      ? 'text-primary'
      : health?.status === 'degraded'
      ? 'text-muted-foreground'
      : 'text-destructive'

  return (
    <main className="p-4 sm:p-8">
      <section className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4 text-foreground">System Health</h1>
        <Card className="shadow rounded p-6">
          {loading && <div className="text-muted-foreground">Loading...</div>}

          {error && (
            <div className="p-3 rounded border border-destructive bg-muted text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && health && (
            <div className="space-y-2 text-foreground">
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
