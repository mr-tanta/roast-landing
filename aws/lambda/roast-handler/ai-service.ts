import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RoastAnalysis, Issue, ScoreBreakdown } from './types';

interface AIProvider {
  name: string;
  weight: number;
  analyze(imageUrl: string): Promise<RoastAnalysis>;
}

export class MultiModelAIService {
  private providers: AIProvider[] = [];
  private cache = new Map<string, RoastAnalysis>();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // GPT-4 Vision (50% weight)
    this.providers.push({
      name: 'gpt-4-vision',
      weight: 0.5,
      analyze: async (imageUrl) => {
        const openai = new OpenAI({ 
          apiKey: this.getRotatingAPIKey('OPENAI') 
        });
        
        const response = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [{
            role: "system",
            content: this.getSystemPrompt()
          }, {
            role: "user",
            content: [
              { type: "text", text: "Analyze this landing page and provide a brutal but constructive roast." },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }],
          max_tokens: 1500,
          temperature: 0.7
        });

        return this.parseResponse(response.choices[0].message.content || '');
      }
    });

    // Claude 3 Opus (30% weight)
    this.providers.push({
      name: 'claude-3-opus',
      weight: 0.3,
      analyze: async (imageUrl) => {
        const anthropic = new Anthropic({ 
          apiKey: this.getRotatingAPIKey('ANTHROPIC') 
        });
        
        const imageData = await this.fetchImageAsBase64(imageUrl);
        
        const response = await anthropic.messages.create({
          model: "claude-3-opus-20240229",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: this.getSystemPrompt() + "\n\nAnalyze this landing page:" },
              { 
                type: "image", 
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: imageData
                }
              }
            ]
          }]
        });

        const content = response.content[0];
        return this.parseResponse(content.type === 'text' ? content.text : '');
      }
    });

    // Gemini Pro Vision (20% weight)
    this.providers.push({
      name: 'gemini-pro',
      weight: 0.2,
      analyze: async (imageUrl) => {
        const genAI = new GoogleGenerativeAI(this.getRotatingAPIKey('GEMINI'));
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        
        const imageData = await this.fetchImageAsBase64(imageUrl);
        
        const result = await model.generateContent([
          this.getSystemPrompt(),
          { inlineData: { data: imageData, mimeType: "image/jpeg" } }
        ]);

        return this.parseResponse(result.response.text());
      }
    });
  }

  private getSystemPrompt(): string {
    return `You are RoastMaster, a savage but constructive landing page critic with years of conversion optimization experience.

Analyze this landing page screenshot and provide a JSON response with this EXACT structure:

{
  "roast": "2-3 sentences of brutal but helpful critique with specific examples from what you see",
  "score": 1-10 overall conversion score,
  "breakdown": {
    "headline": 0-2 score,
    "trust": 0-2 score,
    "visual": 0-2 score,
    "cta": 0-2 score,  
    "speed": 0-2 score
  },
  "issues": [
    {
      "issue": "specific problem you can see",
      "location": "where on page",
      "impact": "high/medium/low",
      "fix": "how to fix it"
    }
  ],
  "quickWins": ["improvement 1", "improvement 2", "improvement 3"]
}

Focus on what you can actually SEE in the screenshot. Be specific about elements, colors, layout, text you can read. Use humor and memorable analogies. Be brutal but constructive.`;
  }

  async analyzeWithEnsemble(imageUrl: string): Promise<RoastAnalysis> {
    // Check cache
    const cacheKey = this.getCacheKey(imageUrl);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Parallel execution with timeout and fallback
    const analysisPromises = this.providers.map(provider =>
      this.withTimeout(
        provider.analyze(imageUrl),
        15000,
        `${provider.name} timeout`
      ).catch(error => {
        console.error(`${provider.name} failed:`, error);
        return null;
      })
    );

    const results = await Promise.all(analysisPromises);
    const validResults = results.filter((r): r is RoastAnalysis => r !== null);

    if (validResults.length === 0) {
      throw new Error('All AI providers failed');
    }

    console.log(`AI Analysis: ${validResults.length}/${this.providers.length} providers succeeded`);

    // Ensemble the results
    const ensembled = this.ensembleResults(validResults);
    
    // Cache the result
    this.cache.set(cacheKey, ensembled);
    setTimeout(() => this.cache.delete(cacheKey), 3600000); // 1 hour TTL

    return ensembled;
  }

  private ensembleResults(results: RoastAnalysis[]): RoastAnalysis {
    if (results.length === 1) {
      return results[0];
    }

    // Weighted score averaging
    let totalScore = 0;
    let totalWeight = 0;
    let totalBreakdown: ScoreBreakdown = {
      headline: 0,
      trust: 0,
      visual: 0,
      cta: 0,
      speed: 0
    };

    results.forEach((result, index) => {
      const weight = this.providers[index].weight;
      totalScore += result.score * weight;
      totalWeight += weight;

      // Weight the breakdown scores
      if (result.breakdown) {
        totalBreakdown.headline += result.breakdown.headline * weight;
        totalBreakdown.trust += result.breakdown.trust * weight;
        totalBreakdown.visual += result.breakdown.visual * weight;
        totalBreakdown.cta += result.breakdown.cta * weight;
        totalBreakdown.speed += result.breakdown.speed * weight;
      }
    });

    const finalScore = Math.round(totalScore / totalWeight);

    // Normalize breakdown scores
    const finalBreakdown: ScoreBreakdown = {
      headline: Math.round(totalBreakdown.headline / totalWeight),
      trust: Math.round(totalBreakdown.trust / totalWeight),
      visual: Math.round(totalBreakdown.visual / totalWeight),
      cta: Math.round(totalBreakdown.cta / totalWeight),
      speed: Math.round(totalBreakdown.speed / totalWeight)
    };

    // Select best roast (highest quality based on length and specificity)
    const bestRoast = results
      .map((r, i) => ({ roast: r.roast, score: this.scoreRoastQuality(r.roast), weight: this.providers[i].weight }))
      .sort((a, b) => (b.score * b.weight) - (a.score * a.weight))[0].roast;

    // Merge and deduplicate issues
    const allIssues = results.flatMap(r => r.issues || []);
    const uniqueIssues = this.deduplicateIssues(allIssues)
      .sort((a, b) => {
        const impactOrder = { high: 0, medium: 1, low: 2 };
        return impactOrder[a.impact as keyof typeof impactOrder] - impactOrder[b.impact as keyof typeof impactOrder];
      })
      .slice(0, 4); // Top 4 issues

    // Combine quick wins
    const allQuickWins = [...new Set(results.flatMap(r => r.quickWins || []))].slice(0, 3);

    return {
      roast: bestRoast,
      score: finalScore,
      breakdown: finalBreakdown,
      issues: uniqueIssues,
      quickWins: allQuickWins,
      modelAgreement: this.calculateAgreement(results)
    };
  }

  private scoreRoastQuality(roast: string): number {
    let score = 0;
    
    // Length bonus
    score += Math.min(roast.length / 20, 10);
    
    // Specificity indicators
    const specificityWords = ['color', 'button', 'headline', 'text', 'image', 'layout', 'font', 'size'];
    score += specificityWords.filter(word => roast.toLowerCase().includes(word)).length;
    
    // Humor indicators
    const humorWords = ['like', 'looks', 'seems', 'reminds', 'as if'];
    score += humorWords.filter(word => roast.toLowerCase().includes(word)).length * 0.5;
    
    return score;
  }

  private deduplicateIssues(issues: Issue[]): Issue[] {
    const seen = new Set<string>();
    return issues.filter(issue => {
      const key = `${issue.issue}:${issue.location}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private calculateAgreement(results: RoastAnalysis[]): number {
    const scores = results.map(r => r.score);
    const mean = scores.reduce((a, b) => a + b) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 1 - (stdDev / 5)); // Normalize to 0-1
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, timeoutError: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError)), ms)
    );
    return Promise.race([promise, timeout]);
  }

  private getCacheKey(imageUrl: string): string {
    return `ai_analysis:${imageUrl}`;
  }

  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }

  private parseResponse(content: string): RoastAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize the response
      return {
        roast: parsed.roast || 'This landing page needs work, but I couldn\'t analyze it properly.',
        score: Math.max(1, Math.min(10, parseInt(parsed.score) || 5)),
        breakdown: {
          headline: Math.max(0, Math.min(2, parseInt(parsed.breakdown?.headline) || 1)),
          trust: Math.max(0, Math.min(2, parseInt(parsed.breakdown?.trust) || 1)),
          visual: Math.max(0, Math.min(2, parseInt(parsed.breakdown?.visual) || 1)),
          cta: Math.max(0, Math.min(2, parseInt(parsed.breakdown?.cta) || 1)),
          speed: Math.max(0, Math.min(2, parseInt(parsed.breakdown?.speed) || 1))
        },
        issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 5) : [],
        quickWins: Array.isArray(parsed.quickWins) ? parsed.quickWins.slice(0, 3) : []
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw content:', content.substring(0, 500));
      
      // Fallback response
      return {
        roast: "This landing page has potential, but I had trouble analyzing it properly. Try a different URL or check if the page is accessible.",
        score: 5,
        breakdown: {
          headline: 1,
          trust: 1,
          visual: 1,
          cta: 1,
          speed: 1
        },
        issues: [{
          issue: "Unable to analyze page",
          location: "General",
          impact: "medium",
          fix: "Ensure the page is publicly accessible and properly loaded"
        }],
        quickWins: ["Check page accessibility", "Verify page loads correctly", "Try again in a few minutes"]
      };
    }
  }

  private getRotatingAPIKey(service: string): string {
    const keys = process.env[`${service}_API_KEYS`];
    if (keys) {
      const keyArray = JSON.parse(keys);
      const index = Math.floor(Math.random() * keyArray.length);
      return keyArray[index];
    }
    
    // Fallback to single key
    return process.env[`${service}_API_KEY`] || '';
  }
}