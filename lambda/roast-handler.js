const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

// Environment variables
const CACHE_TABLE_NAME = process.env.CACHE_TABLE_NAME || 'roast_cache';
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

class DynamoDBCacheManager {
  static async get(key) {
    try {
      const result = await dynamodb.get({
        TableName: CACHE_TABLE_NAME,
        Key: { pk: key }
      }).promise();

      if (!result.Item) {
        return null;
      }

      // Check if item has expired
      if (result.Item.ttl && result.Item.ttl < Math.floor(Date.now() / 1000)) {
        await this.delete(key);
        return null;
      }

      return result.Item.value || null;
    } catch (error) {
      console.error('DynamoDB cache get error:', error);
      return null;
    }
  }

  static async set(key, value, ttlSeconds = 3600) {
    try {
      const ttl = Math.floor(Date.now() / 1000) + ttlSeconds;

      await dynamodb.put({
        TableName: CACHE_TABLE_NAME,
        Item: {
          pk: key,
          value: value,
          ttl: ttl,
          createdAt: new Date().toISOString()
        }
      }).promise();
    } catch (error) {
      console.error('DynamoDB cache set error:', error);
    }
  }

  static async delete(key) {
    try {
      await dynamodb.delete({
        TableName: CACHE_TABLE_NAME,
        Key: { pk: key }
      }).promise();
    } catch (error) {
      console.error('DynamoDB cache delete error:', error);
    }
  }

  static generateCacheKey(url, options) {
    const normalized = new URL(url).toString();
    const optionsStr = options ? JSON.stringify(options) : '';
    return `roast:${Buffer.from(normalized + optionsStr).toString('base64')}`;
  }
}

// Simple URL sanitization
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required and must be a string');
  }

  // Add protocol if missing
  if (!url.match(/^https?:\/\//)) {
    url = 'https://' + url;
  }

  try {
    const urlObj = new URL(url);
    
    // Validate protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are allowed');
    }

    // Validate hostname
    if (!urlObj.hostname || urlObj.hostname.length === 0) {
      throw new Error('Invalid hostname');
    }

    return urlObj.toString();
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}

// Simple AI analysis simulation
function simulateAIAnalysis(url) {
  const scores = {
    design: Math.floor(Math.random() * 4) + 6,
    usability: Math.floor(Math.random() * 4) + 5,
    performance: Math.floor(Math.random() * 3) + 7,
    content: Math.floor(Math.random() * 4) + 6,
    mobile: Math.floor(Math.random() * 3) + 7
  };

  const totalScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 5);

  const roasts = [
    `Your website looks like it was designed by a toddler with finger paints. The color scheme screams "I gave up halfway through."`,
    `This site has more loading issues than a broke elevator. Users are leaving faster than you can say "conversion rate."`,
    `Your mobile experience is so bad, it makes flip phones look cutting-edge. Time to join the 21st century!`,
    `The navigation is more confusing than IKEA instructions written in ancient hieroglyphics.`,
    `Your website's performance is slower than a sloth on vacation. Speed it up before users hibernate waiting for it to load!`
  ];

  const issues = [
    'Poor color contrast affecting readability',
    'Slow loading times on mobile devices',
    'Inconsistent navigation structure',
    'Missing call-to-action buttons',
    'Outdated design patterns'
  ];

  const quickWins = [
    'Optimize images to reduce load times',
    'Improve button contrast and visibility',
    'Add mobile-responsive navigation',
    'Simplify the main navigation menu',
    'Update typography for better readability'
  ];

  return {
    score: totalScore,
    roast: roasts[Math.floor(Math.random() * roasts.length)],
    breakdown: scores,
    issues: issues.slice(0, 3),
    quickWins: quickWins.slice(0, 3),
    modelAgreement: 0.85 + Math.random() * 0.1
  };
}

exports.handler = async (event) => {
  console.log('Lambda handler invoked:', JSON.stringify(event, null, 2));

  try {
    // Handle different event sources
    let body;
    
    if (event.body) {
      // API Gateway event
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else if (event.url) {
      // Direct invocation
      body = event;
    } else {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    // Validate URL
    if (!body.url) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    let sanitizedUrl;
    try {
      sanitizedUrl = sanitizeUrl(body.url);
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: error.message || 'Invalid URL' 
        })
      };
    }

    const startTime = Date.now();

    // Check cache first (unless force refresh)
    if (!body.forceRefresh) {
      const cacheKey = DynamoDBCacheManager.generateCacheKey(sanitizedUrl);
      const cached = await DynamoDBCacheManager.get(cacheKey);

      if (cached) {
        console.log(`Cache hit for ${sanitizedUrl}`);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            ...cached,
            cached: true,
            processingTime: Date.now() - startTime
          })
        };
      }
    }

    // Generate a roast ID
    const roastId = `roast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // For lean setup, use simulated AI analysis instead of expensive models
    console.log(`Analyzing ${sanitizedUrl} with simulated AI...`);
    const analysis = simulateAIAnalysis(sanitizedUrl);

    // If SQS is configured, send screenshot job (fire and forget for now)
    if (SQS_QUEUE_URL) {
      try {
        await sqs.sendMessage({
          QueueUrl: SQS_QUEUE_URL,
          MessageBody: JSON.stringify({
            jobId: `job_${Date.now()}`,
            roastId: roastId,
            url: sanitizedUrl,
            timestamp: new Date().toISOString()
          })
        }).promise();
        console.log('Screenshot job queued');
      } catch (error) {
        console.error('Failed to queue screenshot job:', error);
        // Continue without screenshots for now
      }
    }

    const processingTime = Date.now() - startTime;

    const result = {
      id: roastId,
      url: sanitizedUrl,
      roast: analysis.roast,
      score: analysis.score,
      breakdown: analysis.breakdown,
      issues: analysis.issues,
      quickWins: analysis.quickWins,
      desktopScreenshotUrl: `https://placeholder.pics/svg/1200x630/DEDEDE/555555/${encodeURIComponent('Screenshot Coming Soon')}`,
      mobileScreenshotUrl: `https://placeholder.pics/svg/375x812/DEDEDE/555555/${encodeURIComponent('Mobile Screenshot')}`,
      shareCardUrl: `https://placeholder.pics/svg/1200x630/4F46E5/FFFFFF/${encodeURIComponent('Share Card')}`,
      modelAgreement: analysis.modelAgreement,
      timestamp: Date.now(),
      userId: null
    };

    // Cache the result
    const cacheKey = DynamoDBCacheManager.generateCacheKey(sanitizedUrl);
    await DynamoDBCacheManager.set(cacheKey, result, 3600); // 1 hour TTL

    console.log(`Roast completed for ${sanitizedUrl} in ${processingTime}ms (score: ${analysis.score}/10)`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        ...result,
        cached: false,
        processingTime
      })
    };

  } catch (error) {
    console.error('Lambda execution error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to generate roast',
        details: error.message || 'Unknown error'
      })
    };
  }
};