import { DynamoDB } from 'aws-sdk'

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1'
})

const TABLE_NAME = process.env.CACHE_TABLE_NAME || 'roast_cache'

export class DynamoDBCacheManager {
  private static readonly LAYERS = {
    HOT: { ttl: 300 },      // 5 minutes
    WARM: { ttl: 3600 },    // 1 hour  
    COLD: { ttl: 86400 },   // 24 hours
  }

  static async get<T>(key: string, layer: keyof typeof this.LAYERS = 'WARM'): Promise<T | null> {
    try {
      const result = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: { pk: key }
      }).promise()

      if (!result.Item) {
        return null
      }

      // Check if item has expired
      if (result.Item.ttl && result.Item.ttl < Math.floor(Date.now() / 1000)) {
        // Item has expired, delete it
        await this.delete(key)
        return null
      }

      // Promote to hot cache if accessed from warm/cold
      if (layer !== 'HOT' && result.Item.value) {
        await this.promoteToHot(key, result.Item.value)
      }

      return result.Item.value || null
    } catch (error) {
      console.error('DynamoDB cache get error:', error)
      return null
    }
  }

  static async set<T>(
    key: string,
    value: T,
    layer: keyof typeof this.LAYERS = 'WARM'
  ): Promise<void> {
    try {
      const ttl = Math.floor(Date.now() / 1000) + this.LAYERS[layer].ttl

      await dynamodb.put({
        TableName: TABLE_NAME,
        Item: {
          pk: key,
          value: value,
          ttl: ttl,
          layer: layer,
          createdAt: new Date().toISOString()
        }
      }).promise()
    } catch (error) {
      console.error('DynamoDB cache set error:', error)
    }
  }

  private static async promoteToHot<T>(key: string, value: T): Promise<void> {
    const hotTtl = Math.floor(Date.now() / 1000) + this.LAYERS.HOT.ttl

    try {
      await dynamodb.put({
        TableName: TABLE_NAME,
        Item: {
          pk: key,
          value: value,
          ttl: hotTtl,
          layer: 'HOT',
          createdAt: new Date().toISOString()
        }
      }).promise()
    } catch (error) {
      console.error('DynamoDB promote to hot error:', error)
    }
  }

  static async delete(key: string): Promise<void> {
    try {
      await dynamodb.delete({
        TableName: TABLE_NAME,
        Key: { pk: key }
      }).promise()
    } catch (error) {
      console.error('DynamoDB cache delete error:', error)
    }
  }

  static generateCacheKey(url: string, options?: Record<string, any>): string {
    const normalized = new URL(url).toString()
    const optionsStr = options ? JSON.stringify(options) : ''
    return `roast:${Buffer.from(normalized + optionsStr).toString('base64')}`
  }
}

// Maintain compatibility with existing CacheManager interface
export class CacheManager {
  static async get<T>(key: string): Promise<T | null> {
    const cacheBackend = process.env.CACHE_BACKEND || 'dynamodb'
    
    if (cacheBackend === 'redis') {
      // Use Redis if explicitly configured
      const { redis } = await import('./redis')
      return await redis.get<T>(key) 
    }
    
    // Default to DynamoDB
    return await DynamoDBCacheManager.get<T>(key)
  }

  static async set<T>(key: string, value: T, layer: string = 'WARM'): Promise<void> {
    const cacheBackend = process.env.CACHE_BACKEND || 'dynamodb'
    
    if (cacheBackend === 'redis') {
      // Use Redis if explicitly configured
      const { CacheManager: RedisCacheManager } = await import('./redis')
      return await RedisCacheManager.set<T>(key, value, layer as any)
    }
    
    // Default to DynamoDB
    return await DynamoDBCacheManager.set<T>(key, value, layer as any)
  }

  static generateCacheKey(url: string, options?: Record<string, any>): string {
    return DynamoDBCacheManager.generateCacheKey(url, options)
  }
}