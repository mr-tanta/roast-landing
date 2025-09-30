import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createClient } from '@supabase/supabase-js';
import { SQS } from 'aws-sdk';
import Redis from 'ioredis';
import { MultiModelAIService } from './ai-service';
import { CacheManager } from './cache-manager';
import { DynamoDBCache } from './dynamodb-cache';
import { SecurityManager } from './security';
import { RoastRequest, RoastResult } from './types';

// Initialize services
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sqs = new SQS({ region: process.env.AWS_REGION || 'us-east-1' });
// Select low-cost cache backend by default (DynamoDB). Set CACHE_BACKEND=redis to use Redis.
const CACHE_BACKEND = (process.env.CACHE_BACKEND || 'dynamodb').toLowerCase();

let cacheGet: <T>(key: string) => Promise<T | null>;
let cacheSet: <T>(key: string, value: T, layer?: any) => Promise<void>;
let generateCacheKey: (url: string, options?: Record<string, any>) => string;

if (CACHE_BACKEND === 'redis' && process.env.REDIS_URL) {
  const redis = new Redis(process.env.REDIS_URL!);
  const cacheManager = new CacheManager(redis);
  cacheGet = <T>(key: string) => cacheManager.get<T>(key, 'L2_WARM');
  cacheSet = async <T>(key: string, value: T) => cacheManager.set<T>(key, value, 'L2_WARM');
  generateCacheKey = (url: string, options?: Record<string, any>) => cacheManager.generateCacheKey(url, options);
  console.log('Cache backend: Redis (ElastiCache/Upstash)');
} else {
  const ddbCache = new DynamoDBCache({ tableName: process.env.CACHE_TABLE_NAME });
  cacheGet = <T>(key: string) => ddbCache.get<T>(key);
  cacheSet = async <T>(key: string, value: T) => ddbCache.set<T>(key, value, 3600);
  generateCacheKey = (url: string, options?: Record<string, any>) => {
    const u = new URL(url).toString();
    const optStr = options ? JSON.stringify(options) : '';
    // Simple key to avoid extra crypto dependency in Lambda bundle
    return `md5:${Buffer.from(u + optStr).toString('base64')}`;
  };
  console.log('Cache backend: DynamoDB (budget mode)');
}
const aiService = new MultiModelAIService();

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  
  // Handle warm-up requests
  if (event.source === 'serverless-plugin-warmup') {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Warm!' })
    };
  }

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'X-Request-ID': event.requestContext.requestId,
  };

  try {
    // Handle preflight OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    // Handle GET requests (retrieve roast)
    if (event.httpMethod === 'GET') {
      return await handleGetRoast(event, headers);
    }

    // Handle POST requests (create roast)
    if (event.httpMethod === 'POST') {
      return await handleCreateRoast(event, headers, startTime);
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Handler error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        requestId: event.requestContext.requestId
      })
    };
  }
};

async function handleGetRoast(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const roastId = event.queryStringParameters?.id;

  if (!roastId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Roast ID is required' })
    };
  }

  try {
    // Get roast from database
    const { data: roast, error } = await supabase
      .from('roasts')
      .select('*')
      .eq('id', roastId)
      .single();

    if (error || !roast) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Roast not found' })
      };
    }

    // Increment view count
    await supabase
      .from('roasts')
      .update({ view_count: roast.view_count + 1 })
      .eq('id', roastId);

    const result: RoastResult = {
      id: roast.id,
      url: roast.url,
      roast: roast.roast_text,
      score: roast.score,
      breakdown: roast.score_breakdown,
      issues: roast.issues,
      quickWins: roast.quick_wins,
      desktopScreenshotUrl: roast.desktop_screenshot_url,
      mobileScreenshotUrl: roast.mobile_screenshot_url,
      shareCardUrl: roast.share_card_url,
      modelAgreement: roast.model_agreement,
      timestamp: new Date(roast.created_at).getTime(),
      userId: roast.user_id,
    };

    return {
      statusCode: 200,
      headers: { ...headers, 'X-Cache': 'MISS' },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Get roast error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve roast' })
    };
  }
}

async function handleCreateRoast(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>,
  startTime: number
): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const requestBody: RoastRequest = JSON.parse(event.body);

    // Validate and sanitize URL
    if (!requestBody.url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    let sanitizedUrl: string;
    try {
      sanitizedUrl = SecurityManager.sanitizeUrl(requestBody.url);
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: error instanceof Error ? error.message : 'Invalid URL'
        })
      };
    }

// Check cache first (unless force refresh)
    if (!requestBody.forceRefresh) {
      const cacheKey = generateCacheKey(sanitizedUrl);
      const cached = await cacheGet<RoastResult>(cacheKey);

      if (cached) {
        console.log(`Cache hit for ${sanitizedUrl}`);
        return {
          statusCode: 200,
          headers: { ...headers, 'X-Cache': 'HIT' },
          body: JSON.stringify({
            ...cached,
            cached: true,
            processingTime: Date.now() - startTime,
          })
        };
      }
    }

    // Get user from token (if provided)
    let userId: string | undefined;
    const authHeader = event.headers.Authorization || event.headers.authorization;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (!error && user) {
          userId = user.id;
          
          // Check rate limits
          const { data: userRecord } = await supabase
            .from('users')
            .select('subscription_tier, daily_roasts_count, last_roast_reset')
            .eq('id', userId)
            .single();

          if (userRecord) {
            const limit = userRecord.subscription_tier === 'pro' ? 1000 : 3;
            
            // Reset counter if needed
            const resetTime = new Date(userRecord.last_roast_reset);
            const now = new Date();
            
            if (resetTime.getDate() !== now.getDate()) {
              await supabase
                .from('users')
                .update({ 
                  daily_roasts_count: 0, 
                  last_roast_reset: now.toISOString() 
                })
                .eq('id', userId);
            } else if (userRecord.daily_roasts_count >= limit) {
              return {
                statusCode: 429,
                headers,
                body: JSON.stringify({
                  error: `Daily roast limit reached. ${
                    userRecord.subscription_tier === 'free'
                      ? 'Upgrade to Pro for unlimited roasts.'
                      : 'Please try again tomorrow.'
                  }`
                })
              };
            }

            // Increment counter
            await supabase
              .from('users')
              .update({ 
                daily_roasts_count: userRecord.daily_roasts_count + 1 
              })
              .eq('id', userId);
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
      }
    }

    // Rate limiting by IP for unauthenticated users
    if (!userId) {
      const clientIp = event.requestContext.identity.sourceIp;
      const rateLimitKey = `rate_limit:${clientIp}`;
      const currentCount = await redis.get(rateLimitKey);
      
      if (currentCount && parseInt(currentCount) >= 3) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            error: 'Rate limit exceeded. Please sign up for unlimited roasts.'
          })
        };
      }
      
      await redis.setex(rateLimitKey, 86400, (parseInt(currentCount || '0') + 1).toString());
    }

    // Create roast record
    const { data: roastRecord, error: roastError } = await supabase
      .from('roasts')
      .insert({
        url: sanitizedUrl,
        user_id: userId,
        status: 'processing',
      })
      .select()
      .single();

    if (roastError || !roastRecord) {
      throw new Error('Failed to create roast record');
    }

    // Queue screenshot job
    const jobId = await queueScreenshotJob(sanitizedUrl, roastRecord.id);
    
    // Parallel AI analysis
    console.log(`Starting AI analysis for ${sanitizedUrl}...`);
    const analysis = await aiService.analyzeWithEnsemble(sanitizedUrl);

    // For now, we'll use a placeholder for screenshot URLs
    // The actual URLs will be updated when the screenshot job completes
    const desktopUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${roastRecord.id}/desktop.jpg`;
    const mobileUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${roastRecord.id}/mobile.jpg`;
    const shareCardUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${roastRecord.id}/share.jpg`;

    // Update roast record
    const processingTime = Date.now() - startTime;
    const { data: updatedRoast, error: updateError } = await supabase
      .from('roasts')
      .update({
        status: 'completed',
        score: analysis.score,
        score_breakdown: analysis.breakdown,
        roast_text: analysis.roast,
        issues: analysis.issues,
        quick_wins: analysis.quickWins,
        desktop_screenshot_url: desktopUrl,
        mobile_screenshot_url: mobileUrl,
        share_card_url: shareCardUrl,
        model_agreement: analysis.modelAgreement,
        processing_time_ms: processingTime,
        completed_at: new Date().toISOString(),
      })
      .eq('id', roastRecord.id)
      .select()
      .single();

    if (updateError || !updatedRoast) {
      throw new Error('Failed to update roast record');
    }

    const result: RoastResult = {
      id: updatedRoast.id,
      url: sanitizedUrl,
      roast: analysis.roast,
      score: analysis.score,
      breakdown: analysis.breakdown,
      issues: analysis.issues,
      quickWins: analysis.quickWins,
      desktopScreenshotUrl: desktopUrl,
      mobileScreenshotUrl: mobileUrl,
      shareCardUrl,
      modelAgreement: analysis.modelAgreement,
      timestamp: Date.now(),
      userId,
    };

// Cache the result
    const cacheKey = generateCacheKey(sanitizedUrl);
    await cacheSet(cacheKey, result);

    // Track analytics
    await supabase.from('analytics').insert({
      event_type: 'roast_generated',
      event_data: {
        score: analysis.score,
        processingTime,
        modelAgreement: analysis.modelAgreement,
      },
      user_id: userId,
      roast_id: roastRecord.id,
      session_id: event.requestContext.requestId,
      ip_address: event.requestContext.identity.sourceIp,
      user_agent: event.headers['User-Agent'] || event.headers['user-agent'],
    });

    console.log(
      `Roast completed for ${sanitizedUrl} in ${processingTime}ms (score: ${analysis.score}/10)`
    );

    return {
      statusCode: 200,
      headers: { ...headers, 'X-Cache': 'MISS' },
      body: JSON.stringify({
        ...result,
        cached: false,
        processingTime,
      })
    };

  } catch (error) {
    console.error('Create roast error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate roast',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId: event.requestContext.requestId
      })
    };
  }
}

async function queueScreenshotJob(url: string, roastId: string): Promise<string> {
  const jobId = `screenshot-${roastId}-${Date.now()}`;
  
  const params = {
    QueueUrl: process.env.SQS_QUEUE_URL!,
    MessageBody: JSON.stringify({
      jobId,
      url,
      roastId,
      timestamp: Date.now()
    }),
    MessageAttributes: {
      jobType: {
        DataType: 'String',
        StringValue: 'screenshot'
      }
    }
  };

  try {
    await sqs.sendMessage(params).promise();
    console.log(`Screenshot job queued: ${jobId}`);
    return jobId;
  } catch (error) {
    console.error('Failed to queue screenshot job:', error);
    throw error;
  }
}

// Export for testing
export { handleGetRoast, handleCreateRoast };