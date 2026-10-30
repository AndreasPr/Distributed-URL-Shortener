import './globals.css'
import '@fontsource-variable/inter'
import { Providers } from '../components/Providers'
import { AppShell } from '../components/AppShell'
import React from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://distributed-url-shortener-two.vercel.app'),
  title: 'Relaymark | Links with clarity',
  description: 'Explore a browser-only demo of an event-driven URL shortener with analytics and abuse review. Run the real stack locally.',
  icons: { icon: '/icon.svg' },
  openGraph: { title: 'Relaymark', description: 'Explore the interface. Run the real stack locally.', images: ['/opengraph-image'] },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans" suppressHydrationWarning>
      <body>
        <Providers><AppShell>{children}</AppShell></Providers>
      </body>
    </html>
  )
}
