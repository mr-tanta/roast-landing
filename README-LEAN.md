# RoastMyLanding - Lean AWS Deployment 

🚀 **Under $100/month** AWS architecture for RoastMyLanding MVP

## 💰 Cost Summary

| Component | Monthly Cost | Details |
|-----------|-------------|---------|
| EC2 (t3.micro) | $7-9 | Screenshot service |
| Lambda + API Gateway | $2-8 | API handling |
| DynamoDB | $2-10 | Cache (pay-per-request) |
| S3 + Requests | $3-8 | Screenshot storage |
| SQS | $0.20 | Job queue |
| CloudWatch | $1-3 | Logs (short retention) |
| **Total** | **$15-38/month** | **Scales with usage** |

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐
│  Next.js App    │    │   AWS Lambda     │
│   (Frontend)    │────│   (API Handler)  │
└─────────────────┘    └──────────┬───────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
    ┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
    │   DynamoDB     │   │      SQS       │   │   EC2 t3.micro │
    │    (Cache)     │   │   (Queue)      │   │  (Screenshots) │
    └────────────────┘   └────────────────┘   └───────┬────────┘
                                                      │
                                               ┌──────▼──────┐
                                               │   S3 Bucket │
                                               │ (Screenshots)│
                                               └─────────────┘
```

## 🚀 Quick Start

### Prerequisites

- [x] AWS CLI v2 installed and configured
- [x] AWS credentials with admin permissions
- [x] Terraform installed
- [x] Node.js 20+
- [x] Your Supabase project running
- [x] AI API keys (OpenAI, Anthropic, Gemini)

### Deploy in 10 Minutes

```bash
# 1. Clone or navigate to your project
cd /path/to/roast-landing

# 2. Run the deployment script
./scripts/deploy-lean.sh

# 3. Add your API keys to .env.lean
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GEMINI_API_KEY=AIzaSy...

# 4. Test the deployment
curl -X POST $(cat api-url.txt)/roast \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
```

## 🔧 Key Features

### Cost-Optimized Components

- **DynamoDB Cache**: Replaces expensive ElastiCache Redis
- **Single EC2 Instance**: No auto-scaling (add manually if needed)
- **No NAT Gateway**: Lambda runs without VPC (saves $32+/month)
- **HTTP API Gateway**: Cheaper than REST API
- **Short Log Retention**: 3-7 days vs. default 30 days
- **S3 Lifecycle**: Auto-delete old screenshots after 90 days
- **Pay-per-Request**: DynamoDB and SQS scale to zero

### Performance Features

- **3-Tier Caching**: In-memory LRU + DynamoDB + eventual consistency
- **Async Screenshots**: SQS queue for non-blocking capture
- **Multi-Model AI**: GPT-4 (50%) + Claude (30%) + Gemini (20%)
- **Image Optimization**: Sharp processing for smaller files
- **Browser Optimization**: Resource blocking, fast navigation

## 📊 Monitoring & Cost Control

### Check Your Costs Daily

```bash
# Run this script to monitor spending
./scripts/check-costs.sh
```

### Built-in Cost Controls

- 🎯 **$80 Budget Alert**: Automatic email when approaching limit
- 📈 **Cost Explorer**: Built-in service breakdown
- 🔄 **Auto-cleanup**: S3 lifecycle rules delete old files
- 📉 **Short Retention**: CloudWatch logs purge quickly

### Expected Usage Patterns

| Users/Month | Roasts/Month | Estimated Cost |
|-------------|--------------|----------------|
| 100 | 300 | $15-20 |
| 1,000 | 3,000 | $25-35 |
| 5,000 | 15,000 | $40-60 |
| 10,000 | 30,000 | $70-90 |

## 🛠️ Configuration

### Environment Variables (.env.lean)

```bash
# AWS Settings
AWS_REGION=us-east-1
CACHE_BACKEND=dynamodb
CACHE_TABLE_NAME=roast_cache

# AI API Keys
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GEMINI_API_KEY=AIzaSy-your-key-here

# Supabase (from existing setup)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cost Controls
CLOUDWATCH_LOG_RETENTION_DAYS=7
S3_LIFECYCLE_DAYS=90
```

### Cache Backend Selection

The system automatically uses DynamoDB for caching in budget mode:

```typescript
// Set CACHE_BACKEND=redis to use Redis instead (more expensive)
const CACHE_BACKEND = process.env.CACHE_BACKEND || 'dynamodb';

if (CACHE_BACKEND === 'dynamodb') {
  // Uses DynamoDB with TTL - pay per request
  const cache = new DynamoDBCache();
} else {
  // Uses Redis/ElastiCache - fixed monthly cost
  const cache = new RedisCache();
}
```

## 🔄 Scaling Options

### When to Scale Up

**Scale to Full Architecture** when you hit:
- 10K+ monthly users
- $500+ monthly AI API costs
- Need sub-2s response times
- Need 99.9% uptime SLA

### Scaling Path

1. **Current**: Single EC2 + DynamoDB (~$40/month)
2. **Step 1**: Add ElastiCache Redis (~$60/month total)
3. **Step 2**: Auto Scaling Group + ALB (~$100/month)
4. **Step 3**: Multi-AZ + NAT Gateway (~$150/month)
5. **Step 4**: CloudFront CDN + WAF (~$200/month)
6. **Full**: Original enterprise architecture (~$300/month)

## 🐛 Troubleshooting

### Common Issues

**1. Lambda Timeout**
```bash
# Check CloudWatch logs
aws logs tail /aws/lambda/roastmylanding-roast-handler --follow
```

**2. EC2 Screenshot Service Down**
```bash
# Check instance status
aws ec2 describe-instances --instance-ids $(cat terraform-outputs.json | jq -r '.ec2_instance_id.value')

# SSH to debug (if key pair configured)
ssh ec2-user@$(cat terraform-outputs.json | jq -r '.ec2_public_ip.value')
```

**3. High Costs**
```bash
# Check cost breakdown
./scripts/check-costs.sh

# Check for runaway resources
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running"
```

**4. DynamoDB Throttling**
```bash
# Check metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=roast_cache \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-31T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## 🔒 Security Considerations

### What's Included
- ✅ IAM roles with least privilege
- ✅ S3 bucket encryption at rest
- ✅ HTTPS-only API Gateway
- ✅ Input validation and sanitization
- ✅ Security group restrictions

### Production Hardening
For production, consider adding:
- [ ] WAF for API Gateway
- [ ] VPC Flow Logs
- [ ] GuardDuty threat detection
- [ ] Systems Manager for EC2 access
- [ ] Secrets Manager for API keys

## 📈 Performance Benchmarks

Expected performance with lean architecture:

- **Cold Start**: 8-12 seconds (first roast of the day)
- **Cache Hit**: 0.5-1 second 
- **Cache Miss**: 6-10 seconds (screenshot + AI)
- **Concurrent Users**: 50-100 without issues
- **Daily Throughput**: 1,000+ roasts

## 🚀 Upgrade Path

When you're ready to scale:

```bash
# Switch back to full architecture
cp terraform/main.tf terraform/lean-main.tf.backup
cp terraform/main.tf.full terraform/main.tf  # If you saved it

terraform plan
terraform apply
```

## 📞 Support

- 📧 **Issues**: Create GitHub issue
- 💰 **Cost Problems**: Check `./scripts/check-costs.sh`
- 🐛 **Bugs**: Check CloudWatch logs first
- 📊 **Performance**: Monitor DynamoDB and Lambda metrics

---

## 🎉 You're Ready!

Your lean AWS architecture is deployed and ready to handle thousands of users while keeping costs under $40/month. Monitor your costs daily and scale up components as your traffic grows.

**Next Steps:**
1. Add your AI API keys to `.env.lean`
2. Test the full roast flow
3. Set up your frontend to call the new API
4. Monitor costs with `./scripts/check-costs.sh`
5. Scale components as needed

Happy roasting! 🔥