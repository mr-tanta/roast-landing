# Database Setup Instructions

## 1. Access Supabase SQL Editor

1. Go to your Supabase dashboard: https://wzkbwfajlcekiazbjdhn.supabase.co
2. Navigate to the **SQL Editor** in the left sidebar
3. Click **New Query**

## 2. Execute the Schema

Copy and paste the entire contents of `./supabase/schema.sql` into the SQL editor and execute it.

This will create:
- ✅ **Tables**: users, roasts, shares, analytics
- ✅ **RLS Policies**: Row-level security for data protection
- ✅ **Indexes**: Performance optimization
- ✅ **Functions**: Automated maintenance and utilities
- ✅ **Materialized Views**: Leaderboard data

## 3. Configure Authentication

### Enable OAuth Providers

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **Google OAuth**:
   - Get Client ID and Secret from [Google Cloud Console](https://console.cloud.google.com/)
   - Set redirect URL: `https://wzkbwfajlcekiazbjdhn.supabase.co/auth/v1/callback`

3. Enable **GitHub OAuth**:
   - Get Client ID and Secret from [GitHub Developer Settings](https://github.com/settings/developers)
   - Set redirect URL: `https://wzkbwfajlcekiazbjdhn.supabase.co/auth/v1/callback`

### Configure Site URL

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `http://localhost:3000` (for development)
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://your-production-domain.com/auth/callback`

## 4. Test Database Connection

Run this command to test the setup:

```bash
pnpm dev
```

Then visit:
- http://localhost:3000 - Home page
- http://localhost:3000/dashboard - Dashboard (requires auth)
- http://localhost:3000/pricing - Pricing page

## 5. Configure Stripe Webhooks

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and update `STRIPE_WEBHOOK_SECRET` in your environment

## 6. Environment Variables Checklist

Make sure all these are set in production:

```bash
# App
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://wzkbwfajlcekiazbjdhn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI Providers
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-api03-...
GEMINI_API_KEY=AIzaSy...

# Redis
REDIS_HOST=50.19.30.7
REDIS_PORT=6379
REDIS_PASSWORD=TantaRedisg6L4YifpS5EOCLDqk3rgg2025!
REDIS_DB=4
REDIS_URL=redis://:TantaRedisg6L4YifpS5EOCLDqk3rgg2025!@50.19.30.7:6379/4

# AWS
AWS_ACCESS_KEY_ID=AKIAVQU2SERZYOJBVXFA
AWS_SECRET_ACCESS_KEY=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
AWS_REGION=us-east-1

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## 7. Testing Authentication Flow

1. **Sign Up**: Click "Get Started" → Create account with email
2. **OAuth**: Test Google/GitHub login
3. **Dashboard**: Verify user dashboard loads
4. **Subscription**: Test trial signup flow

## ✅ Ready to Launch!

Once the database schema is set up and authentication is configured, your RoastMyLanding app is ready for users!

- 🔐 **Authentication**: Complete with OAuth support
- 💳 **Payments**: Stripe integration with webhooks
- 📊 **Database**: Full schema with RLS security
- 🚀 **Deployment**: CI/CD pipeline configured