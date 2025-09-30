-- Add 'trial' to the subscription_tier enum
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'trial';