-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Custom types
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'past_due');
CREATE TYPE roast_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE share_platform AS ENUM ('twitter', 'linkedin', 'facebook', 'email', 'direct');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_status subscription_status DEFAULT 'inactive',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,

  -- Usage tracking
  daily_roasts_count INTEGER DEFAULT 0,
  total_roasts_count INTEGER DEFAULT 0,
  last_roast_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Profile
  name TEXT,
  avatar_url TEXT,
  company TEXT,
  website TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  referral_source TEXT,
  utm_data JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Roasts table
CREATE TABLE roasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- URL data
  url TEXT NOT NULL,
  domain TEXT GENERATED ALWAYS AS (
    regexp_replace(url, '^https?://([^/]+).*', '\1')
  ) STORED,

  -- Roast data
  status roast_status DEFAULT 'pending',
  score INTEGER CHECK (score >= 1 AND score <= 10),
  score_breakdown JSONB DEFAULT '{}',
  roast_text TEXT,
  issues JSONB DEFAULT '[]',
  quick_wins JSONB DEFAULT '[]',

  -- Screenshots
  desktop_screenshot_url TEXT,
  mobile_screenshot_url TEXT,
  share_card_url TEXT,

  -- AI metadata
  ai_models_used JSONB DEFAULT '{}',
  model_agreement DECIMAL(3,2),
  processing_time_ms INTEGER,
  cost_cents INTEGER,

  -- Engagement
  share_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 1,
  click_count INTEGER DEFAULT 0,
  improvement_implemented BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_roasts_user_id ON roasts(user_id);
CREATE INDEX idx_roasts_domain ON roasts(domain);
CREATE INDEX idx_roasts_status ON roasts(status);
CREATE INDEX idx_roasts_created_at ON roasts(created_at DESC);
CREATE INDEX idx_roasts_score ON roasts(score DESC);
CREATE INDEX idx_roasts_url_hash ON roasts(MD5(url));

-- Shares table
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roast_id UUID REFERENCES roasts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  platform share_platform NOT NULL,
  share_url TEXT,
  short_url TEXT,

  -- Analytics
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_clicked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_shares_roast_id ON shares(roast_id);
CREATE INDEX idx_shares_platform ON shares(platform);

-- Analytics events
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',

  -- Relations
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  roast_id UUID REFERENCES roasts(id) ON DELETE SET NULL,

  -- Session data
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_event_type ON analytics(event_type);
CREATE INDEX idx_analytics_created_at ON analytics(created_at);
CREATE INDEX idx_analytics_user_id ON analytics(user_id);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY users_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY roasts_insert ON roasts FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY roasts_select ON roasts FOR SELECT USING (
  auth.uid() = user_id OR
  user_id IS NULL OR
  EXISTS (SELECT 1 FROM shares WHERE shares.roast_id = roasts.id)
);
CREATE POLICY roasts_update ON roasts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY shares_insert ON shares FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY shares_select ON shares FOR SELECT USING (true);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_roasts_updated_at BEFORE UPDATE ON roasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Materialized view for leaderboard
CREATE MATERIALIZED VIEW leaderboard AS
SELECT
  domain,
  COUNT(*) as roast_count,
  AVG(score) as avg_score,
  MAX(score) as best_score,
  MIN(score) as worst_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score) as median_score
FROM roasts
WHERE status = 'completed'
GROUP BY domain
HAVING COUNT(*) >= 3;

CREATE INDEX idx_leaderboard_avg_score ON leaderboard(avg_score DESC);

-- Function to refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily roast counts
CREATE OR REPLACE FUNCTION reset_daily_roast_counts()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET daily_roasts_count = 0,
      last_roast_reset = CURRENT_TIMESTAMP
  WHERE last_roast_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;