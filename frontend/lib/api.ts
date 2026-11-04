// API client for URL Shortener service
import { DemoAPIClient } from './demo-api'

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const API_BASE_URL = DEMO_MODE ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

// Abort includes response-body consumption, not just receipt of HTTP headers.
function timedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...options, signal: AbortSignal.timeout(10000) })
}

export interface ShortenRequest {
  long_url: string
  custom_alias?: string
  expires_at?: string
}

export interface ShortenResponse {
  short_code: string
  long_url: string
  created_at?: string
}

export interface Analytics {
  short_code: string
  total_clicks: number
  timestamps: string[]
}

export interface HealthResponse {
  status: string
  db?: string
  redis: string
  dbsize?: number
  total_urls?: number
}

export interface URLEntry {
  short_code: string
  long_url: string
  created_at: string
  click_count: number
}

export interface FlaggedURL {
  short_code: string
  long_url: string
  verdict: 'suspicious' | 'malicious'
  score: number
  reasons: string[]
  source: string
  model: string | null
  created_at: string
}

export class APIClient {
  private apiKey = ''
  private bearerToken = ''
  private tokenExpiresAt = 0
  private loginPromise: Promise<void> | null = null

  setBearerToken(token: string): void {
    this.apiKey = ''
    this.bearerToken = token
    this.tokenExpiresAt = token ? Infinity : 0
  }

  setApiKey(key: string): void {
    this.apiKey = key
    this.bearerToken = ''
    this.tokenExpiresAt = 0
  }

  private async authHeaders(): Promise<Record<string, string>> {
    if (this.apiKey) return { 'X-API-Key': this.apiKey }
    if (process.env.NEXT_PUBLIC_LOCAL_AUTH === 'true' && Date.now() >= this.tokenExpiresAt) {
      // Only the isolated make demo build opts in. Tokens remain in memory.
      this.loginPromise ??= timedFetch(`${this.baseUrl}/auth/dev-login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'owner' }),
      }).then(async response => {
        if (!response.ok) throw new Error('Local demo login failed')
        const body = await response.json()
        this.bearerToken = body.access_token
        this.tokenExpiresAt = Date.now() + (body.expires_in - 30) * 1000
      }).finally(() => { this.loginPromise = null })
      await this.loginPromise
    }
    return this.bearerToken ? { Authorization: `Bearer ${this.bearerToken}` } : {}
  }

  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async shorten(longUrl: string, customAlias?: string, expiresAt?: string): Promise<ShortenResponse> {
    const response = await timedFetch(`${this.baseUrl}/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...await this.authHeaders() },
      body: JSON.stringify({ long_url: longUrl, custom_alias: customAlias, expires_at: expiresAt }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const detail = body?.detail
      const message = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map((item: { msg: string }) => item.msg).join('; ')
        : response.statusText
      throw new Error(message || 'Failed to shorten URL')
    }

    return response.json()
  }

  async getAnalytics(shortCode: string): Promise<Analytics> {
    const response = await timedFetch(`${this.baseUrl}/analytics/${encodeURIComponent(shortCode)}`, { headers: await this.authHeaders() })

    if (!response.ok) {
      throw new Error(`Analytics failed: ${response.statusText}`)
    }

    return response.json()
  }

  async deleteUrl(code: string): Promise<void> {
    const response = await timedFetch(`${this.baseUrl}/urls/${encodeURIComponent(code)}`, {
      method: 'DELETE', headers: await this.authHeaders(),
    })
    if (!response.ok) throw new Error(`Delete failed: ${response.statusText}`)
  }

  async listFlagged(offset = 0): Promise<FlaggedURL[]> {
    const response = await timedFetch(`${this.baseUrl}/admin/flagged?limit=50&offset=${offset}`, { headers: await this.authHeaders() })
    if (!response.ok) throw new Error(`Review queue unavailable (${response.status}); an admin key is required`)
    return response.json()
  }

  async reviewFlagged(code: string, decision: 'allow' | 'block'): Promise<void> {
    const response = await timedFetch(`${this.baseUrl}/admin/flagged/${encodeURIComponent(code)}/review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...await this.authHeaders() },
      body: JSON.stringify({ decision }),
    })
    if (!response.ok) throw new Error(`Review failed (${response.status})`)
  }

  async getHealth(): Promise<HealthResponse> {
    const response = await timedFetch(`${this.baseUrl}/health`)

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`)
    }

    return response.json()
  }

  async listUrls(): Promise<URLEntry[]> {
    const response = await timedFetch(`${this.baseUrl}/urls`, { headers: await this.authHeaders() })

    if (!response.ok) {
      throw new Error(`List URLs failed: ${response.statusText}`)
    }

    return response.json()
  }
}

export type URLClient = Pick<APIClient, 'setApiKey' | 'shorten' | 'getAnalytics' | 'deleteUrl' | 'listFlagged' | 'reviewFlagged' | 'getHealth' | 'listUrls'>
export const apiClient: URLClient = DEMO_MODE ? new DemoAPIClient() : new APIClient()
