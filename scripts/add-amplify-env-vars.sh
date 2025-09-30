#!/bin/bash

# New Amplify App Configuration
APP_ID="d29z8nh5m7c4h1"
REGION="us-east-1"

echo "🚀 Adding environment variables to Amplify App: $APP_ID"
echo "Reading variables from .env.local..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    exit 1
fi

# Source the environment variables
set -a  # automatically export all variables
source .env.local
set +a

echo "✅ Environment variables loaded from .env.local"

# Add all environment variables to Amplify using AWS CLI
echo "📝 Adding environment variables to Amplify..."

aws amplify update-app --app-id $APP_ID --region $REGION --environment-variables '{
    "NODE_ENV": "production",
    "NEXT_PUBLIC_USE_EXTERNAL_API": "true",
    "NEXT_PUBLIC_API_URL": "https://1il9nnkz4b.execute-api.us-east-1.amazonaws.com/prod",
    "NEXT_PUBLIC_APP_URL": "https://roastmylanding.com",
    "NEXT_PUBLIC_SUPABASE_URL": "'$NEXT_PUBLIC_SUPABASE_URL'",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "'$NEXT_PUBLIC_SUPABASE_ANON_KEY'",
    "SUPABASE_SERVICE_ROLE_KEY": "'$SUPABASE_SERVICE_ROLE_KEY'",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "'$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'",
    "STRIPE_SECRET_KEY": "'$STRIPE_SECRET_KEY'",
    "STRIPE_WEBHOOK_SECRET": "'$STRIPE_WEBHOOK_SECRET'",
    "OPENAI_API_KEY": "'$OPENAI_API_KEY'",
    "ANTHROPIC_API_KEY": "'$ANTHROPIC_API_KEY'",
    "GEMINI_API_KEY": "'$GEMINI_API_KEY'",
    "REDIS_HOST": "'$REDIS_HOST'",
    "REDIS_PORT": "'$REDIS_PORT'",
    "REDIS_PASSWORD": "'$REDIS_PASSWORD'",
    "REDIS_DB": "'$REDIS_DB'",
    "REDIS_URL": "'$REDIS_URL'",
    "S3_BUCKET": "'$S3_BUCKET'",
    "CLOUDFRONT_DOMAIN": "'$CLOUDFRONT_DOMAIN'",
    "CLOUDFRONT_DISTRIBUTION_ID": "'$CLOUDFRONT_DISTRIBUTION_ID'",
    "GOOGLE_OAUTH_CLIENT_ID": "'$GOOGLE_OAUTH_CLIENT_ID'",
    "GOOGLE_OAUTH_CLIENT_SECRET": "'$GOOGLE_OAUTH_CLIENT_SECRET'",
    "CACHE_BACKEND": "redis",
    "FREE_TIER_DAILY_LIMIT": "3",
    "PRO_TIER_DAILY_LIMIT": "1000"
}'

if [ $? -eq 0 ]; then
    echo "✅ All environment variables added successfully to Amplify!"
    echo ""
    echo "🔍 Verifying configuration..."
    aws amplify get-app --app-id $APP_ID --region $REGION --query 'app.environmentVariables' --output table
    echo ""
    echo "🌐 Your Amplify app: https://console.aws.amazon.com/amplify/home?region=us-east-1#/$APP_ID"
    echo "🚀 Default domain: https://$APP_ID.amplifyapp.com"
else
    echo "❌ Failed to add environment variables to Amplify"
    exit 1
fi