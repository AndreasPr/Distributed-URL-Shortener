import React from 'react'
import ShortenForm from '../components/ShortenForm'

export default function Home() {
  return (
    <main className="p-8">
      <section className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-4xl font-bold">URL Shortener</h1>
          <p className="text-slate-600 mt-2">Shorten links and inspect traffic</p>
        </header>

        <div className="bg-white shadow rounded p-6">
          <ShortenForm />
        </div>
      </section>
    </main>
  )
}
