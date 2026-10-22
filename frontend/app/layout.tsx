import './globals.css'
import Navbar from '../components/Navbar'
import ApiKeySettings from '../components/ApiKeySettings'
import React from 'react'
import { Inter } from 'next/font/google'
import { cn } from '../lib/utils'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata = {
  title: 'URL Shortener Dashboard',
  description: 'Dashboard for URL Shortener service',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable)}>
      <body>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <Navbar />
          <ApiKeySettings>{children}</ApiKeySettings>
        </div>
      </body>
    </html>
  )
}
