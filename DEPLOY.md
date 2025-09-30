# Deployment Guide

## Quick Deploy to Vercel (Recommended)

### Prerequisites
- GitHub account
- Vercel account (free tier works)
- All API keys ready (see SETUP.md)

### Steps

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/roastmylanding.git
git push -u origin main
```

2. **Connect to Vercel**
- Go to [vercel.com/new](https://vercel.com/new)
- Import your GitHub repository
- Configure project:
  - Framework Preset: **Next.js**
  - Root Directory: `./`
  - Build Command: `pnpm build` (or leave default)
  - Output Directory: `.next`

3. **Add Environment Variables**

Click "Environment Variables" and add ALL variables from your `.env`:

```
NEXT_PUBLIC_SUPABASE_URL=https://wzkbwfajlcekiazbjdhn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

4. **Deploy**
- Click "Deploy"
- Wait 2-3 minutes
- Your app will be live at `https://your-project.vercel.app`

### Post-Deployment

1. **Update Supabase URL Allowlist**
   - Go to Supabase Dashboard > Authentication > URL Configuration
   - Add your Vercel URL to "Site URL" and "Redirect URLs"

2. **Test the App**
   - Visit your deployed URL
   - Try roasting a landing page
   - Check all features work

3. **Set up Custom Domain** (Optional)
   - Go to Vercel Project Settings > Domains
   - Add your custom domain
   - Follow DNS configuration instructions

## Alternative: Deploy to Other Platforms

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL=...
# (add all other variables)

# Deploy
railway up
```

### Render

1. Create new Web Service
2. Connect GitHub repo
3. Set build command: `pnpm install && pnpm build`
4. Set start command: `pnpm start`
5. Add environment variables in dashboard
6. Deploy

### DigitalOcean App Platform

1. Create new App
2. Connect GitHub repo
3. Configure build:
   - Build Command: `pnpm install && pnpm build`
   - Run Command: `pnpm start`
4. Add environment variables
5. Deploy

## Important: Playwright in Production

⚠️ **Playwright Issue**: Vercel's serverless functions don't support full Playwright/Chromium.

### Solutions:

#### Option 1: Use Browserless (Recommended)
```bash
# Add to your .env
BROWSERLESS_API_KEY=your-key
BROWSERLESS_URL=wss://chrome.browserless.io?token=your-key
```

Update `src/lib/screenshot.ts`:
```typescript
browser = await chromium.connect(process.env.BROWSERLESS_URL!)
```

Cost: ~$50/month for 1000 screenshots

#### Option 2: Use Puppeteer with chrome-aws-lambda
```bash
pnpm remove playwright-core
pnpm add puppeteer-core chrome-aws-lambda
```

Then update screenshot service to use puppeteer.

#### Option 3: Deploy Screenshot Service Separately
- Deploy screenshot service to Railway/Render with full Chrome
- Create API endpoint for screenshots
- Update main app to call screenshot API

## Production Checklist

Before launching:

- [ ] All environment variables set in Vercel
- [ ] Database schema deployed to Supabase
- [ ] Redis cache configured
- [ ] All three AI providers have API keys with credits
- [ ] Screenshot capture solution implemented (Browserless or alternative)
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (automatic with Vercel)
- [ ] Error monitoring set up (Sentry recommended)
- [ ] Analytics tracking added (GA4 or PostHog)
- [ ] Rate limiting tested and working
- [ ] Test full roast flow on production
- [ ] Supabase URL allowlist updated
- [ ] CORS settings verified
- [ ] API endpoints secured
- [ ] Share cards generating correctly
- [ ] Social media previews working

## Monitoring & Maintenance

### Set up Monitoring

1. **Vercel Analytics** (Built-in)
   - Automatic with Vercel deployment
   - Monitor page views, errors, performance

2. **Sentry** (Error Tracking)
```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

3. **Upstash Monitoring**
   - Check Redis dashboard for cache hits/misses
   - Monitor API costs

4. **Supabase Monitoring**
   - Check database performance
   - Monitor API requests
   - Watch for slow queries

### Cost Monitoring

Track your monthly costs:
- Vercel: Free tier or $20/month
- Supabase: Free tier or $25/month
- Upstash Redis: Free tier (10K requests/day)
- OpenAI: ~$200-300/month (based on usage)
- Anthropic: ~$100-150/month
- Google Gemini: ~$50-100/month
- Browserless: $50/month (if using)

**Total**: ~$500-700/month at scale

### Scaling Tips

1. **Optimize AI Costs**
   - Increase cache TTL
   - Use cheaper models for retries
   - Implement request deduplication

2. **Database Optimization**
   - Add indexes for slow queries
   - Archive old roasts
   - Use materialized views

3. **CDN & Caching**
   - Use Vercel Edge Network
   - Cache static assets aggressively
   - Implement ISR for leaderboard

## Rollback

If something goes wrong:

```bash
# Via Vercel Dashboard
# Go to Deployments > Previous Deployment > Promote to Production

# Or via CLI
vercel rollback
```

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Check browser console for errors
4. Review this guide
5. Open an issue on GitHub