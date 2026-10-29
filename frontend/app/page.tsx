import React from 'react'
import Image from 'next/image'
import ShortenForm from '../components/ShortenForm'

export default function Home() {
  return (
    <main className="p-8">
      <section className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-4xl font-bold">URL Shortener</h1>
          <p className="text-slate-600 mt-2">An event-driven URL shortener that explores resilient redirects, asynchronous analytics and explainable abuse review.</p>
        </header>

        <section aria-label="About this project" className="space-y-4 mb-8">
          <Image src="/architecture.svg" alt="Local architecture: frontend and MCP to API, Redis and PostgreSQL, broker adapters, analytics and abuse workers, LLMs and telemetry" width={960} height={270} priority />
          <ul className="list-disc pl-6 space-y-1">
            <li>Kafka and Redis Streams adapters share an event-bus interface.</li>
            <li>Analytics consumers deduplicate events and route poison messages to a dead-letter queue.</li>
            <li>Redis Lua token buckets enforce API rate limits in the real stack.</li>
            <li>OpenTelemetry connects request, event and worker spans.</li>
          </ul>
          <p>These describe the local implementation; <a className="underline" href="https://github.com/AndreasPr/Distributed-URL-Shortener/blob/master/docs/claims.md">evidence and limitations</a>.</p>
          <p className="flex flex-wrap gap-4">
            <a className="underline" href="https://github.com/AndreasPr/Distributed-URL-Shortener">GitHub</a>
            <a className="underline" href="https://github.com/AndreasPr/Distributed-URL-Shortener/blob/master/docs/design.md">Design docs</a>
            <a className="underline" href="https://github.com/AndreasPr/Distributed-URL-Shortener/blob/master/docs/adr/README.md">ADRs</a>
            <span>Demo video: recording coming soon</span>
          </p>
          <p className="border-l-4 border-amber-400 pl-4"><strong>Limits:</strong> the hosted demo runs on bundled data in your browser. Reloading resets changes; codes do not redirect. The real Kafka or Redis Streams, Redis and PostgreSQL stack runs locally with <code>make demo</code>. No live model, database or monitoring runs on this page.</p>
        </section>
        <div className="bg-white shadow rounded p-6">
          <ShortenForm />
        </div>
      </section>
    </main>
  )
}
