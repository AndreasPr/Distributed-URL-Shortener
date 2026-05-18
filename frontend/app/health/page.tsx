import React, { useEffect, useState } from 'react'

type Health = {
  status: string
  redis: string
  dbsize?: number
}

export default function HealthPage() {
  const [health, setHealth] = useState<Health | null>(null)

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_URL + '/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'down', redis: 'unknown' }))
  }, [])

  return (
    <main className="p-8">
      <section className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">System Health</h2>
        <div className="bg-white shadow rounded p-6">
          {health ? (
            <div>
              <div>API: {health.status}</div>
              <div>Redis: {health.redis}</div>
              <div>DB size: {health.dbsize ?? 'n/a'}</div>
            </div>
          ) : (
            <div>Loading...</div>
          )}
        </div>
      </section>
    </main>
  )
}
