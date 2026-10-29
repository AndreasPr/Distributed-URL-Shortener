import { ImageResponse } from 'next/og'
export const alt = 'Distributed URL Shortener — browser demo, local real stack'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export default function Image() {
  return new ImageResponse(<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#0f172a', color: '#f8fafc', padding: 80, width: '100%', height: '100%' }}>
    <div style={{ fontSize: 68, fontWeight: 700 }}>Distributed URL Shortener</div>
    <div style={{ fontSize: 32, marginTop: 40, color: '#67e8f9' }}>Links · Analytics · Abuse review</div>
    <div style={{ fontSize: 26, marginTop: 40 }}>Explore the demo. Run the real stack locally.</div>
  </div>, size)
}
