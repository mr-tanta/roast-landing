import { chromium, Browser, Page, devices } from 'playwright';
import { Consumer } from 'sqs-consumer';
import AWS from 'aws-sdk';
import sharp from 'sharp';
import { createHash } from 'crypto';
import { ScreenshotJob, PerformanceMetrics } from './types';

// Configure AWS SDK
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });

class ScreenshotService {
  private browser: Browser | null = null;
  private s3 = new AWS.S3();
  private cloudWatch = new AWS.CloudWatch();
  private sqs = new AWS.SQS();
  private isShuttingDown = false;

  async start() {
    console.log('Starting screenshot service...');
    
    // Launch browser with optimizations
    await this.initializeBrowser();
    
    // Start SQS consumer
    await this.startSQSConsumer();
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
    
    // Start health check server
    this.startHealthCheckServer();
    
    console.log('Screenshot service started successfully');
  }

  private async initializeBrowser() {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=IsolateOrigins',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-accelerated-2d-canvas',
          '--no-zygote',
          '--single-process',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--memory-pressure-off',
          '--max_old_space_size=4096'
        ]
      });

      console.log('Browser initialized successfully');
      await this.reportMetric('BrowserInitialized', 1);
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      await this.reportMetric('BrowserInitializationFailed', 1);
      throw error;
    }
  }

  private async startSQSConsumer() {
    const app = Consumer.create({
      queueUrl: process.env.SQS_QUEUE_URL!,
      handleMessage: async (message) => {
        if (this.isShuttingDown) {
          throw new Error('Service is shutting down');
        }
        
        try {
          const job: ScreenshotJob = JSON.parse(message.Body!);
          await this.processScreenshot(job);
        } catch (error) {
          console.error('Failed to process message:', error);
          throw error; // Re-throw to trigger SQS retry
        }
      },
      batchSize: 3, // Process up to 3 messages concurrently
      visibilityTimeout: 120, // 2 minutes to process each job
      waitTimeSeconds: 20, // Long polling
      pollingWaitTimeMs: 1000,
      heartbeatInterval: 30000 // 30 seconds
    });

    app.on('error', (err) => {
      console.error('SQS Consumer Error:', err);
      this.reportMetric('SQSError', 1);
    });

    app.on('processing_error', (err) => {
      console.error('Message processing error:', err);
      this.reportMetric('ProcessingError', 1);
    });

    app.on('timeout_error', (err) => {
      console.error('Message timeout error:', err);
      this.reportMetric('TimeoutError', 1);
    });

    app.on('message_processed', () => {
      this.reportMetric('MessageProcessed', 1);
    });

    app.on('message_received', () => {
      this.reportMetric('MessageReceived', 1);
    });

    app.start();
    console.log('SQS Consumer started');
  }

  async processScreenshot(job: ScreenshotJob) {
    const startTime = Date.now();
    console.log(`Processing screenshot job: ${job.jobId} for ${job.url}`);

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const context = await this.browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 RoastMyLanding/1.0',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    let desktopBuffer: Buffer | null = null;
    let mobileBuffer: Buffer | null = null;
    let metrics: PerformanceMetrics | null = null;

    try {
      const page = await context.newPage();
      
      // Block unnecessary resources to speed up loading
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        const blockedTypes = ['font', 'media', 'other'];
        
        if (blockedTypes.includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      // Navigate with timeout and retry logic
      await this.navigateWithRetry(page, job.url);

      // Wait for critical content and collect metrics
      metrics = await this.collectPerformanceMetrics(page);

      // Capture desktop screenshot
      desktopBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 85,
        fullPage: false,
        clip: { x: 0, y: 0, width: 1440, height: 900 }
      });

      // Switch to mobile viewport for mobile screenshot
      await page.setViewportSize({ width: 375, height: 812 }); // iPhone 13 dimensions
      await page.waitForTimeout(1000); // Allow layout to adjust

      // Capture mobile screenshot
      mobileBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 85,
        fullPage: false,
        clip: { x: 0, y: 0, width: 375, height: 812 }
      });

      // Process and optimize images
      const optimizedDesktop = await this.optimizeImage(desktopBuffer, 'desktop');
      const optimizedMobile = await this.optimizeImage(mobileBuffer, 'mobile');
      
      // Upload to S3
      const desktopUrl = await this.uploadToS3(optimizedDesktop, `${job.roastId}/desktop.jpg`);
      const mobileUrl = await this.uploadToS3(optimizedMobile, `${job.roastId}/mobile.jpg`);

      // Generate and upload share card
      const shareCardBuffer = await this.generateShareCard(optimizedDesktop, job.url);
      const shareCardUrl = await this.uploadToS3(shareCardBuffer, `${job.roastId}/share.jpg`);

      // Report success
      await this.reportSuccess(job, {
        desktopUrl,
        mobileUrl,
        shareCardUrl,
        metrics
      });
      
      // Metrics
      const duration = Date.now() - startTime;
      await this.reportMetric('ScreenshotDuration', duration, 'Milliseconds');
      await this.reportMetric('ScreenshotSuccess', 1);

      console.log(`Screenshot job completed: ${job.jobId} in ${duration}ms`);

    } catch (error) {
      console.error(`Screenshot error for job ${job.jobId}:`, error);
      
      await this.reportError(job, error);
      await this.reportMetric('ScreenshotFailure', 1);
      
      throw error; // Re-throw to trigger SQS retry
    } finally {
      await context.close();
    }
  }

  private async navigateWithRetry(page: Page, url: string, maxRetries = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        // Wait for basic content
        await page.waitForLoadState('domcontentloaded');
        
        // Additional wait for dynamic content
        await page.evaluate(() => {
          return new Promise((resolve) => {
            if (document.readyState === 'complete') {
              resolve(true);
            } else {
              window.addEventListener('load', () => resolve(true));
              setTimeout(() => resolve(true), 5000); // Timeout after 5s
            }
          });
        });

        return; // Success
      } catch (error) {
        console.warn(`Navigation attempt ${attempt} failed for ${url}:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to navigate to ${url} after ${maxRetries} attempts`);
        }
        
        await page.waitForTimeout(2000 * attempt); // Exponential backoff
      }
    }
  }

  private async collectPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
    try {
      return await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintEntries = performance.getEntriesByType('paint');
        
        return {
          loadTime: navigation ? navigation.loadEventEnd - navigation.navigationStart : 0,
          domReady: navigation ? navigation.domContentLoadedEventEnd - navigation.navigationStart : 0,
          firstPaint: paintEntries.find(p => p.name === 'first-paint')?.startTime || 0,
          resources: performance.getEntriesByType('resource').length
        };
      });
    } catch (error) {
      console.warn('Failed to collect performance metrics:', error);
      return {
        loadTime: 0,
        domReady: 0,
        firstPaint: 0,
        resources: 0
      };
    }
  }

  private async optimizeImage(buffer: Buffer, type: 'desktop' | 'mobile'): Promise<Buffer> {
    const config = {
      desktop: { width: 1200, height: 630, quality: 85 },
      mobile: { width: 375, height: 200, quality: 80 }
    };
    
    const settings = config[type];
    
    return sharp(buffer)
      .resize(settings.width, settings.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: settings.quality,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();
  }

  private async generateShareCard(screenshotBuffer: Buffer, url: string): Promise<Buffer> {
    const domain = new URL(url).hostname;
    
    // Create a simple share card with the screenshot and domain
    return sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([
      {
        input: await sharp(screenshotBuffer)
          .resize(1000, 500, { fit: 'cover' })
          .toBuffer(),
        top: 65,
        left: 100
      }
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
  }

  private async uploadToS3(buffer: Buffer, key: string): Promise<string> {
    const params = {
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
      ACL: 'public-read',
      Metadata: {
        'upload-timestamp': Date.now().toString(),
        'service': 'screenshot-service'
      }
    };

    try {
      const result = await this.s3.upload(params).promise();
      console.log(`Uploaded ${key} to S3: ${result.Location}`);
      return result.Location;
    } catch (error) {
      console.error(`Failed to upload ${key} to S3:`, error);
      throw error;
    }
  }

  private async reportSuccess(job: ScreenshotJob, result: {
    desktopUrl: string;
    mobileUrl: string;
    shareCardUrl: string;
    metrics: PerformanceMetrics;
  }): Promise<void> {
    try {
      // Update the roast record in the database via Lambda
      await this.invokeLambda('screenshot-complete', {
        roastId: job.roastId,
        desktopUrl: result.desktopUrl,
        mobileUrl: result.mobileUrl,
        shareCardUrl: result.shareCardUrl,
        metrics: result.metrics,
        jobId: job.jobId
      });
    } catch (error) {
      console.error('Failed to report success:', error);
    }
  }

  private async reportError(job: ScreenshotJob, error: any): Promise<void> {
    try {
      await this.invokeLambda('screenshot-error', {
        roastId: job.roastId,
        jobId: job.jobId,
        error: error.message || 'Unknown error'
      });
    } catch (invokeError) {
      console.error('Failed to report error:', invokeError);
    }
  }

  private async invokeLambda(functionName: string, payload: any): Promise<void> {
    const lambda = new AWS.Lambda();
    
    const params = {
      FunctionName: `roastmylanding-${functionName}`,
      InvocationType: 'Event', // Async invocation
      Payload: JSON.stringify(payload)
    };

    await lambda.invoke(params).promise();
  }

  private async reportMetric(name: string, value: number, unit = 'Count'): Promise<void> {
    try {
      await this.cloudWatch.putMetricData({
        Namespace: 'RoastMyLanding/Screenshots',
        MetricData: [{
          MetricName: name,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: [
            {
              Name: 'ServiceName',
              Value: 'screenshot-service'
            },
            {
              Name: 'InstanceId',
              Value: process.env.EC2_INSTANCE_ID || 'unknown'
            }
          ]
        }]
      }).promise();
    } catch (error) {
      console.error('Failed to report metric:', error);
    }
  }

  private setupGracefulShutdown(): void {
    const cleanup = async () => {
      console.log('Shutting down screenshot service...');
      this.isShuttingDown = true;
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      cleanup();
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      cleanup();
    });
  }

  private startHealthCheckServer(): void {
    const http = require('http');
    
    const server = http.createServer(async (req: any, res: any) => {
      if (req.url === '/health') {
        try {
          const healthy = this.browser !== null && !this.isShuttingDown;
          
          res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: healthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            browserReady: this.browser !== null
          }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'error',
            error: error.message
          }));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    const port = process.env.HEALTH_CHECK_PORT || 8080;
    server.listen(port, () => {
      console.log(`Health check server listening on port ${port}`);
    });
  }
}

// Start the service
const service = new ScreenshotService();
service.start().catch((error) => {
  console.error('Failed to start screenshot service:', error);
  process.exit(1);
});