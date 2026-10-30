'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

export interface ChartData {
  [key: string]: string | number
}

interface AnalyticsChartProps {
  data: ChartData[]
  title: string
  type?: 'line' | 'bar'
  xAxisKey?: string
  yAxisKey?: string
}

export default function AnalyticsChart({
  data,
  title,
  type = 'bar',
  xAxisKey = 'name',
  yAxisKey = 'value',
}: AnalyticsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 bg-card rounded-lg shadow p-4 flex items-center justify-center text-muted-foreground">
        <div>No data available</div>
      </div>
    )
  }

  return (
    <div className="w-full bg-card rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xAxisKey} stroke="var(--muted-foreground)" />
            <YAxis stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: 'var(--popover-foreground)' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={yAxisKey}
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ fill: 'var(--primary)' }}
            />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xAxisKey} stroke="var(--muted-foreground)" />
            <YAxis stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: 'var(--popover-foreground)' }}
            />
            <Legend />
            <Bar dataKey={yAxisKey} fill="var(--primary)" radius={[8, 8, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
