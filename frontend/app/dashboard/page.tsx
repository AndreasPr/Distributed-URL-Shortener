'use client'

import React, { useEffect, useState } from 'react'
import { apiClient, HealthResponse, URLEntry } from '../../lib/api'
import { Card } from '../../components/ui/card'
import URLTable from '../../components/URLTable'

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [urls, setUrls] = useState<URLEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [urlsError, setUrlsError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      const [healthResult, urlsResult] = await Promise.allSettled([
        apiClient.getHealth(),
        apiClient.listUrls(),
      ])

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
  }, [])

  return (
    <main className="p-8">
      <section className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-slate-900">Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">
              API Status
            </h3>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? '...' : health?.status || 'Unknown'}
            </p>
            <p className="text-xs text-slate-500 mt-2">Real-time monitoring</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">
              Redis Status
            </h3>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? '...' : health?.redis || 'Unknown'}
            </p>
            <p className="text-xs text-slate-500 mt-2">Cache system</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">
              Database Size
            </h3>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? '...' : health?.total_urls ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-2">Stored URLs</p>
          </Card>
        </div>

        {error && (
          <div className="p-4 mb-8 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {/* URL Table Section */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">
            Recent URLs
          </h2>
          <URLTable entries={urls} loading={loading} error={urlsError} />
        </Card>

        {/* Performance Metrics */}
        <Card className="p-6 bg-slate-50">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">
            Performance Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded border border-slate-200">
              <h3 className="text-sm font-medium text-slate-600">Avg Response Time</h3>
              <p className="text-xl font-semibold text-slate-900 mt-2">~45ms</p>
            </div>
            <div className="p-4 bg-white rounded border border-slate-200">
              <h3 className="text-sm font-medium text-slate-600">API Uptime</h3>
              <p className="text-xl font-semibold text-slate-900 mt-2">99.9%</p>
            </div>
          </div>
        </Card>
      </section>
    </main>
  )
}
