#!/bin/bash

APP_ID="d2fkxpg9vn5h9c"
REGION="us-east-1"

echo "Setting up environment variables for Amplify App: $APP_ID"

# Read environment variables from .env.production if it exists, otherwise prompt
if [ -f ".env.production" ]; then
    echo "Using environment variables from .env.production"
    source .env.production
else
    echo "Please ensure .env.production is configured with all necessary variables"
    exit 1
fi

# Set environment variables in Amplify
aws amplify update-app --app-id $APP_ID --region $REGION --environment-variables \
    NODE_ENV=production \
    NEXT_PUBLIC_USE_EXTERNAL_API=true \
    NEXT_PUBLIC_API_URL=https://1il9nnkz4b.execute-api.us-east-1.amazonaws.com/prod \
    NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" \
    STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
    STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
    STRIPE_PRICE_ID_PRO="$STRIPE_PRICE_ID_PRO" \
    NEXT_PUBLIC_APP_URL="https://roastmylanding.com" \
    OPENAI_API_KEY="$OPENAI_API_KEY" \
    ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
    GEMINI_API_KEY="$GEMINI_API_KEY" \
    REDIS_HOST="$REDIS_HOST" \
    REDIS_PORT="$REDIS_PORT" \
    REDIS_PASSWORD="$REDIS_PASSWORD" \
    REDIS_DB="$REDIS_DB" \
    REDIS_URL="$REDIS_URL" \
    FREE_TIER_DAILY_LIMIT=3 \
    PRO_TIER_DAILY_LIMIT=1000

if [ $? -eq 0 ]; then
    echo "✅ Environment variables set successfully!"
else
    echo "❌ Failed to set environment variables"
    exit 1
fi