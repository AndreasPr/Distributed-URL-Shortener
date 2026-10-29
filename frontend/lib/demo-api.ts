import type { URLClient, URLEntry, FlaggedURL, Analytics } from './api'

// Per-tab module memory only: no storage, network, real keys or real destinations.
export class DemoAPIClient implements URLClient {
  private sequence = 30
  private rows: URLEntry[] = Array.from({ length: 30 }, (_, i) => ({
    short_code: `sample${String(i + 1).padStart(2, '0')}`,
    long_url: `https://example.com/${['articles', 'guides', 'events', 'projects', 'news'][i % 5]}/${i + 1}`,
    created_at: '2026-01-01T12:00:00Z', click_count: (i * 17 + 12) % 100,
  }))
  private flagged: FlaggedURL[] = this.rows.slice(0, 3).map((row, i) => ({
    ...row, verdict: i === 2 ? 'malicious' : 'suspicious', score: 0.6 + i * 0.15,
    reasons: [['credential_path'], ['excessive_subdomains'], ['brand_in_subdomain']][i],
    source: 'sample', model: null,
  }))
  private reviews = new Map<string, 'allow' | 'block'>()
  setApiKey(_key: string): void { /* Demo never stores credentials. */ }
  async shorten(longUrl: string, customAlias?: string, expiresAt?: string) {
    let url: URL
    try { url = new URL(longUrl) } catch { throw new Error('Enter a valid HTTP or HTTPS URL.') }
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || longUrl.length > 2048)
      throw new Error('Use an HTTP or HTTPS URL without credentials, at most 2048 characters.')
    if (customAlias && (!/^[A-Za-z0-9_-]{3,32}$/.test(customAlias) || ['api', 'health', 'metrics', 'docs', 'admin'].includes(customAlias.toLowerCase())))
      throw new Error('Alias must be 3–32 letters, digits, hyphens or underscores, and not reserved.')
    if (expiresAt && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())) throw new Error('Expiry must be in the future.')
    const code = customAlias || `demo${++this.sequence}`
    if (this.rows.some(row => row.short_code === code)) throw new Error('Alias is already taken in this tab.')
    const row = { short_code: code, long_url: url.href, created_at: new Date().toISOString(), click_count: 0 }
    this.rows.push(row)
    return { ...row }
  }
  async listUrls() { return this.rows.map(row => ({ ...row })) }
  async getAnalytics(code: string): Promise<Analytics> {
    const row = this.rows.find(row => row.short_code === code)
    if (!row) throw new Error('Sample code not found. Try sample01.')
    return { short_code: code, total_clicks: row.click_count, timestamps: Array.from({ length: row.click_count }, (_, i) => new Date(Date.UTC(2026, 0, 2, 12, i)).toISOString()) }
  }
  async deleteUrl(code: string) {
    this.rows = this.rows.filter(row => row.short_code !== code)
    this.flagged = this.flagged.filter(row => row.short_code !== code)
  }
  async listFlagged(offset = 0) { return this.flagged.filter(row => !this.reviews.has(row.short_code)).slice(offset, offset + 50).map(row => ({ ...row, reasons: [...row.reasons] })) }
  async reviewFlagged(code: string, decision: 'allow' | 'block') {
    if (!this.flagged.some(row => row.short_code === code)) throw new Error('Sample code not found.')
    this.reviews.set(code, decision)
  }
  async getHealth() { return { status: 'sample healthy', db: 'sample healthy', redis: 'sample healthy', total_urls: this.rows.length, dbsize: this.rows.length } }
}
