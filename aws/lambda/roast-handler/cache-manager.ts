import Redis from 'ioredis';
import { createHash } from 'crypto';

export class CacheManager {
  private redis: Redis;
  private readonly layers = {
    L1_HOT: { ttl: 300, prefix: 'hot:' },      // 5 minutes
    L2_WARM: { ttl: 3600, prefix: 'warm:' },   // 1 hour  
    L3_COLD: { ttl: 86400, prefix: 'cold:' }   // 24 hours
  };

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async get<T>(key: string, layer: keyof typeof this.layers = 'L2_WARM'): Promise<T | null> {
    const fullKey = `${this.layers[layer].prefix}${key}`;
    
    try {
      const cached = await this.redis.get(fullKey);
      
      if (cached) {
        // Promote to hot cache if accessed from warm/cold
        if (layer !== 'L1_HOT') {
          await this.promoteToHot(key, cached);
        }
        
        // Track cache hit
        await this.redis.hincrby('stats:cache', 'hits', 1);
        
        return JSON.parse(cached);
      }
      
      // Track cache miss
      await this.redis.hincrby('stats:cache', 'misses', 1);
      return null;
      
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(
    key: string, 
    value: T, 
    layer: keyof typeof this.layers = 'L2_WARM'
  ): Promise<void> {
    const fullKey = `${this.layers[layer].prefix}${key}`;
    const serialized = JSON.stringify(value);
    
    try {
      await this.redis.setex(fullKey, this.layers[layer].ttl, serialized);
      
      // Update cache size stats
      await this.redis.hincrby('stats:cache', 'size', serialized.length);
      
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  private async promoteToHot(key: string, value: string): Promise<void> {
    const hotKey = `${this.layers.L1_HOT.prefix}${key}`;
    try {
      await this.redis.setex(hotKey, this.layers.L1_HOT.ttl, value);
    } catch (error) {
      console.error('Cache promotion error:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100
      });

      const keys: string[] = [];
      
      stream.on('data', (resultKeys: string[]) => {
        keys.push(...resultKeys);
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('end', async () => {
          try {
            if (keys.length > 0) {
              await this.redis.del(...keys);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  generateCacheKey(url: string, options?: Record<string, any>): string {
    const normalized = new URL(url).toString();
    const optionsStr = options ? JSON.stringify(options) : '';
    return createHash('md5')
      .update(normalized + optionsStr)
      .digest('hex');
  }

  // Intelligent cache warming
  async warmCache(): Promise<void> {
    try {
      // Get frequently accessed URLs
      const popularUrls = await this.redis.zrevrange('stats:popular_urls', 0, 19);
      
      for (const url of popularUrls) {
        const cacheKey = this.generateCacheKey(url);
        const exists = await this.redis.exists(`warm:${cacheKey}`);
        
        if (!exists) {
          // Queue for background processing
          await this.redis.lpush('queue:warm_cache', url);
        }
      }
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  // Cost optimization tracking
  async getCostSavings(): Promise<{
    savedRequests: number;
    savedCosts: number;
  }> {
    try {
      const stats = await this.redis.hgetall('stats:cache');
      const hits = parseInt(stats.hits || '0');
      const costPerRequest = 0.03; // Average AI API cost
      
      return {
        savedRequests: hits,
        savedCosts: hits * costPerRequest
      };
    } catch (error) {
      console.error('Cost savings calculation error:', error);
      return { savedRequests: 0, savedCosts: 0 };
    }
  }

  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  }> {
    try {
      const stats = await this.redis.hgetall('stats:cache');
      const hits = parseInt(stats.hits || '0');
      const misses = parseInt(stats.misses || '0');
      const total = hits + misses;
      
      return {
        hits,
        misses,
        hitRate: total > 0 ? hits / total : 0,
        size: parseInt(stats.size || '0')
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { hits: 0, misses: 0, hitRate: 0, size: 0 };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}