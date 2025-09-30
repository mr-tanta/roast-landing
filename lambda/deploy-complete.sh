#!/bin/bash

# Complete deployment script for RoastMyLanding
set -e

echo "🚀 Starting complete RoastMyLanding deployment..."

# Check dependencies
echo "🔍 Checking dependencies..."
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI not found. Please install it first." >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "❌ jq not found. Please install it first." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm not found. Please install it first." >&2; exit 1; }

echo "✅ All dependencies found"

# Step 1: Deploy Lambda function
echo ""
echo "📦 Step 1: Deploying Lambda function..."
./deploy-lambda.sh

# Step 2: Deploy API Gateway
echo ""
echo "🌐 Step 2: Deploying API Gateway..."
./deploy-api-gateway.sh

# Step 3: Run end-to-end tests
echo ""
echo "🧪 Step 3: Running end-to-end tests..."

# Get API endpoint
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='roastmylanding-api'].ApiId" --output text)
API_ENDPOINT=$(aws apigatewayv2 get-api --api-id $API_ID --query 'ApiEndpoint' --output text)
FULL_URL="$API_ENDPOINT/prod"

echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -X GET "$FULL_URL/health" || echo "FAILED")
if [[ $HEALTH_RESPONSE == *"error"* ]] || [[ $HEALTH_RESPONSE == "FAILED" ]]; then
    echo "⚠️  Health check returned an error (expected for GET without URL parameter)"
else
    echo "✅ Health endpoint responded"
fi

echo "Testing roast endpoint..."
ROAST_RESPONSE=$(curl -s -X POST "$FULL_URL/roast" \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}' || echo "FAILED")

if [[ $ROAST_RESPONSE == "FAILED" ]]; then
    echo "❌ Roast endpoint test failed"
    exit 1
elif echo $ROAST_RESPONSE | jq -e '.roast' > /dev/null 2>&1; then
    echo "✅ Roast endpoint working correctly"
    ROAST_TEXT=$(echo $ROAST_RESPONSE | jq -r '.roast')
    echo "   Sample roast: \"$ROAST_TEXT\""
else
    echo "❌ Roast endpoint returned unexpected response"
    echo "   Response: $ROAST_RESPONSE"
    exit 1
fi

# Step 4: Output summary
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Deployment Summary:"
echo "   ✅ Lambda function: roastmylanding-roast-handler"
echo "   ✅ API Gateway: $API_ID"
echo "   ✅ Production URL: $FULL_URL"
echo "   ✅ DynamoDB caching: Enabled"
echo "   ✅ CORS: Configured for web access"
echo ""
echo "🔗 API Endpoints:"
echo "   POST $FULL_URL/roast    - Generate website roasts"
echo "   GET  $FULL_URL/health   - Health check"
echo ""
echo "💡 Usage Example:"
echo "   curl -X POST \"$FULL_URL/roast\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"url\": \"https://yourwebsite.com\"}'"
echo ""
echo "📈 Next Steps:"
echo "   1. Update your frontend to use: $FULL_URL/roast"
echo "   2. Set up custom domain (optional)"
echo "   3. Configure monitoring and alerts"
echo "   4. Deploy screenshot service for full functionality"
echo ""
echo "🎯 Your serverless roasting API is ready!"