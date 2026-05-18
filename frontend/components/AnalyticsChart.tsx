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
      <div className="w-full h-80 bg-white rounded-lg shadow p-4 flex items-center justify-center text-slate-500">
        <div>No data available</div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-slate-900">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xAxisKey} stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#f1f5f9' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={yAxisKey}
              stroke="#0f172a"
              strokeWidth={2}
              dot={{ fill: '#0f172a' }}
            />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xAxisKey} stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#f1f5f9' }}
            />
            <Legend />
            <Bar dataKey={yAxisKey} fill="#0f172a" radius={[8, 8, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
