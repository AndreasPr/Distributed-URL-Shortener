// API client for URL Shortener service
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

export class APIClient {
  private apiKey = ''

  setApiKey(key: string): void {
    this.apiKey = key
  }

  private authHeaders(): Record<string, string> {
    return this.apiKey ? { 'X-API-Key': this.apiKey } : {}
  }

  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async shorten(longUrl: string, customAlias?: string, expiresAt?: string): Promise<ShortenResponse> {
    const response = await fetch(`${this.baseUrl}/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
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
    const response = await fetch(`${this.baseUrl}/analytics/${encodeURIComponent(shortCode)}`, { headers: this.authHeaders() })

    if (!response.ok) {
      throw new Error(`Analytics failed: ${response.statusText}`)
    }

    return response.json()
  }

  async deleteUrl(code: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/urls/${encodeURIComponent(code)}`, {
      method: 'DELETE', headers: this.authHeaders(),
    })
    if (!response.ok) throw new Error(`Delete failed: ${response.statusText}`)
  }

  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`)

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`)
    }

    return response.json()
  }

  async listUrls(): Promise<URLEntry[]> {
    const response = await fetch(`${this.baseUrl}/urls`, { headers: this.authHeaders() })

    if (!response.ok) {
      throw new Error(`List URLs failed: ${response.statusText}`)
    }

    return response.json()
  }
}

export const apiClient = new APIClient()
