const demo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  (process.env.NEXT_PUBLIC_DEMO_MODE === undefined && process.env.VERCEL_ENV === 'production')
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').origin
const development = process.env.NODE_ENV !== 'production'
// Next's inline hydration scripts require unsafe-inline with this static policy.
// A nonce-based policy needs per-request rendering and is a separate change.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${demo ? '' : apiOrigin}${development ? ' ws://localhost:3000' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_DEMO_MODE: String(demo), NEXT_PUBLIC_API_URL: demo ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
    ] }]
  },
}
