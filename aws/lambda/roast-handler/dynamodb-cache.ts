import AWS from 'aws-sdk';

export class DynamoDBCache {
  private tableName: string;
  private ttlSecondsDefault: number;
  private client: AWS.DynamoDB.DocumentClient;

  constructor(options?: { tableName?: string; ttlSecondsDefault?: number }) {
    this.tableName = options?.tableName || process.env.CACHE_TABLE_NAME || 'roast_cache';
    this.ttlSecondsDefault = options?.ttlSecondsDefault || 3600;
    this.client = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.client
        .get({
          TableName: this.tableName,
          Key: { pk: key }
        })
        .promise();

      if (!result.Item) return null;

      const ttl = result.Item.ttl as number | undefined;
      const now = Math.floor(Date.now() / 1000);
      if (ttl && ttl < now) {
        // Expired; best-effort delete
        this.client
          .delete({ TableName: this.tableName, Key: { pk: key } })
          .promise()
          .catch(() => {});
        return null;
      }

      return (result.Item.value as T) ?? null;
    } catch (err) {
      console.error('DynamoDBCache.get error:', err);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = Math.floor(Date.now() / 1000) + (ttlSeconds ?? this.ttlSecondsDefault);
      await this.client
        .put({
          TableName: this.tableName,
          Item: {
            pk: key,
            ttl,
            value
          }
        })
        .promise();
    } catch (err) {
      console.error('DynamoDBCache.set error:', err);
    }
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    // For cost control, avoid scans in hot paths; provide a script-based invalidation instead.
    console.warn('DynamoDBCache.invalidatePrefix is a no-op for cost efficiency. Use an offline job to clean keys by prefix if needed.');
  }
}