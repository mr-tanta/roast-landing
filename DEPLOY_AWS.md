# AWS Deployment Guide - RoastMyLanding

This guide covers deploying RoastMyLanding to AWS using the enterprise-grade architecture outlined in the technical requirements.

## Overview

The AWS deployment includes:

- **Lambda Functions**: Serverless API handling
- **EC2 Screenshot Service**: Dedicated Playwright instances
- **ElastiCache Redis**: High-performance caching
- **S3 + CloudFront**: Asset storage and CDN
- **API Gateway**: REST API endpoints
- **CloudWatch**: Monitoring and alerting
- **SQS**: Async job processing

## Prerequisites

### Required Accounts & Services
- [ ] AWS Account with programmatic access
- [ ] Supabase project (existing)
- [ ] OpenAI API account with credits
- [ ] Anthropic Claude API account with credits
- [ ] Google Gemini API account with credits
- [ ] GitHub repository with Actions enabled
- [ ] Domain name (optional, but recommended)

### Local Development Tools
- [ ] AWS CLI v2 installed and configured
- [ ] Terraform v1.6.0+ installed
- [ ] Node.js 20+ installed
- [ ] Docker installed (for local testing)

## Step 1: AWS Account Setup

### 1.1 Create IAM User for Deployment
```bash
# Create IAM user with programmatic access
aws iam create-user --user-name roastmylanding-deploy

# Attach required policies
aws iam attach-user-policy --user-name roastmylanding-deploy --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
aws iam attach-user-policy --user-name roastmylanding-deploy --policy-arn arn:aws:iam::aws:policy/IAMFullAccess

# Create access key
aws iam create-access-key --user-name roastmylanding-deploy
```

### 1.2 Configure AWS CLI
```bash
aws configure
# AWS Access Key ID: [your-access-key-id]
# AWS Secret Access Key: [your-secret-access-key]
# Default region name: us-east-1
# Default output format: json
```

## Step 2: Infrastructure Deployment

### 2.1 Initialize Terraform State Backend
```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://roastmylanding-terraform-state-$(openssl rand -hex 4)

# Create DynamoDB table for state locking
aws dynamodb create-table \
    --table-name terraform-locks \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST
```

### 2.2 Deploy Infrastructure with Terraform
```bash
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply infrastructure
terraform apply tfplan
```

**Expected Output:**
```
Apply complete! Resources: 47 added, 0 changed, 0 destroyed.

Outputs:
cloudfront_domain_name = "d123456789.cloudfront.net"
redis_endpoint = "roastmylanding-redis.abc123.cache.amazonaws.com"
s3_bucket_name = "roastmylanding-screenshots-prod"
sqs_queue_url = "https://sqs.us-east-1.amazonaws.com/123456789012/roastmylanding-screenshot-jobs"
```

## Step 3: Database Setup

### 3.1 Run Supabase Schema
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to SQL Editor
3. Copy and run the entire `supabase/schema.sql` file
4. Verify tables were created in Table Editor

### 3.2 Get Supabase Credentials
```bash
# From your Supabase dashboard:
# Project Settings > API
# Copy service_role key (keep it secret!)
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..."
```

## Step 4: GitHub Actions Setup

### 4.1 Repository Secrets
Add these secrets to your GitHub repository (`Settings` > `Secrets and variables` > `Actions`):

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_ACCOUNT_ID="123456789012"

# Infrastructure
S3_BUCKET="roastmylanding-screenshots-prod"
SQS_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/123456789012/roastmylanding-screenshot-jobs"
REDIS_URL="rediss://roastmylanding-redis.abc123.cache.amazonaws.com:6379"

# Database
SUPABASE_URL="https://wzkbwfajlcekiazbjdhn.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..."
NEXT_PUBLIC_SUPABASE_URL="https://wzkbwfajlcekiazbjdhn.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIs..."

# AI APIs
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GEMINI_API_KEY="AIzaSy..."

# Optional
SONAR_TOKEN="..." # For code quality scanning
```

### 4.2 Trigger First Deployment
```bash
git add .
git commit -m "feat: add AWS infrastructure and deployment pipeline"
git push origin main
```

This will trigger the GitHub Actions workflow that:
1. Runs tests and builds the application
2. Applies Terraform infrastructure
3. Builds and deploys Lambda functions
4. Creates API Gateway endpoints
5. Deploys EC2 screenshot service
6. Runs smoke tests

## Step 5: Verify Deployment

### 5.1 Check API Gateway
```bash
# Get API Gateway URL from AWS Console or:
API_URL=$(aws apigateway get-rest-apis --query "items[?name=='roastmylanding-api'].id" --output text)
echo "https://${API_URL}.execute-api.us-east-1.amazonaws.com/prod"

# Test health endpoint
curl https://${API_URL}.execute-api.us-east-1.amazonaws.com/prod/health
```

### 5.2 Test Roast Generation
```bash
curl -X POST https://${API_URL}.execute-api.us-east-1.amazonaws.com/prod/roast \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### 5.3 Check Screenshot Service
```bash
# Check EC2 instances
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=roastmylanding-screenshot-service" \
  --query "Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress]"
```

### 5.4 Monitor Logs
```bash
# Lambda logs
aws logs tail /aws/lambda/roastmylanding-roast-handler --follow

# Screenshot service logs
aws logs tail /roastmylanding/screenshot-service --follow
```

## Step 6: Domain Configuration (Optional)

### 6.1 Setup Custom Domain
```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name roastmylanding.com \
  --domain-name "*.roastmylanding.com" \
  --validation-method DNS

# Add custom domain to API Gateway
aws apigatewayv2 create-domain-name \
  --domain-name api.roastmylanding.com \
  --domain-name-configurations CertificateArn=arn:aws:acm:...
```

### 6.2 Update DNS Records
Add these DNS records to your domain:

```
Type    Name                Value
CNAME   api                 abcdef1234.execute-api.us-east-1.amazonaws.com
CNAME   assets              d123456789.cloudfront.net
```

## Step 7: Monitoring & Alerting

### 7.1 CloudWatch Dashboards
The Terraform configuration creates CloudWatch dashboards automatically. Access them at:
- [AWS CloudWatch Console](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:)

### 7.2 Set up Alerts
```bash
# High error rate alert
aws cloudwatch put-metric-alarm \
  --alarm-name "RoastMyLanding-HighErrorRate" \
  --alarm-description "Alert when error rate > 5%" \
  --metric-name "ErrorRate" \
  --namespace "RoastMyLanding" \
  --statistic Average \
  --period 300 \
  --threshold 0.05 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# High API latency alert  
aws cloudwatch put-metric-alarm \
  --alarm-name "RoastMyLanding-HighLatency" \
  --alarm-description "Alert when API latency > 3000ms" \
  --metric-name "Duration" \
  --namespace "AWS/Lambda" \
  --statistic Average \
  --period 300 \
  --threshold 3000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3
```

## Step 8: Performance Optimization

### 8.1 Enable Auto Scaling
```bash
# Create Auto Scaling Group for screenshot service
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name roastmylanding-screenshot-asg \
  --launch-template LaunchTemplateName=roastmylanding-screenshot-service \
  --min-size 1 \
  --max-size 5 \
  --desired-capacity 2 \
  --vpc-zone-identifier "subnet-abc123,subnet-def456" \
  --health-check-type EC2 \
  --health-check-grace-period 300

# Create scaling policies
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name roastmylanding-screenshot-asg \
  --policy-name scale-up \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration file://scaling-policy.json
```

### 8.2 Configure Lambda Reserved Concurrency
```bash
# Reserve 50 concurrent executions for consistent performance
aws lambda put-reserved-concurrency-config \
  --function-name roastmylanding-roast-handler \
  --reserved-concurrent-executions 50
```

## Step 9: Security Hardening

### 9.1 Enable GuardDuty
```bash
aws guardduty create-detector --enable
```

### 9.2 Configure WAF (Web Application Firewall)
```bash
# Create IP rate limiting rule
aws wafv2 create-web-acl \
  --name roastmylanding-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://waf-rules.json
```

### 9.3 Enable AWS Config
```bash
aws configservice put-configuration-recorder \
  --configuration-recorder name=roastmylanding-config,roleARN=arn:aws:iam::123456789012:role/aws-config-role

aws configservice put-delivery-channel \
  --delivery-channel name=roastmylanding-config-delivery,s3BucketName=roastmylanding-config-bucket
```

## Step 10: Cost Optimization

### 10.1 Set up Cost Alerts
```bash
# Create budget alert for monthly costs
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://budget-config.json
```

### 10.2 Enable Spot Instances for Screenshot Service
Update the launch template to use Spot instances:
```bash
aws ec2 modify-launch-template \
  --launch-template-name roastmylanding-screenshot-service \
  --launch-template-data '{"InstanceMarketOptions":{"MarketType":"spot","SpotOptions":{"MaxPrice":"0.05"}}}'
```

## Troubleshooting

### Common Issues

**1. Terraform State Lock**
```bash
# If Terraform state is locked
aws dynamodb delete-item \
  --table-name terraform-locks \
  --key '{"LockID":{"S":"terraform-state-lock-id"}}'
```

**2. Lambda Function Not Found**
```bash
# Check if function exists
aws lambda get-function --function-name roastmylanding-roast-handler

# Check CloudWatch logs for errors
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/roastmylanding
```

**3. Screenshot Service Not Starting**
```bash
# SSH into EC2 instance (requires key pair)
ssh -i your-key.pem ec2-user@instance-ip

# Check service status
sudo systemctl status screenshot-service
sudo journalctl -u screenshot-service -f
```

**4. High Costs**
```bash
# Check cost breakdown
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

## Monitoring Costs

### Expected Monthly Costs (10K users, 1K roasts/day)

| Service | Cost |
|---------|------|
| Lambda (1M requests) | $20 |
| EC2 (t3.medium × 2) | $60 |
| ElastiCache (t3.micro) | $12 |
| S3 Storage (100GB) | $23 |
| CloudFront (500GB) | $46 |
| API Gateway (1M requests) | $3.50 |
| SQS (500K messages) | $0.20 |
| **Total Infrastructure** | **$165** |
| AI APIs (estimated) | $580 |
| **Total Monthly Cost** | **$745** |

### Revenue Projection
- Free users: 9,650 (96.5%)
- Paid users: 350 (3.5% conversion)
- Monthly revenue: $10,150 (350 × $29)
- **Gross margin: 92.7%**

## Next Steps

1. **Monitor Performance**: Watch CloudWatch metrics for first 48 hours
2. **Optimize Costs**: Adjust instance sizes based on actual usage
3. **Scale Testing**: Use load testing to verify 10K user capacity
4. **Add Features**: Implement authentication, payments, etc.
5. **Marketing**: Launch on Product Hunt, social media, etc.

## Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review CloudWatch logs
3. Verify environment variables
4. Test individual components
5. Check AWS service health dashboard

## Security Checklist

Before going live:

- [ ] All API keys are in GitHub Secrets (never in code)
- [ ] WAF is configured and active
- [ ] GuardDuty is enabled
- [ ] SSL/TLS certificates are valid
- [ ] Database access is restricted to VPC
- [ ] S3 buckets have proper access policies
- [ ] IAM roles follow least privilege principle
- [ ] CloudTrail is enabled for audit logging
- [ ] Backup strategy is in place

## Performance Targets

The architecture is designed to achieve:

- **Response Time**: < 3 seconds for roast generation
- **Uptime**: 99.9% availability
- **Scalability**: 10,000+ concurrent users
- **Cache Hit Rate**: > 60%
- **Cost per Roast**: < $0.75

---

🚀 **You're ready to launch!** Your AWS-first RoastMyLanding architecture is production-ready and can scale to handle significant traffic while maintaining excellent performance and cost efficiency.