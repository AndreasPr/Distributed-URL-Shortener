'use client'

import React, { useEffect, useState } from 'react'
import { apiClient, Analytics, URLEntry } from '../../lib/api'
import AnalyticsChart from '../../components/AnalyticsChart'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

export default function AnalyticsPage() {
  const [shortCode, setShortCode] = useState('')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFetchAnalytics = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shortCode.trim()) {
      setError('Please enter a short code')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getAnalytics(shortCode.trim())
      setAnalytics(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch analytics'
      )
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  // Transform timestamps into chart data grouped by day
  const generateChartData = () => {
    if (!analytics || !analytics.timestamps || analytics.timestamps.length === 0) {
      return []
    }

    // Group clicks by day
    const dayClickMap: { [key: string]: number } = {}
    analytics.timestamps.forEach((timestamp) => {
      const date = new Date(timestamp)
      const dayKey = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
      })
      dayClickMap[dayKey] = (dayClickMap[dayKey] || 0) + 1
    })

    // Convert to chart format, sorted by date
    return Object.entries(dayClickMap)
      .map(([date, clicks]) => ({
        name: date,
        clicks,
      }))
      .sort((a, b) => {
        const [aMonth, aDay] = a.name.split('/').map(Number)
        const [bMonth, bDay] = b.name.split('/').map(Number)
        return aMonth !== bMonth ? aMonth - bMonth : aDay - bDay
      })
  }

  const chartData = generateChartData()

  return (
    <main className="p-8">
      <section className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-slate-900">Analytics</h1>

        {/* Search Section */}
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">
            Look Up URL Analytics
          </h2>
          <form onSubmit={handleFetchAnalytics} className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter short code (e.g., abc123)"
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Search'}
            </Button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}
        </Card>

        {/* Analytics Results */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-6">
              <h3 className="text-sm font-medium text-slate-600 mb-2">
                Short Code
              </h3>
              <p className="text-2xl font-bold font-mono text-slate-900">
                {analytics.short_code}
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-slate-600 mb-2">
                Total Clicks
              </h3>
              <p className="text-2xl font-bold text-slate-900">
                {analytics.total_clicks || 0}
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-slate-600 mb-2">
                Status
              </h3>
              <p className="text-2xl font-bold text-green-600">Active</p>
            </Card>
          </div>
        )}

        {/* Charts Section */}
        {analytics && chartData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <AnalyticsChart
              data={chartData}
              title="Clicks Over Time"
              type="bar"
              xAxisKey="name"
              yAxisKey="clicks"
            />
            <AnalyticsChart
              data={chartData}
              title="Click Trend"
              type="line"
              xAxisKey="name"
              yAxisKey="clicks"
            />
          </div>
        )}

        {/* Info Section */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Tip</h3>
          <p className="text-sm text-blue-800">
            Enter a short code above to see detailed analytics including click
            patterns and user agent information.
          </p>
        </Card>
      </section>
    </main>
  )
}
