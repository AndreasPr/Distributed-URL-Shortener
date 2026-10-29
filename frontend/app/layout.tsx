import './globals.css'
import Navbar from '../components/Navbar'
import ApiKeySettings from '../components/ApiKeySettings'
import React from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://distributed-url-shortener-two.vercel.app'),
  title: 'Distributed URL Shortener | Interactive Demo',
  description: 'Explore a browser-only demo of an event-driven URL shortener with analytics and abuse review. Run the real stack locally.',
  icons: { icon: '/icon.svg' },
  openGraph: { title: 'Distributed URL Shortener', description: 'Explore the interface. Run the real stack locally.', images: ['/opengraph-image'] },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans">
      <body>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <Navbar />
          <ApiKeySettings>{children}</ApiKeySettings>
        </div>
      </body>
    </html>
  )
}
