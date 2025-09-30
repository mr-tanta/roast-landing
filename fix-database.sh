#!/bin/bash

# Database Fix Script for RoastMyLanding
# Adds user profile creation trigger and updates enum

set -e

echo "🔧 Fixing Database Schema Issues..."
echo "=================================="
echo ""

SUPABASE_PROJECT_URL="https://wzkbwfajlcekiazbjdhn.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2J3ZmFqbGNla2lhemJqZGhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE3MjQ3MiwiZXhwIjoyMDc0NzQ4NDcyfQ.iCFOLxbqL2SZ-PJQSoAg2r7hWyCPHUHK0PDlv6T26qE"

echo "1. Adding 'trial' to subscription_tier enum..."
curl -X POST "$SUPABASE_PROJECT_URL/rest/v1/rpc/sql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -d '{
    "query": "ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS '\''trial'\'';"
  }' || echo "⚠️  Note: Enum value might already exist"

echo ""
echo "2. Creating user profile creation function..."

USER_FUNCTION_SQL="CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS \$\$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    avatar_url,
    subscription_tier,
    subscription_status,
    created_at,
    updated_at,
    last_active_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'free'::subscription_tier,
    'inactive'::subscription_status,
    NOW(),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER;"

curl -X POST "$SUPABASE_PROJECT_URL/rest/v1/rpc/sql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -d "{\"query\": \"$USER_FUNCTION_SQL\"}"

echo ""
echo "3. Creating user profile trigger..."

TRIGGER_SQL="DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();"

curl -X POST "$SUPABASE_PROJECT_URL/rest/v1/rpc/sql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -d "{\"query\": \"$TRIGGER_SQL\"}"

echo ""
echo "✅ Database fixes applied successfully!"
echo ""
echo "📋 What was fixed:"
echo "- Added 'trial' to subscription_tier enum"
echo "- Created automatic user profile creation on signup"
echo "- Added trigger to handle new user registration"
echo ""
echo "🚀 Your app should now work without profile errors!"