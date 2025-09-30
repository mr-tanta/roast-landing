import { chromium, type Browser, type Page } from 'playwright-core'
import chromium_pkg from 'playwright-core/lib/server/chromium'

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (browser) {
    return browser
  }

  browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
    ],
  })

  return browser
}

export interface ScreenshotOptions {
  url: string
  viewport?: { width: number; height: number }
  fullPage?: boolean
}

export interface ScreenshotResult {
  desktopBuffer: Buffer
  mobileBuffer: Buffer
  metrics: {
    loadTime: number
    domReady: number
    resourceCount: number
  }
}

export async function captureScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
  const startTime = Date.now()
  const browser = await getBrowser()
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    userAgent: 'RoastMyLanding Bot 1.0 (Screenshot Service)',
  })

  try {
    const page = await context.newPage()

    // Block unnecessary resources for faster loading
    await page.route('**/*', (route) => {
      const blockedTypes = ['font', 'media']
      if (blockedTypes.includes(route.request().resourceType())) {
        route.abort()
      } else {
        route.continue()
      }
    })

    // Navigate with timeout
    await page.goto(options.url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Wait for content to be ready
    await page.waitForLoadState('domcontentloaded')

    // Capture desktop screenshot
    const desktopBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 85,
      fullPage: options.fullPage || false,
    })

    // Switch to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500) // Let layout settle

    const mobileBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 85,
      fullPage: false,
    })

    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      const timing = performance.timing
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        resourceCount: performance.getEntriesByType('resource').length,
      }
    })

    const duration = Date.now() - startTime
    console.log(`Screenshot captured in ${duration}ms for ${options.url}`)

    return {
      desktopBuffer: Buffer.from(desktopBuffer),
      mobileBuffer: Buffer.from(mobileBuffer),
      metrics,
    }
  } catch (error) {
    console.error('Screenshot error:', error)
    throw new Error(`Failed to capture screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    await context.close()
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}

// Security: Validate and sanitize URLs
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)

    // Block internal IPs
    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^0\./,
      /^169\.254\./,
    ]

    if (blockedPatterns.some((pattern) => pattern.test(parsed.hostname))) {
      throw new Error('Internal network URLs are not allowed')
    }

    // Only allow HTTP(S)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only HTTP(S) URLs are allowed')
    }

    return parsed.toString()
  } catch (error) {
    throw new Error(`Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}