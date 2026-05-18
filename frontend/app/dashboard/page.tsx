import React from 'react'

export default function DashboardPage() {
  return (
    <main className="p-8">
      <section className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="col-span-2 bg-white rounded shadow p-4">URL Table (placeholder)</div>
          <div className="bg-white rounded shadow p-4">Traffic summary (placeholder)</div>
        </div>

        <div className="bg-white rounded shadow p-4">Performance metrics (placeholder)</div>
      </section>
    </main>
  )
}
