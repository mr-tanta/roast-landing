import type { RoastResult } from '@/types'

interface RoastRequest {
  url: string
  forceRefresh?: boolean
}

interface APIResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

class APIClient {
  private readonly baseUrl: string
  private readonly useExternal: boolean

  constructor() {
    // Determine which API to use based on environment
    this.useExternal = process.env.NEXT_PUBLIC_USE_EXTERNAL_API === 'true'
    this.baseUrl = this.useExternal
      ? process.env.NEXT_PUBLIC_API_URL || ''
      : '' // Use relative paths for local API
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = this.useExternal
      ? `${this.baseUrl}${endpoint}`
      : `/api${endpoint}`

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          error: data.error || data.message || `HTTP ${response.status}`,
        }
      }

      return { data }
    } catch (error) {
      console.error('API request failed:', error)
      return {
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  async generateRoast(request: RoastRequest): Promise<APIResponse<RoastResult>> {
    return this.makeRequest<RoastResult>('/roast', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getRoast(id: string): Promise<APIResponse<RoastResult>> {
    if (this.useExternal) {
      // For external API, we don't have individual roast retrieval yet
      return { error: 'Individual roast retrieval not available with external API' }
    }

    return this.makeRequest<RoastResult>(`/roast?id=${id}`, {
      method: 'GET',
    })
  }

  async getLeaderboard(): Promise<APIResponse<any[]>> {
    if (this.useExternal) {
      // For external API, we don't have leaderboard yet
      return { data: [] }
    }

    return this.makeRequest<any[]>('/leaderboard', {
      method: 'GET',
    })
  }

  // Health check method
  async healthCheck(): Promise<APIResponse<{ status: string }>> {
    if (this.useExternal) {
      return this.makeRequest<{ status: string }>('/health', {
        method: 'GET',
      })
    }

    return { data: { status: 'ok' } }
  }

  // Get API info
  getAPIInfo() {
    return {
      useExternal: this.useExternal,
      baseUrl: this.baseUrl,
      mode: this.useExternal ? 'External Lambda API' : 'Internal Next.js API',
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient()

// Named exports for convenience
export const generateRoast = (request: RoastRequest) => apiClient.generateRoast(request)
export const getRoast = (id: string) => apiClient.getRoast(id)
export const getLeaderboard = () => apiClient.getLeaderboard()
export const healthCheck = () => apiClient.healthCheck()

export default apiClient