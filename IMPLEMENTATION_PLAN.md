# RoastMyLanding Implementation Plan

## 🎯 Project Overview
**Goal**: Create a complete SaaS application for AI-powered landing page analysis with subscription-based access.

## 💰 Pricing Strategy

### **Free Tier**
- 3 roasts per day
- Basic analysis
- No screenshots
- Watermarked results

### **Trial Plan (3 Days)**
- **Price**: $1 for 3 days
- Unlimited roasts during trial
- Full AI analysis
- Screenshots included
- No watermarks

### **Pro Monthly**
- **Price**: $19/month
- Unlimited roasts
- Full AI analysis
- High-quality screenshots
- Export features
- Priority support

### **Pro Annual**
- **Price**: $190/year ($15.83/month - 17% savings)
- Same as monthly
- Annual billing discount

## 🏗️ Technical Architecture

### **Authentication Flow**
1. **Unauthenticated**: Free tier (3 roasts/day via IP tracking)
2. **Email Signup**: Account creation with email verification
3. **Social Login**: Google, GitHub integration
4. **Trial Conversion**: $1 trial signup flow
5. **Subscription Management**: Upgrade/downgrade flows

### **Database Schema (Supabase)**
```sql
-- Users table (handled by Supabase Auth)
-- Additional user profile data
create table profiles (
  id uuid references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  subscription_status text default 'free',
  subscription_id text,
  trial_ends_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (id)
);

-- Roasts table
create table roasts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  url text not null,
  roast_data jsonb not null,
  score integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  is_public boolean default false,
  screenshot_desktop_url text,
  screenshot_mobile_url text,
  share_card_url text
);

-- Usage tracking
create table usage_tracking (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  ip_address text, -- for anonymous users
  roast_count integer default 1,
  date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, date),
  unique(ip_address, date)
);

-- Subscriptions
create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  status text not null,
  plan_id text not null,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
```

## 🔐 Environment Variables Needed

### **Core Application**
```env
# App Configuration
NEXT_PUBLIC_APP_URL=https://roastmylanding.com
NODE_ENV=production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (Custom Server)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=4
REDIS_URL=redis://:your-redis-password@your-redis-host:6379/4

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS (for Lambda deployment)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Notifications
SLACK_WEBHOOK_URL=your-slack-webhook-url

# Storage (for screenshots)
VERCEL_BLOB_READ_WRITE_TOKEN=...
```

## 📦 Implementation Phases

### **Phase 1: Authentication & Database Setup**
- [ ] Set up Supabase project and database schema
- [ ] Implement authentication components
- [ ] Create user profile management
- [ ] Set up protected routes

### **Phase 2: Stripe Integration**
- [ ] Create Stripe products and prices
- [ ] Implement checkout flows
- [ ] Set up webhook handlers
- [ ] Build subscription management

### **Phase 3: Usage Tracking & Paywall**
- [ ] Implement rate limiting
- [ ] Create paywall components
- [ ] Track user usage
- [ ] Enforce subscription limits

### **Phase 4: User Dashboard**
- [ ] Build user dashboard
- [ ] Show subscription status
- [ ] Display roast history
- [ ] Account settings

### **Phase 5: Advanced Features**
- [ ] Screenshot generation
- [ ] Share card creation
- [ ] Export functionality
- [ ] Public roast gallery

## 🎨 UI/UX Components Needed

### **Authentication Pages**
- Login/Signup modal
- Email verification
- Password reset
- Social login buttons

### **Pricing Page**
- Pricing tiers display
- Feature comparison
- Trial signup CTA
- Annual discount highlight

### **Dashboard Components**
- Subscription status card
- Usage tracking display
- Roast history table
- Account settings form

### **Paywall Components**
- Usage limit reached modal
- Upgrade prompt overlay
- Trial conversion banner

## 🚀 Stripe Product Setup Commands

```bash
# Create products
stripe products create --name="RoastMyLanding Trial" --description="3-day trial access"
stripe products create --name="RoastMyLanding Pro Monthly" --description="Monthly subscription"
stripe products create --name="RoastMyLanding Pro Annual" --description="Annual subscription"

# Create prices
stripe prices create --product=prod_xxx --unit-amount=100 --currency=usd --nickname="trial-3-day"
stripe prices create --product=prod_xxx --unit-amount=1900 --currency=usd --recurring-interval=month --nickname="pro-monthly"
stripe prices create --product=prod_xxx --unit-amount=19000 --currency=usd --recurring-interval=year --nickname="pro-annual"
```

## 📈 Success Metrics
- User signups per day
- Trial conversion rate
- Monthly recurring revenue (MRR)
- Churn rate
- Usage per user
- Customer acquisition cost (CAC)

---

**Next Steps**: Implement Phase 1 (Authentication & Database) first, then gradually add Stripe integration and paywall features.