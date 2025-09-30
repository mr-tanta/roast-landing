# RoastMyLanding Production Deployment Guide

## AWS Amplify Setup ✅ COMPLETED

Your AWS Amplify app has been created and configured:
- **App ID**: `d29z8nh5m7c4h1`
- **Default Domain**: `d29z8nh5m7c4h1.amplifyapp.com`
- **Build Configuration**: Next.js with pnpm (8GB compute)
- **Basic Environment Variables**: Set

## Manual Steps Required

### 1. Connect GitHub Repository

Visit the AWS Amplify Console:
```
https://console.aws.amazon.com/amplify/home?region=us-east-1#/d29z8nh5m7c4h1
```

1. Click **"Connect repository"**
2. Choose **GitHub** and authorize AWS Amplify
3. Select repository: **mr-tanta/roast-landing**
4. Choose branch: **main**
5. The build will start automatically

### 2. Add Secret Environment Variables

In the Amplify Console, go to **Environment variables** and add:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Stripe Configuration  
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...

# AI Provider Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=4
REDIS_URL=redis://:password@host:6379/4
```

### 3. Custom Domain Setup (roastmylanding.com)

1. In Amplify Console, go to **Domain management**
2. Click **Add domain**
3. Enter: `roastmylanding.com`
4. Configure DNS records in your domain provider:
   - Add CNAME record for `www` pointing to the Amplify domain
   - Add ANAME/ALIAS record for root domain

### 4. Enable CI/CD Integration

Update your GitHub Actions workflow to trigger Amplify deployments:

```yaml
# Add to .github/workflows/ci-cd.yml after successful tests
  deploy-production:
    name: Deploy to Production (Amplify)
    runs-on: ubuntu-latest
    needs: [frontend, integration-tests]
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Trigger Amplify Deployment
        run: |
          aws amplify start-job --app-id d29z8nh5m7c4h1 --branch-name main --job-type RELEASE
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Build Configuration

The `amplify.yml` file is configured for:
- **Package Manager**: pnpm v9
- **Build Command**: `pnpm run build:prod`
- **Output Directory**: `.next`
- **Caching**: Enabled for `node_modules` and `.next/cache`
- **Compute**: 8GB for optimal performance

## Post-Deployment Verification

Once deployed, verify:

1. **Health Check**: Visit `https://d29z8nh5m7c4h1.amplifyapp.com/health`
2. **API Integration**: Test the roast functionality
3. **Authentication**: Test Supabase login/signup
4. **Payments**: Test Stripe checkout flow
5. **Performance**: Check loading times and responsiveness

## Monitoring & Alerts

Set up monitoring in AWS CloudWatch:
- **Error Rates**: Monitor 4xx/5xx responses
- **Response Times**: Track API performance  
- **Traffic**: Monitor user engagement
- **Build Failures**: Alert on deployment issues

## Support

If you encounter issues:
1. Check Amplify build logs in the console
2. Verify all environment variables are set correctly
3. Ensure GitHub webhook is properly configured
4. Check CloudWatch logs for runtime errors

---

**Status**: Ready for GitHub connection and secret environment variables
**Next Action**: Visit the Amplify Console link above to complete the setup