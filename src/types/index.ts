export interface RoastAnalysis {
  roast: string
  score: number
  breakdown: {
    headline: number
    trust: number
    visual: number
    cta: number
    speed: number
  }
  issues: Issue[]
  quickWins: string[]
}

export interface Issue {
  issue: string
  location: string
  impact: 'high' | 'medium' | 'low'
  fix: string
}

export interface RoastResult extends RoastAnalysis {
  id: string
  url: string
  desktopScreenshotUrl?: string
  mobileScreenshotUrl?: string
  shareCardUrl?: string
  modelAgreement: number
  timestamp: number
  userId?: string
}

export interface User {
  id: string
  email: string
  subscriptionTier: 'free' | 'pro' | 'enterprise'
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'past_due'
  dailyRoastsCount: number
  totalRoastsCount: number
  lastRoastReset: string
  createdAt: string
}

export interface AIProviderResponse {
  success: boolean
  data?: RoastAnalysis
  error?: string
  provider: string
}