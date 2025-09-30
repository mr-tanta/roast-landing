# Setup Guide for RoastMyLanding

## Step 1: Database Setup (5 minutes)

1. Go to your Supabase project: https://supabase.com/dashboard/project/wzkbwfajlcekiazbjdhn

2. Click on **SQL Editor** in the left sidebar

3. Click **New Query**

4. Copy the ENTIRE contents of `supabase/schema.sql` and paste it into the SQL editor

5. Click **Run** or press `Cmd/Ctrl + Enter`

6. Verify tables were created by going to **Table Editor** - you should see:
   - users
   - roasts
   - shares
   - analytics
   - leaderboard (materialized view)

7. Get your service role key:
   - Go to **Project Settings** > **API**
   - Copy the `service_role` key (keep it secret!)
   - Update `.env` with: `SUPABASE_SERVICE_ROLE_KEY=your-actual-key`

## Step 2: Redis Setup (3 minutes)

1. Go to [Upstash Console](https://console.upstash.com/)

2. Create a new Redis database:
   - Click **Create Database**
   - Name: `roastmylanding-cache`
   - Type: **Regional** (or Global for better latency)
   - Region: Choose closest to your users

3. Copy credentials:
   - Click on your database
   - Copy **UPSTASH_REDIS_REST_URL**
   - Copy **UPSTASH_REDIS_REST_TOKEN**
   - Update `.env` with these values

## Step 3: AI API Keys (5 minutes)

### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new secret key
3. Update `.env`: `OPENAI_API_KEY=sk-...`

### Anthropic
1. Go to [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Create new API key
3. Update `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

### Google Gemini
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Update `.env`: `GEMINI_API_KEY=...`

## Step 4: Vercel Blob Storage (2 minutes)

### Option A: Using Vercel (Recommended)
1. Install Vercel CLI: `pnpm add -g vercel`
2. Run: `vercel link`
3. Run: `vercel env pull .env.local`
4. This will automatically add `BLOB_READ_WRITE_TOKEN`

### Option B: Manual Setup
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Create a new project or select existing
3. Go to **Storage** > **Create Database** > **Blob**
4. Copy the token and update `.env`

## Step 5: Test Locally (2 minutes)

```bash
# Install dependencies (if not already done)
pnpm install

# Start dev server
pnpm dev
```

Visit http://localhost:3000 and try roasting a landing page!

## Step 6: Deploy to Production

```bash
# Push to GitHub
git add .
git commit -m "Initial RoastMyLanding implementation"
git push origin main

# Deploy to Vercel
vercel --prod
```

Then add all environment variables in Vercel Dashboard:
- Project Settings > Environment Variables
- Add all variables from `.env`

## Troubleshooting

### "Failed to capture screenshot"
- **Issue**: Playwright dependencies missing
- **Solution**: Use Browserless service or puppeteer with chrome-aws-lambda for production
- **Quick Fix**: Deploy to a VPS with full Chrome support

### "All AI providers failed"
- **Issue**: Invalid API keys
- **Solution**: Verify all three AI API keys are valid and have credits

### "Cache get error"
- **Issue**: Redis connection failed
- **Solution**: Check UPSTASH_REDIS_REST_URL and token are correct

### "Failed to upload image"
- **Issue**: Vercel Blob not configured
- **Solution**: Run `vercel link` and `vercel env pull`

### Database connection errors
- **Issue**: Supabase keys incorrect
- **Solution**: Double-check keys in Project Settings > API

## Next Steps After Setup

1. Test the full flow (roast generation)
2. Set up authentication (optional for MVP)
3. Configure Stripe for payments (optional for MVP)
4. Add custom domain in Vercel
5. Set up monitoring (Sentry, LogRocket, etc.)

## Production Checklist

- [ ] Database schema deployed
- [ ] All environment variables set
- [ ] Redis cache working
- [ ] All three AI providers responding
- [ ] Screenshot capture working
- [ ] Share cards generating
- [ ] Rate limiting enforced
- [ ] Error handling in place
- [ ] Deployed to Vercel
- [ ] Custom domain configured (optional)
- [ ] Analytics tracking (optional)