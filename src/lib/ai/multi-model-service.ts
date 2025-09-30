import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { RoastAnalysis, AIProviderResponse } from '@/types'

interface AIProvider {
  name: string
  weight: number
  analyze: (imageUrl: string, htmlContent?: string) => Promise<RoastAnalysis>
}

export class MultiModelAIService {
  private providers: AIProvider[] = []
  private openai: OpenAI
  private anthropic: Anthropic
  private gemini: GoogleGenerativeAI

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

    this.initializeProviders()
  }

  private initializeProviders() {
    // GPT-4 Vision
    this.providers.push({
      name: 'gpt-4-vision',
      weight: 0.5,
      analyze: async (imageUrl: string) => {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this landing page and roast it constructively.',
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
          response_format: { type: 'json_object' },
        })

        const content = response.choices[0].message.content
        return this.parseResponse(content || '{}')
      },
    })

    // Claude 3 Opus
    this.providers.push({
      name: 'claude-3-opus',
      weight: 0.3,
      analyze: async (imageUrl: string) => {
        const imageData = await this.fetchImageAsBase64(imageUrl)

        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: this.getSystemPrompt() + '\n\nAnalyze this landing page and roast it constructively. Return valid JSON only.',
                },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: imageData,
                  },
                },
              ],
            },
          ],
        })

        const content = response.content[0].type === 'text' ? response.content[0].text : '{}'
        return this.parseResponse(content)
      },
    })

    // Gemini Pro Vision
    this.providers.push({
      name: 'gemini-pro',
      weight: 0.2,
      analyze: async (imageUrl: string) => {
        const model = this.gemini.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
            responseMimeType: 'application/json',
          },
        })

        const imageData = await this.fetchImageAsBase64(imageUrl)

        const result = await model.generateContent([
          this.getSystemPrompt() + '\n\nAnalyze this landing page and roast it constructively. Return valid JSON only.',
          {
            inlineData: {
              data: imageData,
              mimeType: 'image/jpeg',
            },
          },
        ])

        const content = result.response.text()
        return this.parseResponse(content)
      },
    })
  }

  private getSystemPrompt(): string {
    return `You are RoastMaster, a savage but constructive landing page critic with years of conversion optimization experience.

Analyze this landing page and provide a JSON response with this EXACT structure:

{
  "roast": "2-3 sentences of brutal but helpful critique with specific examples and memorable analogies",
  "score": 1-10 overall score (integer),
  "breakdown": {
    "headline": 0-2 score for headline clarity and value proposition,
    "trust": 0-2 score for trust signals and social proof,
    "visual": 0-2 score for visual hierarchy and design,
    "cta": 0-2 score for CTA optimization and placement,
    "speed": 0-2 score for perceived performance
  },
  "issues": [
    {
      "issue": "specific problem you see",
      "location": "where on the page",
      "impact": "high" | "medium" | "low",
      "fix": "how to fix it"
    }
  ],
  "quickWins": ["improvement 1", "improvement 2", "improvement 3"]
}

RULES:
- Be savage but constructive
- Reference specific elements you see
- Use humor and memorable analogies
- Focus on conversion optimization
- Provide actionable advice
- Return ONLY valid JSON, no markdown formatting`
  }

  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    const response = await fetch(imageUrl)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return buffer.toString('base64')
  }

  private parseResponse(content: string): RoastAnalysis {
    try {
      // Remove markdown code blocks if present
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)

      return {
        roast: parsed.roast || 'Unable to generate roast',
        score: parsed.score || 5,
        breakdown: {
          headline: parsed.breakdown?.headline || 1,
          trust: parsed.breakdown?.trust || 1,
          visual: parsed.breakdown?.visual || 1,
          cta: parsed.breakdown?.cta || 1,
          speed: parsed.breakdown?.speed || 1,
        },
        issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 3) : [],
        quickWins: Array.isArray(parsed.quickWins) ? parsed.quickWins.slice(0, 3) : [],
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error, content)
      throw new Error('Failed to parse AI response')
    }
  }

  async analyzeWithEnsemble(imageUrl: string): Promise<RoastAnalysis & { modelAgreement: number }> {
    const startTime = Date.now()

    // Parallel execution with timeout
    const analysisPromises = this.providers.map((provider) =>
      this.withTimeout(
        provider.analyze(imageUrl),
        15000,
        `${provider.name} timeout`
      ).catch((error) => {
        console.error(`${provider.name} failed:`, error)
        return null
      })
    )

    const results = await Promise.all(analysisPromises)
    const validResults = results.filter((r): r is RoastAnalysis => r !== null)

    if (validResults.length === 0) {
      throw new Error('All AI providers failed')
    }

    console.log(`AI analysis completed in ${Date.now() - startTime}ms with ${validResults.length}/${this.providers.length} providers`)

    // Ensemble the results
    return this.ensembleResults(validResults)
  }

  private ensembleResults(results: RoastAnalysis[]): RoastAnalysis & { modelAgreement: number } {
    // Weighted score averaging
    let totalScore = 0
    let totalWeight = 0

    results.forEach((result, index) => {
      const weight = this.providers[index].weight
      totalScore += result.score * weight
      totalWeight += weight
    })

    const finalScore = Math.round(totalScore / totalWeight)

    // Select best roast (longest with most detail)
    const bestRoast = results
      .map((r) => r.roast)
      .sort((a, b) => b.length - a.length)[0]

    // Average breakdown scores
    const breakdown = {
      headline: Math.round(results.reduce((sum, r) => sum + r.breakdown.headline, 0) / results.length),
      trust: Math.round(results.reduce((sum, r) => sum + r.breakdown.trust, 0) / results.length),
      visual: Math.round(results.reduce((sum, r) => sum + r.breakdown.visual, 0) / results.length),
      cta: Math.round(results.reduce((sum, r) => sum + r.breakdown.cta, 0) / results.length),
      speed: Math.round(results.reduce((sum, r) => sum + r.breakdown.speed, 0) / results.length),
    }

    // Merge and deduplicate issues
    const allIssues = results.flatMap((r) => r.issues)
    const uniqueIssues = this.deduplicateIssues(allIssues)
      .sort((a, b) => {
        const impactOrder: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 1, low: 2 }
        return impactOrder[a.impact as 'high' | 'medium' | 'low'] - impactOrder[b.impact as 'high' | 'medium' | 'low']
      })
      .slice(0, 3)

    // Combine quick wins
    const allQuickWins = [...new Set(results.flatMap((r) => r.quickWins))].slice(0, 3)

    return {
      roast: bestRoast,
      score: finalScore,
      breakdown,
      issues: uniqueIssues,
      quickWins: allQuickWins,
      modelAgreement: this.calculateAgreement(results),
    }
  }

  private deduplicateIssues(issues: any[]): any[] {
    const seen = new Set<string>()
    return issues.filter((issue) => {
      const key = `${issue.issue}:${issue.location}`.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private calculateAgreement(results: RoastAnalysis[]): number {
    const scores = results.map((r) => r.score)
    const mean = scores.reduce((a, b) => a + b) / scores.length
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
    const stdDev = Math.sqrt(variance)
    return Math.max(0, 1 - stdDev / 5) // Normalize to 0-1
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    timeoutError: string
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError)), ms)
    )
    return Promise.race([promise, timeout])
  }
}