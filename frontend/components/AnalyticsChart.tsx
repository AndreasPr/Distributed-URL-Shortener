'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import type { DayClicks } from '../lib/analytics-series'
export default function AnalyticsChart({ data }: {data: DayClicks[]}) {
  return <figure aria-label="Daily click counts; the same values are available with Show as table" className="min-w-0 rounded-lg border bg-card p-3">
    <figcaption className="mb-3 font-medium">Clicks by local calendar day</figcaption>
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" stroke="var(--muted-foreground)" minTickGap={45} />
        <YAxis allowDecimals={false} width={35} stroke="var(--muted-foreground)" />
        <Bar dataKey="clicks" name="Clicks" fill="var(--primary)" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  </figure>
}
