#!/bin/bash

# Deploy API Gateway for RoastMyLanding
set -e

echo "🌐 Deploying RoastMyLanding API Gateway..."

# Configuration
API_NAME="roastmylanding-api"
LAMBDA_FUNCTION_NAME="roastmylanding-roast-handler"
STAGE_NAME="prod"

# Get Lambda function ARN
echo "📋 Getting Lambda function details..."
LAMBDA_ARN=$(aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --query 'Configuration.FunctionArn' --output text)
echo "Lambda ARN: $LAMBDA_ARN"

# Check if API already exists
echo "🔍 Checking if API Gateway already exists..."
EXISTING_API=$(aws apigatewayv2 get-apis --query "Items[?Name=='$API_NAME'].ApiId" --output text)

if [ -n "$EXISTING_API" ] && [ "$EXISTING_API" != "None" ]; then
    echo "📝 API Gateway already exists with ID: $EXISTING_API"
    API_ID=$EXISTING_API
    
    # Update CORS configuration
    aws apigatewayv2 update-api \
        --api-id $API_ID \
        --cors-configuration AllowOrigins="*",AllowMethods="GET,POST,OPTIONS",AllowHeaders="Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
    
    echo "✅ Updated existing API Gateway"
else
    echo "✨ Creating new API Gateway..."
    
    # Create API Gateway
    API_RESPONSE=$(aws apigatewayv2 create-api \
        --name $API_NAME \
        --protocol-type HTTP \
        --description "API for RoastMyLanding service" \
        --cors-configuration AllowOrigins="*",AllowMethods="GET,POST,OPTIONS",AllowHeaders="Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token")
    
    API_ID=$(echo $API_RESPONSE | jq -r '.ApiId')
    echo "✅ Created API Gateway with ID: $API_ID"
    
    # Create Lambda integration
    echo "🔗 Creating Lambda integration..."
    INTEGRATION_RESPONSE=$(aws apigatewayv2 create-integration \
        --api-id $API_ID \
        --integration-type AWS_PROXY \
        --integration-uri $LAMBDA_ARN \
        --payload-format-version "2.0")
    
    INTEGRATION_ID=$(echo $INTEGRATION_RESPONSE | jq -r '.IntegrationId')
    echo "✅ Created integration with ID: $INTEGRATION_ID"
    
    # Create routes
    echo "🛤️  Creating API routes..."
    
    # POST /roast route
    aws apigatewayv2 create-route \
        --api-id $API_ID \
        --route-key "POST /roast" \
        --target "integrations/$INTEGRATION_ID" > /dev/null
    echo "✅ Created POST /roast route"
    
    # GET /health route
    aws apigatewayv2 create-route \
        --api-id $API_ID \
        --route-key "GET /health" \
        --target "integrations/$INTEGRATION_ID" > /dev/null
    echo "✅ Created GET /health route"
    
    # Create stage
    echo "🎭 Creating production stage..."
    aws apigatewayv2 create-stage \
        --api-id $API_ID \
        --stage-name $STAGE_NAME \
        --description "Production stage for RoastMyLanding API" \
        --auto-deploy > /dev/null
    echo "✅ Created production stage"
fi

# Get API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api --api-id $API_ID --query 'ApiEndpoint' --output text)
FULL_URL="$API_ENDPOINT/$STAGE_NAME"

echo ""
echo "🎉 API Gateway deployment completed!"
echo "📝 API Details:"
echo "   API ID: $API_ID"
echo "   API Endpoint: $API_ENDPOINT"
echo "   Production URL: $FULL_URL"
echo ""
echo "🔗 Available Endpoints:"
echo "   POST $FULL_URL/roast"
echo "   GET  $FULL_URL/health"
echo ""
echo "🧪 Test Commands:"
echo "   # Health Check"
echo "   curl -X GET \"$FULL_URL/health\""
echo ""
echo "   # Roast Request"
echo "   curl -X POST \"$FULL_URL/roast\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"url\": \"https://example.com\"}'"
echo ""
echo "✅ API Gateway is ready for use!"