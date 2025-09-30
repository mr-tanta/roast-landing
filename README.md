# RoastMyLanding

Get brutally honest, AI-powered landing page feedback in 10 seconds.

Built with Next.js 15, TypeScript, Supabase, and multi-model AI (GPT-4, Claude 3, Gemini).

## Features

- **Multi-Model AI Analysis**: Combines GPT-4 Vision, Claude 3 Opus, and Gemini Pro for accurate scoring
- **Instant Screenshots**: Automated desktop and mobile screenshots via Playwright
- **Smart Caching**: 3-tier Redis caching for cost optimization
- **Viral Share Cards**: Auto-generated social media cards for each roast
- **Rate Limiting**: Free tier (3/day) and Pro tier (unlimited)
- **Conversion Scoring**: 5 key metrics (headline, trust, visual, CTA, speed)
- **Actionable Insights**: Specific issues with fixes and quick wins

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis
- **Storage**: Vercel Blob
- **AI**: OpenAI, Anthropic, Google Gemini
- **Screenshots**: Playwright
- **Image Processing**: Sharp
- **Payments**: Stripe
- **Styling**: TailwindCSS 4

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Supabase account
- Upstash Redis account
- API keys for OpenAI, Anthropic, and Google AI

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/roastmylanding.git
cd roastmylanding
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the database schema:
```bash
# Copy the SQL from supabase/schema.sql and run it in your Supabase SQL editor
```

3. Enable Row Level Security policies (already included in schema.sql)

### Upstash Redis Setup

1. Create a free Redis database at [upstash.com](https://upstash.com)
2. Copy the REST URL and token to your `.env.local`

### AI API Keys Setup

1. **OpenAI**: Get API key from [platform.openai.com](https://platform.openai.com)
2. **Anthropic**: Get API key from [console.anthropic.com](https://console.anthropic.com)
3. **Google AI**: Get API key from [makersuite.google.com](https://makersuite.google.com/app/apikey)

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── roast/          # Main roasting endpoint
│   │   └── leaderboard/    # Leaderboard endpoint
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── components/
│   ├── roast-form.tsx      # URL input form
│   └── roast-display.tsx   # Results display
├── lib/
│   ├── ai/
│   │   └── multi-model-service.ts  # AI ensemble
│   ├── supabase/
│   │   ├── client.ts       # Browser client
│   │   └── server.ts       # Server client
│   ├── redis.ts            # Cache manager
│   ├── screenshot.ts       # Playwright service
│   ├── share-card.ts       # Share card generator
│   └── storage.ts          # Vercel Blob uploads
└── types/
    └── index.ts            # TypeScript types
```

## API Endpoints

### POST /api/roast

Generate a roast for a landing page.

**Request:**
```json
{
  "url": "https://example.com",
  "forceRefresh": false
}
```

**Response:**
```json
{
  "id": "uuid",
  "url": "https://example.com",
  "score": 7,
  "roast": "Your landing page is...",
  "breakdown": {
    "headline": 2,
    "trust": 1,
    "visual": 2,
    "cta": 1,
    "speed": 1
  },
  "issues": [...],
  "quickWins": [...],
  "desktopScreenshotUrl": "https://...",
  "shareCardUrl": "https://...",
  "cached": false,
  "processingTime": 12543
}
```

### GET /api/roast?id={roastId}

Retrieve a specific roast by ID.

### GET /api/leaderboard?limit=10&type=top

Get top or bottom scoring landing pages.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables
4. Deploy

### Environment Variables

Make sure to add all environment variables from `.env.example` in your Vercel project settings.

### Playwright Setup for Production

For production, you may need to use a service like [Browserless](https://browserless.io) or set up a dedicated screenshot service on a VPS, as Playwright requires system dependencies that may not be available on serverless platforms.

Alternative: Use Puppeteer with chrome-aws-lambda for AWS Lambda/Vercel compatibility.

## Cost Optimization

- **Caching**: 3-tier Redis caching reduces AI API calls by ~60%
- **Image Optimization**: Sharp compresses screenshots to reduce storage costs
- **Rate Limiting**: Free tier limits prevent abuse
- **Multi-Model Fallback**: Use cheaper models when primary fails

### Estimated Monthly Costs (10K users)

- AI APIs (GPT-4, Claude, Gemini): ~$580
- Upstash Redis: $0 (free tier)
- Vercel Hosting: $20
- Vercel Blob Storage: ~$5
- Supabase: $25
- **Total**: ~$630/month

With 350 paid users at $29/month = $10,150 revenue
**Gross Margin**: ~93.8%

## Rate Limits

- **Free Tier**: 3 roasts per day
- **Pro Tier**: Unlimited roasts
- **IP-based rate limiting** for non-authenticated users

## Security

- Input URL sanitization to prevent SSRF attacks
- Row Level Security (RLS) in Supabase
- Rate limiting on all API endpoints
- Content Security Policy (CSP) headers
- Environment variable validation

## Roadmap

- [ ] Supabase authentication
- [ ] Stripe payment integration
- [ ] Competitor analysis feature
- [ ] AI rewrite suggestions
- [ ] Team collaboration
- [ ] Chrome extension
- [ ] API access for developers
- [ ] White-label options

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT

## Support

For support, email support@roastmylanding.com or join our Discord.