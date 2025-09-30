export interface RoastRequest {
  url: string;
  forceRefresh?: boolean;
  options?: {
    includeCompetitors?: boolean;
    includeMobile?: boolean;
  };
}

export interface RoastResult {
  id: string;
  url: string;
  roast: string;
  score: number;
  breakdown: ScoreBreakdown;
  issues: Issue[];
  quickWins: string[];
  desktopScreenshotUrl: string;
  mobileScreenshotUrl: string;
  shareCardUrl: string;
  modelAgreement: number;
  timestamp: number;
  userId?: string;
  cached?: boolean;
  processingTime?: number;
}

export interface RoastAnalysis {
  roast: string;
  score: number;
  breakdown?: ScoreBreakdown;
  issues?: Issue[];
  quickWins?: string[];
  modelAgreement?: number;
}

export interface ScoreBreakdown {
  headline: number;  // 0-2
  trust: number;     // 0-2
  visual: number;    // 0-2
  cta: number;       // 0-2
  speed: number;     // 0-2
}

export interface Issue {
  issue: string;
  location: string;
  impact: 'high' | 'medium' | 'low';
  fix: string;
}

export interface ScreenshotJob {
  jobId: string;
  url: string;
  roastId: string;
  timestamp: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  domReady: number;
  firstPaint: number;
  resources: number;
}

export interface AIProviderConfig {
  name: string;
  weight: number;
  enabled: boolean;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface CacheConfig {
  ttl: number;
  prefix: string;
}

export interface DatabaseRecord {
  id: string;
  url: string;
  domain: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  score?: number;
  score_breakdown?: ScoreBreakdown;
  roast_text?: string;
  issues?: Issue[];
  quick_wins?: string[];
  desktop_screenshot_url?: string;
  mobile_screenshot_url?: string;
  share_card_url?: string;
  ai_models_used?: Record<string, boolean>;
  model_agreement?: number;
  processing_time_ms?: number;
  cost_cents?: number;
  share_count: number;
  view_count: number;
  click_count: number;
  improvement_implemented: boolean;
  created_at: string;
  completed_at?: string;
  updated_at: string;
  user_id?: string;
}

export interface UserRecord {
  id: string;
  email: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  daily_roasts_count: number;
  total_roasts_count: number;
  last_roast_reset: string;
  name?: string;
  avatar_url?: string;
  company?: string;
  website?: string;
  metadata: Record<string, any>;
  referral_source?: string;
  utm_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: Record<string, any>;
  user_id?: string;
  roast_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_at: string;
}

export interface LeaderboardEntry {
  domain: string;
  roast_count: number;
  avg_score: number;
  best_score: number;
  worst_score: number;
  median_score: number;
}

export interface CompetitorAnalysis {
  baseUrl: string;
  competitors: {
    url: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  insights: string[];
  recommendations: string[];
}

export interface ShareData {
  roast_id: string;
  platform: 'twitter' | 'linkedin' | 'facebook' | 'email' | 'direct';
  share_url: string;
  short_url?: string;
  clicks: number;
  conversions: number;
  created_at: string;
  last_clicked_at?: string;
}

export interface AIRewrite {
  element_type: 'headline' | 'cta' | 'value_prop';
  original_text: string;
  suggestions: string[];
  selected_suggestion?: string;
  predicted_uplift: number;
  actual_uplift?: number;
  implemented: boolean;
}

export interface RateLimitConfig {
  window: string;  // e.g., '1h', '1d'
  max: number;
  keyBy: 'ip' | 'user' | 'custom';
  blockDuration?: number;
}

export interface SecurityConfig {
  allowedOrigins: string[];
  maxRequestSize: number;
  enableSSRFProtection: boolean;
  enableXSSProtection: boolean;
  enableSQLInjectionProtection: boolean;
  encryptionKey: string;
}

export interface MonitoringMetrics {
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  cacheHitRate: number;
  aiProviderFailures: Record<string, number>;
  costPerRequest: number;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  error?: string;
  timestamp: number;
}

export interface BackgroundJobResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startedAt: number;
  completedAt?: number;
  retryCount: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    requestId: string;
    timestamp: number;
    cached: boolean;
    processingTime: number;
  };
}