'use client'

import { useDemoMode } from '../../lib/auth/demo-route'
import React, { useEffect, useState } from 'react'
import { apiClient, HealthResponse, URLEntry } from '../../lib/api'
import { Card } from '../../components/ui/card'
import { Onboarding } from '../../components/Onboarding'
import ShortenForm from '../../components/ShortenForm'
import URLTable from '../../components/URLTable'

export default function DashboardPage() {
  const demo = useDemoMode()
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [urls, setUrls] = useState<URLEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [urlsError, setUrlsError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const fetchDashboardData = async () => {
      const [healthResult, urlsResult] = await Promise.allSettled([
        apiClient.getHealth(),
        apiClient.listUrls(),
      ])

      if (!active) return
      if (healthResult.status === 'fulfilled') {
        setHealth(healthResult.value)
      } else {
        const message =
          healthResult.reason instanceof Error
            ? healthResult.reason.message
            : 'Failed to fetch health data'
        setError(message)
      }

      if (urlsResult.status === 'fulfilled') {
        setUrls(urlsResult.value)
      } else {
        const message =
          urlsResult.reason instanceof Error
            ? urlsResult.reason.message
            : 'Failed to fetch URL list'
        setUrlsError(message)
      }

      setLoading(false)
    }

    fetchDashboardData()
    return () => { active = false }
  }, [])

  return (
    <main className="p-4 sm:p-8">
      <section className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-foreground">Dashboard</h1>

        <section className="mb-8 space-y-4" aria-label="Get started"><Onboarding /><ShortenForm /></section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              API Status
            </h3>
            <p className="text-2xl font-bold text-foreground">
              {loading ? '...' : health?.status || 'Unknown'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{demo ? 'Bundled sample status' : 'Status at page load'}</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Redis Status
            </h3>
            <p className="text-2xl font-bold text-foreground">
              {loading ? '...' : health?.redis || 'Unknown'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Cache system</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Database Size
            </h3>
            <p className="text-2xl font-bold text-foreground">
              {loading ? '...' : health?.total_urls ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Stored URLs</p>
          </Card>
        </div>

        {error && (
          <div className="p-4 mb-8 bg-muted border border-destructive rounded text-destructive">
            {error}
          </div>
        )}

        {/* URL Table Section */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Recent URLs
          </h2>
          <URLTable entries={urls} loading={loading} error={urlsError} />
        </Card>

        {/* Performance Metrics */}
        <Card className="p-6 bg-background">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Performance Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-card rounded border border-slate-200">
              <h3 className="text-sm font-medium text-muted-foreground">Avg Response Time</h3>
              <p className="text-xl font-semibold text-foreground mt-2">Not measured here</p>
            </div>
            <div className="p-4 bg-card rounded border border-slate-200">
              <h3 className="text-sm font-medium text-muted-foreground">API Uptime</h3>
              <p className="text-xl font-semibold text-foreground mt-2">See local monitoring</p>
            </div>
          </div>
        </Card>
      </section>
    </main>
  )
}
