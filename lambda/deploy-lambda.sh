#!/bin/bash

# Deploy RoastMyLanding Lambda Function
set -e

echo "🚀 Deploying RoastMyLanding Lambda Function..."

# Get Terraform outputs
cd ../terraform
LAMBDA_ROLE_ARN=$(terraform output -raw lambda_role_arn)
SQS_QUEUE_URL=$(terraform output -raw sqs_queue_url)
DYNAMODB_TABLE_NAME=$(terraform output -raw dynamodb_table_name)

cd ../lambda

echo "📦 Installing dependencies..."
npm install --production

echo "🗜️  Creating deployment package..."
zip -r roast-handler.zip . -x "*.sh" "deploy-lambda.sh"

echo "🚀 Creating/updating Lambda function..."

# Check if function exists
if aws lambda get-function --function-name roastmylanding-roast-handler &> /dev/null; then
    echo "📝 Updating existing function..."
    aws lambda update-function-code \
        --function-name roastmylanding-roast-handler \
        --zip-file fileb://roast-handler.zip
    
    # Update environment variables
    aws lambda update-function-configuration \
        --function-name roastmylanding-roast-handler \
        --environment Variables="{
            CACHE_TABLE_NAME=$DYNAMODB_TABLE_NAME,
            SQS_QUEUE_URL=$SQS_QUEUE_URL,
            NODE_ENV=production
        }"
        --timeout 30 \
        --memory-size 512
else
    echo "✨ Creating new function..."
    aws lambda create-function \
        --function-name roastmylanding-roast-handler \
        --runtime nodejs18.x \
        --role "$LAMBDA_ROLE_ARN" \
        --handler roast-handler.handler \
        --zip-file fileb://roast-handler.zip \
        --timeout 30 \
        --memory-size 512 \
        --environment Variables="{
            CACHE_TABLE_NAME=$DYNAMODB_TABLE_NAME,
            SQS_QUEUE_URL=$SQS_QUEUE_URL,
            NODE_ENV=production
        }"
fi

# Get function ARN
FUNCTION_ARN=$(aws lambda get-function --function-name roastmylanding-roast-handler --query 'Configuration.FunctionArn' --output text)

echo "🔧 Setting up Lambda permissions for API Gateway..."
aws lambda add-permission \
    --function-name roastmylanding-roast-handler \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:*:*/*/*" \
    2>/dev/null || echo "Permission already exists"

echo "🧪 Testing Lambda function..."
cat > test-payload.json << EOF
{
  "url": "https://example.com"
}
EOF

aws lambda invoke \
    --function-name roastmylanding-roast-handler \
    --payload fileb://test-payload.json \
    response.json

echo "📋 Lambda response:"
cat response.json | jq '.'

# Clean up
rm -f roast-handler.zip test-payload.json response.json

echo "✅ Lambda function deployed successfully!"
echo "📝 Function ARN: $FUNCTION_ARN"
echo "🌍 Region: us-east-1"
echo "⚡ Runtime: nodejs18.x"
echo "💾 Memory: 512 MB"
echo "⏱️  Timeout: 30 seconds"

echo ""
echo "🔗 Next steps:"
echo "1. Create API Gateway to expose the Lambda function"
echo "2. Test the complete workflow"
echo "3. Set up monitoring and alerts"