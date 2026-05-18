import './globals.css'
import Navbar from '../components/Navbar'
import React from 'react'

export const metadata = {
  title: 'URL Shortener Dashboard',
  description: 'Dashboard for URL Shortener service',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <Navbar />
          {children}
        </div>
      </body>
    </html>
  )
}
