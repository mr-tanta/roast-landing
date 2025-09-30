#!/bin/bash

# Deploy RoastMyLanding Lean AWS Architecture
# Estimated cost: $15-40/month

set -e

echo "🚀 Deploying RoastMyLanding Lean AWS Architecture"
echo "💰 Target cost: Under $100/month"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI v2${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured. Run 'aws configure'${NC}"
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}❌ Terraform not found. Please install Terraform${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
    echo ""
}

# Create Terraform state backend
setup_terraform_backend() {
    echo -e "${YELLOW}Setting up Terraform backend...${NC}"
    
    BUCKET_NAME="roastmylanding-terraform-state-$(openssl rand -hex 4)"
    
    # Create S3 bucket for Terraform state
    aws s3 mb "s3://$BUCKET_NAME" || {
        echo -e "${RED}❌ Failed to create S3 bucket for Terraform state${NC}"
        exit 1
    }
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled
    
    # Enable server-side encryption
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'
    
    # Create DynamoDB table for state locking
    aws dynamodb create-table \
        --table-name terraform-locks \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST || {
        echo -e "${YELLOW}⚠️  DynamoDB table already exists (this is fine)${NC}"
    }
    
    # Update Terraform backend configuration
    cat > terraform/backend.tf << EOF
terraform {
  backend "s3" {
    bucket         = "$BUCKET_NAME"
    key            = "lean/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
EOF
    
    echo -e "${GREEN}✅ Terraform backend setup complete${NC}"
    echo -e "   S3 Bucket: $BUCKET_NAME"
    echo ""
}

# Create lean environment config
create_lean_env() {
    echo -e "${YELLOW}Creating lean environment configuration...${NC}"
    
    cat > .env.lean << 'EOF'
# Lean AWS Configuration (Budget Mode)
AWS_REGION=us-east-1

# Cache Backend (DynamoDB for cost savings)
CACHE_BACKEND=dynamodb
CACHE_TABLE_NAME=roast_cache

# Supabase (unchanged)
SUPABASE_URL=https://wzkbwfajlcekiazbjdhn.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://wzkbwfajlcekiazbjdhn.supabase.co

# AI API Keys (add your keys here)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GEMINI_API_KEY=AIzaSy...

# Screenshot Service Settings
SCREENSHOT_TIMEOUT=30000
SCREENSHOT_QUALITY=85

# Development
NODE_ENV=production
LOG_LEVEL=info

# Cost Controls
CLOUDWATCH_LOG_RETENTION_DAYS=7
S3_LIFECYCLE_DAYS=90
EOF
    
    echo -e "${GREEN}✅ Environment configuration created (.env.lean)${NC}"
    echo -e "${YELLOW}⚠️  Please add your API keys to .env.lean${NC}"
    echo ""
}

# Deploy infrastructure
deploy_infrastructure() {
    echo -e "${YELLOW}Deploying infrastructure with Terraform...${NC}"
    
    cd terraform
    
    # Copy lean configuration
    cp lean-main.tf main.tf
    
    # Initialize Terraform
    terraform init
    
    # Validate configuration
    terraform validate
    
    # Plan deployment
    echo -e "${YELLOW}Creating Terraform plan...${NC}"
    terraform plan -out=tfplan
    
    # Show cost estimate
    echo -e "${YELLOW}💰 Estimated monthly costs:${NC}"
    echo "   - EC2 t3.micro: ~$7-9"
    echo "   - S3 storage + requests: ~$3-8"
    echo "   - DynamoDB pay-per-request: ~$2-10"
    echo "   - SQS: ~$0.20"
    echo "   - CloudWatch logs: ~$1-3"
    echo "   - Lambda + API Gateway: ~$2-8"
    echo "   📊 Total: ~$15-38/month base"
    echo ""
    
    read -p "Apply Terraform plan? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        terraform apply tfplan
        echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"
    else
        echo -e "${YELLOW}⏸️  Deployment cancelled${NC}"
        exit 0
    fi
    
    # Save outputs
    terraform output -json > ../terraform-outputs.json
    
    cd ..
    echo ""
}

# Build and deploy Lambda function
deploy_lambda() {
    echo -e "${YELLOW}Building and deploying Lambda function...${NC}"
    
    # Create deployment directory
    mkdir -p dist/lambda
    
    # Copy Lambda code
    cp -r aws/lambda/roast-handler dist/lambda/
    
    # Create package.json for Lambda
    cat > dist/lambda/roast-handler/package.json << 'EOF'
{
  "name": "roastmylanding-lambda",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "aws-sdk": "^2.1500.0",
    "ioredis": "^5.3.0",
    "openai": "^4.52.0",
    "@anthropic-ai/sdk": "^0.24.0",
    "@google/generative-ai": "^0.15.0"
  }
}
EOF
    
    # Install dependencies
    cd dist/lambda/roast-handler
    npm install --production
    
    # Create deployment package
    zip -r ../roast-handler.zip .
    cd ../../..
    
    # Get Lambda role ARN from Terraform outputs
    LAMBDA_ROLE_ARN=$(cat terraform-outputs.json | jq -r '.lambda_role_arn.value')
    
    # Create or update Lambda function
    FUNCTION_EXISTS=$(aws lambda get-function --function-name roastmylanding-roast-handler 2>/dev/null || echo "false")
    
    if [[ "$FUNCTION_EXISTS" == "false" ]]; then
        echo "Creating Lambda function..."
        aws lambda create-function \
            --function-name roastmylanding-roast-handler \
            --runtime nodejs20.x \
            --role "$LAMBDA_ROLE_ARN" \
            --handler index.handler \
            --zip-file fileb://dist/lambda/roast-handler.zip \
            --timeout 30 \
            --memory-size 512 \
            --environment Variables='{
                "CACHE_BACKEND":"dynamodb",
                "CACHE_TABLE_NAME":"roast_cache",
                "AWS_REGION":"us-east-1"
            }'
    else
        echo "Updating Lambda function..."
        aws lambda update-function-code \
            --function-name roastmylanding-roast-handler \
            --zip-file fileb://dist/lambda/roast-handler.zip
    fi
    
    echo -e "${GREEN}✅ Lambda function deployed${NC}"
    echo ""
}

# Create API Gateway
create_api_gateway() {
    echo -e "${YELLOW}Creating API Gateway...${NC}"
    
    # Create HTTP API (cheaper than REST API)
    API_ID=$(aws apigatewayv2 create-api \
        --name roastmylanding-api-lean \
        --protocol-type HTTP \
        --cors-configuration AllowOrigins="*",AllowMethods="GET,POST,OPTIONS",AllowHeaders="*" \
        --query 'ApiId' --output text)
    
    echo "API ID: $API_ID"
    
    # Create integration with Lambda
    INTEGRATION_ID=$(aws apigatewayv2 create-integration \
        --api-id "$API_ID" \
        --integration-type AWS_PROXY \
        --integration-method POST \
        --integration-uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:$(aws sts get-caller-identity --query Account --output text):function:roastmylanding-roast-handler/invocations" \
        --query 'IntegrationId' --output text)
    
    # Create routes
    aws apigatewayv2 create-route \
        --api-id "$API_ID" \
        --route-key "POST /roast" \
        --target "integrations/$INTEGRATION_ID"
    
    aws apigatewayv2 create-route \
        --api-id "$API_ID" \
        --route-key "GET /roast" \
        --target "integrations/$INTEGRATION_ID"
    
    # Create default stage
    aws apigatewayv2 create-stage \
        --api-id "$API_ID" \
        --stage-name '$default' \
        --auto-deploy
    
    # Add Lambda permission for API Gateway
    aws lambda add-permission \
        --function-name roastmylanding-roast-handler \
        --statement-id apigateway-invoke \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:us-east-1:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*"
    
    API_URL="https://$API_ID.execute-api.us-east-1.amazonaws.com"
    echo -e "${GREEN}✅ API Gateway created${NC}"
    echo -e "   API URL: $API_URL"
    
    # Save API URL
    echo "$API_URL" > api-url.txt
    echo ""
}

# Set up cost monitoring
setup_cost_monitoring() {
    echo -e "${YELLOW}Setting up cost monitoring...${NC}"
    
    # Create budget alert
    cat > budget-config.json << 'EOF'
{
  "BudgetName": "RoastMyLanding-Monthly",
  "BudgetType": "COST",
  "TimeUnit": "MONTHLY",
  "BudgetLimit": {
    "Amount": "80.0",
    "Unit": "USD"
  },
  "CostFilters": {
    "TagKey": ["Project"],
    "TagValue": ["RoastMyLanding"]
  }
}
EOF
    
    # Get account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Create budget (this might fail if budget already exists)
    aws budgets create-budget \
        --account-id "$ACCOUNT_ID" \
        --budget file://budget-config.json || {
        echo -e "${YELLOW}⚠️  Budget already exists (this is fine)${NC}"
    }
    
    rm budget-config.json
    
    echo -e "${GREEN}✅ Cost monitoring setup complete${NC}"
    echo -e "   💰 Budget alert set at $80/month"
    echo ""
}

# Final verification
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"
    
    # Check EC2 instance
    EC2_INSTANCE_ID=$(cat terraform-outputs.json | jq -r '.ec2_instance_id.value')
    EC2_STATE=$(aws ec2 describe-instances --instance-ids "$EC2_INSTANCE_ID" --query 'Reservations[0].Instances[0].State.Name' --output text)
    
    echo "EC2 Instance: $EC2_INSTANCE_ID ($EC2_STATE)"
    
    # Check DynamoDB table
    DDB_TABLE=$(aws dynamodb describe-table --table-name roast_cache --query 'Table.TableStatus' --output text)
    echo "DynamoDB Table: roast_cache ($DDB_TABLE)"
    
    # Check S3 bucket
    S3_BUCKET=$(cat terraform-outputs.json | jq -r '.s3_bucket_name.value')
    echo "S3 Bucket: $S3_BUCKET"
    
    # Check Lambda function
    LAMBDA_STATE=$(aws lambda get-function --function-name roastmylanding-roast-handler --query 'Configuration.State' --output text)
    echo "Lambda Function: roastmylanding-roast-handler ($LAMBDA_STATE)"
    
    echo -e "${GREEN}✅ Deployment verification complete${NC}"
    echo ""
}

# Main deployment flow
main() {
    echo "Starting deployment at $(date)"
    echo ""
    
    check_prerequisites
    setup_terraform_backend
    create_lean_env
    deploy_infrastructure
    deploy_lambda
    create_api_gateway
    setup_cost_monitoring
    verify_deployment
    
    echo -e "${GREEN}🎉 Lean AWS deployment complete!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Summary:${NC}"
    echo "   💰 Estimated monthly cost: $15-40"
    echo "   🔗 API URL: $(cat api-url.txt 2>/dev/null || echo 'Check api-url.txt')"
    echo "   📊 Monitor costs in AWS Console > Billing"
    echo ""
    echo -e "${YELLOW}🔧 Next steps:${NC}"
    echo "   1. Add your AI API keys to .env.lean"
    echo "   2. Test the API: curl -X POST $(cat api-url.txt)/roast -H 'Content-Type: application/json' -d '{\"url\":\"https://example.com\"}'"
    echo "   3. Check EC2 screenshot service health: http://$(cat terraform-outputs.json | jq -r '.ec2_public_ip.value'):8080/health"
    echo "   4. Monitor costs in AWS Console"
    echo ""
}

# Run main function
main "$@"