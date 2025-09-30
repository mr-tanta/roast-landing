# RoastMyLanding API Documentation

## Overview

The RoastMyLanding API provides serverless website analysis and roasting capabilities. It's built using AWS Lambda and API Gateway with DynamoDB caching for optimal performance.

## Base URL

```
https://1il9nnkz4b.execute-api.us-east-1.amazonaws.com/prod
```

## Endpoints

### POST /roast

Analyzes a website and returns a humorous roast along with detailed metrics.

**Request:**
```bash
curl -X POST "https://1il9nnkz4b.execute-api.us-east-1.amazonaws.com/prod/roast" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "id": "roast_1759225416410_708wbqfi8",
  "url": "https://example.com/",
  "roast": "The navigation is more confusing than IKEA instructions written in ancient hieroglyphics.",
  "score": 7,
  "breakdown": {
    "design": 7,
    "usability": 6,
    "performance": 9,
    "content": 8,
    "mobile": 7
  },
  "issues": [
    "Poor color contrast affecting readability",
    "Slow loading times on mobile devices",
    "Inconsistent navigation structure"
  ],
  "quickWins": [
    "Optimize images to reduce load times",
    "Improve button contrast and visibility",
    "Add mobile-responsive navigation"
  ],
  "desktopScreenshotUrl": "https://placeholder.pics/svg/1200x630/DEDEDE/555555/Screenshot%20Coming%20Soon",
  "mobileScreenshotUrl": "https://placeholder.pics/svg/375x812/DEDEDE/555555/Mobile%20Screenshot",
  "shareCardUrl": "https://placeholder.pics/svg/1200x630/4F46E5/FFFFFF/Share%20Card",
  "modelAgreement": 0.8720463243682153,
  "timestamp": 1759225416495,
  "userId": null,
  "cached": true,
  "processingTime": 211
}
```

**Response Fields:**
- `id` - Unique identifier for the roast
- `url` - Normalized URL that was analyzed
- `roast` - Humorous critique of the website
- `score` - Overall score (1-10)
- `breakdown` - Detailed scores by category
- `issues` - Identified problems with the website
- `quickWins` - Actionable improvement suggestions
- `desktopScreenshotUrl` - Screenshot URL (placeholder until screenshot service is deployed)
- `mobileScreenshotUrl` - Mobile screenshot URL (placeholder)
- `shareCardUrl` - Social sharing card URL (placeholder)
- `modelAgreement` - AI model confidence score
- `timestamp` - Analysis timestamp
- `userId` - User identifier (null for anonymous requests)
- `cached` - Whether result was served from cache
- `processingTime` - Request processing time in milliseconds

### GET /health

Simple health check endpoint.

**Request:**
```bash
curl -X GET "https://1il9nnkz4b.execute-api.us-east-1.amazonaws.com/prod/health"
```

**Response:**
```json
{
  "error": "URL is required"
}
```

*Note: The health endpoint uses the same Lambda function as /roast, so it requires a URL parameter. This is expected behavior.*

## Error Handling

The API returns appropriate HTTP status codes and error messages:

**400 Bad Request:**
```json
{
  "error": "URL is required"
}
```

**400 Bad Request:**
```json
{
  "error": "Invalid URL format"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to process roast request"
}
```

## Rate Limiting

Currently no rate limiting is implemented, but the DynamoDB cache helps reduce redundant processing of the same URLs.

## Caching

The API uses a multi-tier DynamoDB caching system:
- **HOT Cache**: 5 minutes (instant response)
- **WARM Cache**: 1 hour (fast response)
- **COLD Cache**: 24 hours (longer processing)

Cache keys are generated based on the normalized URL.

## CORS

CORS is enabled for all origins with the following configuration:
- **Allowed Origins**: `*`
- **Allowed Methods**: `GET, POST, OPTIONS`
- **Allowed Headers**: `Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token`

## Architecture

- **Frontend**: API Gateway HTTP API
- **Backend**: AWS Lambda (Node.js 18.x)
- **Cache**: DynamoDB
- **Queue**: SQS (for future screenshot processing)
- **Storage**: S3 (for future screenshot storage)

## Deployment

Use the provided deployment scripts:

```bash
# Deploy everything
./deploy-complete.sh

# Deploy only Lambda function
./deploy-lambda.sh

# Deploy only API Gateway
./deploy-api-gateway.sh
```

## Future Enhancements

1. **Screenshot Service**: Real screenshots instead of placeholders
2. **Custom Domain**: User-friendly API domain
3. **Rate Limiting**: Prevent abuse
4. **Authentication**: API keys or JWT tokens
5. **Webhooks**: Real-time notifications
6. **Analytics**: Usage metrics and insights

## Support

For issues or questions, check the deployment logs in CloudWatch or contact the development team.