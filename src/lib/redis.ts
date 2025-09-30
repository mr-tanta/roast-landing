import Redis from 'ioredis'

// Validate required Redis environment variables
if (!process.env.REDIS_URL && (!process.env.REDIS_HOST || !process.env.REDIS_PORT)) {
  throw new Error('Redis environment variables not configured. Provide either REDIS_URL or REDIS_HOST/REDIS_PORT')
}

// Create Redis connection
export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectionName: 'roastmylanding-frontend',
    })

// Redis connection event handlers
redis.on('connect', () => {
  console.log('Redis connection established')
})

redis.on('error', (error) => {
  console.error('Redis connection error:', error)
})

redis.on('close', () => {
  console.log('Redis connection closed')
})

redis.on('reconnecting', (time: number) => {
  console.log(`Redis reconnecting in ${time}ms`)
})

export class CacheManager {
  private static readonly LAYERS = {
    HOT: { ttl: 300, prefix: 'hot:' },      // 5 minutes
    WARM: { ttl: 3600, prefix: 'warm:' },   // 1 hour
    COLD: { ttl: 86400, prefix: 'cold:' },  // 24 hours
  }

  static async get<T>(key: string, layer: keyof typeof this.LAYERS = 'WARM'): Promise<T | null> {
    const fullKey = `${this.LAYERS[layer].prefix}${key}`

    try {
      const cached = await redis.get(fullKey)

      if (cached) {
        const parsed = JSON.parse(cached) as T
        
        // Promote to hot cache if accessed from warm/cold
        if (layer !== 'HOT') {
          await this.promoteToHot(key, parsed)
        }

        return parsed
      }

      return null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  static async set<T>(
    key: string,
    value: T,
    layer: keyof typeof this.LAYERS = 'WARM'
  ): Promise<void> {
    const fullKey = `${this.LAYERS[layer].prefix}${key}`

    try {
      await redis.setex(fullKey, this.LAYERS[layer].ttl, JSON.stringify(value))
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  private static async promoteToHot<T>(key: string, value: T): Promise<void> {
    try {
      const hotKey = `${this.LAYERS.HOT.prefix}${key}`
      await redis.setex(hotKey, this.LAYERS.HOT.ttl, JSON.stringify(value))
    } catch (error) {
      console.error('Cache promotion error:', error)
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache invalidation error:', error)
    }
  }

  static generateCacheKey(url: string, options?: Record<string, any>): string {
    const normalized = new URL(url).toString()
    const optionsStr = options ? JSON.stringify(options) : ''
    return `roast:${Buffer.from(normalized + optionsStr).toString('base64')}`
  }

  // Health check utility
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    const start = Date.now()
    
    try {
      await redis.ping()
      const latency = Date.now() - start
      
      return {
        status: 'healthy',
        latency
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
