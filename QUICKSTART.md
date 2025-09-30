# Quick Start Guide - Get Running in 10 Minutes

## Prerequisites Checklist
- [ ] Node.js 20+ installed
- [ ] pnpm installed (`npm i -g pnpm`)
- [ ] Supabase project created
- [ ] Git repository initialized

## Step 1: Dependencies (1 minute)
```bash
pnpm install
```

## Step 2: Environment Variables (3 minutes)

Copy the example file:
```bash
cp .env.example .env.local
```

Update `.env.local` with your keys. You already have:
```env
NEXT_PUBLIC_SUPABASE_URL=https://wzkbwfajlcekiazbjdhn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

**Still need:**
1. **Supabase Service Role Key**
   - Go to: https://supabase.com/dashboard/project/wzkbwfajlcekiazbjdhn/settings/api
   - Copy `service_role` secret (keep it safe!)

2. **Upstash Redis** (Free)
   - Go to: https://console.upstash.com
   - Create database → Copy REST URL & Token

3. **OpenAI API Key**
   - Go to: https://platform.openai.com/api-keys
   - Create key → Copy

4. **Anthropic API Key**
   - Go to: https://console.anthropic.com/settings/keys
   - Create key → Copy

5. **Google Gemini API Key**
   - Go to: https://makersuite.google.com/app/apikey
   - Create key → Copy

6. **Vercel Blob** (Run this):
   ```bash
   pnpm add -g vercel
   vercel link
   vercel env pull .env.local
   ```

## Step 3: Database Setup (2 minutes)

1. Go to: https://supabase.com/dashboard/project/wzkbwfajlcekiazbjdhn/editor
2. Click **SQL Editor** → **New Query**
3. Copy entire contents of `supabase/schema.sql`
4. Paste and click **Run**
5. Verify tables created in **Table Editor**

## Step 4: Test Locally (1 minute)

```bash
pnpm dev
```

Open http://localhost:3000

Try roasting a landing page (e.g., https://vercel.com)

## Step 5: Deploy to Vercel (3 minutes)

```bash
# Commit your code
git add .
git commit -m "Initial RoastMyLanding implementation"
git push

# Deploy
vercel --prod
```

Add environment variables in Vercel dashboard, then redeploy.

## Troubleshooting

### "All AI providers failed"
→ Check API keys are valid and have credits

### "Failed to capture screenshot"
→ For production, use Browserless or puppeteer (see DEPLOY.md)

### "Cache get error"
→ Verify Redis URL and token are correct

### "Database connection errors"
→ Double-check Supabase keys

## What's Next?

1. **Test full flow** - Try roasting multiple pages
2. **Share your first roast** - Post on Twitter/LinkedIn
3. **Add authentication** - Implement Supabase Auth (optional)
4. **Set up Stripe** - Enable payments (optional)
5. **Monitor costs** - Watch API usage
6. **Launch!** - Share on Product Hunt, Reddit, Twitter

## Quick Commands Reference

```bash
# Development
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm tsc --noEmit

# Deploy to Vercel
vercel --prod

# Check logs
vercel logs
```

## Support

- **Setup issues**: See SETUP.md
- **Deploy issues**: See DEPLOY.md
- **General info**: See README.md
- **Project status**: See PROJECT_STATUS.md

---

**You're ready to launch!** 🚀

Once you have API keys configured and the database schema run, you can start generating roasts immediately.