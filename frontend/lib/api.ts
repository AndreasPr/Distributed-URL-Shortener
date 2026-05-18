// API client for URL Shortener service
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ShortenRequest {
  long_url: string
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

class APIClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async shorten(longUrl: string): Promise<ShortenResponse> {
    const response = await fetch(`${this.baseUrl}/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ long_url: longUrl }),
    })

    if (!response.ok) {
      throw new Error(`Shorten failed: ${response.statusText}`)
    }

    return response.json()
  }

  async getAnalytics(shortCode: string): Promise<Analytics> {
    const response = await fetch(`${this.baseUrl}/analytics/${shortCode}`)

    if (!response.ok) {
      throw new Error(`Analytics failed: ${response.statusText}`)
    }

    return response.json()
  }

  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`)

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`)
    }

    return response.json()
  }

  async listUrls(): Promise<URLEntry[]> {
    const response = await fetch(`${this.baseUrl}/urls`)

    if (!response.ok) {
      throw new Error(`List URLs failed: ${response.statusText}`)
    }

    return response.json()
  }
}

export const apiClient = new APIClient()
