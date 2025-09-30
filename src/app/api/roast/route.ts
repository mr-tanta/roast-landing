import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { MultiModelAIService } from '@/lib/ai/multi-model-service'
import { captureScreenshot, sanitizeUrl } from '@/lib/screenshot'
import { generateShareCard } from '@/lib/share-card'
import { uploadScreenshots, uploadShareCard } from '@/lib/storage'
import { CacheManager } from '@/lib/dynamodb-cache'
import type { RoastResult } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

interface RoastRequest {
  url: string
  forceRefresh?: boolean
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body: RoastRequest = await request.json()

    // Validate URL
    if (!body.url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    let sanitizedUrl: string
    try {
      sanitizedUrl = sanitizeUrl(body.url)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid URL' },
        { status: 400 }
      )
    }

    // Check cache first (unless force refresh)
    if (!body.forceRefresh) {
      const cacheKey = CacheManager.generateCacheKey(sanitizedUrl)
      const cached = await CacheManager.get<RoastResult>(cacheKey)

      if (cached) {
        console.log(`Cache hit for ${sanitizedUrl}`)
        return NextResponse.json({
          ...cached,
          cached: true,
          processingTime: Date.now() - startTime,
        })
      }
    }

    // Get user session (if authenticated)
    const supabase = await createAdminClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    let userId: string | undefined
    if (session?.user) {
      userId = session.user.id

      // Check rate limits
      const { data: user } = await supabase
        .from('users')
        .select('subscription_tier, daily_roasts_count, last_roast_reset')
        .eq('id', userId)
        .single()

      if (user) {
        const limit = user.subscription_tier === 'pro' ? 1000 : 3

        // Reset counter if needed
        const resetTime = new Date(user.last_roast_reset)
        const now = new Date()
        if (resetTime.getDate() !== now.getDate()) {
          await supabase
            .from('users')
            .update({ daily_roasts_count: 0, last_roast_reset: now.toISOString() })
            .eq('id', userId)
        } else if (user.daily_roasts_count >= limit) {
          return NextResponse.json(
            {
              error: `Daily roast limit reached. ${
                user.subscription_tier === 'free'
                  ? 'Upgrade to Pro for unlimited roasts.'
                  : 'Please try again tomorrow.'
              }`,
            },
            { status: 429 }
          )
        }

        // Increment counter
        await supabase
          .from('users')
          .update({ daily_roasts_count: user.daily_roasts_count + 1 })
          .eq('id', userId)
      }
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
      .single()

    if (roastError || !roastRecord) {
      throw new Error('Failed to create roast record')
    }

    // Capture screenshots
    console.log(`Capturing screenshots for ${sanitizedUrl}...`)
    const { desktopBuffer, mobileBuffer, metrics } = await captureScreenshot({
      url: sanitizedUrl,
    })

    // Upload screenshots
    const { desktop: desktopUrl, mobile: mobileUrl } = await uploadScreenshots(
      desktopBuffer,
      mobileBuffer,
      roastRecord.id
    )

    // Analyze with AI
    console.log(`Analyzing with AI...`)
    const aiService = new MultiModelAIService()
    const analysis = await aiService.analyzeWithEnsemble(desktopUrl)

    // Generate share card
    const shareCardBuffer = await generateShareCard({
      url: sanitizedUrl,
      score: analysis.score,
      roast: analysis.roast,
      screenshotBuffer: desktopBuffer,
    })

    const shareCardUrl = await uploadShareCard(shareCardBuffer, roastRecord.id)

    // Update roast record
    const processingTime = Date.now() - startTime
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
      .single()

    if (updateError || !updatedRoast) {
      throw new Error('Failed to update roast record')
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
    }

    // Cache the result
    const cacheKey = CacheManager.generateCacheKey(sanitizedUrl)
    await CacheManager.set(cacheKey, result, 'WARM')

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
    })

    console.log(
      `Roast completed for ${sanitizedUrl} in ${processingTime}ms (score: ${analysis.score}/10)`
    )

    return NextResponse.json({
      ...result,
      cached: false,
      processingTime,
    })
  } catch (error) {
    console.error('Roast generation error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate roast',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve a specific roast
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Roast ID is required' }, { status: 400 })
  }

  try {
    const supabase = await createAdminClient()
    const { data: roast, error } = await supabase
      .from('roasts')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !roast) {
      return NextResponse.json({ error: 'Roast not found' }, { status: 404 })
    }

    // Increment view count
    await supabase
      .from('roasts')
      .update({ view_count: roast.view_count + 1 })
      .eq('id', id)

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
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Roast retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve roast' },
      { status: 500 }
    )
  }
}