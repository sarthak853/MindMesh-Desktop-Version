import { Redis } from 'ioredis'

class CacheManager {
  private redis: Redis | null = null
  private redisConnected: boolean = false
  // Expose cache keys on the instance for convenience
  public keys = CacheManager.keys

  constructor() {
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          connectTimeout: 1000,
          commandTimeout: 1000,
        })

        this.redis.on('connect', () => {
          this.redisConnected = true
          console.log('Redis connected successfully')
        })

        this.redis.on('error', (error) => {
          this.redisConnected = false
          console.warn('Redis connection failed, falling back to in-memory cache:', error.message)
          this.redis = null
        })

        this.redis.on('close', () => {
          this.redisConnected = false
          this.redis = null
        })
      } catch (error) {
        console.warn('Failed to initialize Redis, using in-memory cache:', error)
        this.redis = null
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null

    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (!this.redis) return

    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis) return

    try {
      await this.redis.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false

    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  async flush(): Promise<void> {
    if (!this.redis) return

    try {
      await this.redis.flushall()
    } catch (error) {
      console.error('Cache flush error:', error)
    }
  }

  // Utility methods for common cache patterns
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const fresh = await fetcher()
    await this.set(key, fresh, ttlSeconds)
    return fresh
  }

  // Generate cache keys
  static keys = {
    user: (id: string) => `user:${id}`,
    userMaps: (userId: string) => `user:${userId}:maps`,
    cognitiveMap: (id: string) => `map:${id}`,
    document: (id: string) => `document:${id}`,
    userDocuments: (userId: string) => `user:${userId}:documents`,
    memoryCards: (userId: string) => `user:${userId}:memory-cards`,
    dueCards: (userId: string) => `user:${userId}:due-cards`,
    aiContext: (userId: string, mode: string) => `ai:${userId}:${mode}`,
    session: (sessionId: string) => `session:${sessionId}`,
  }
}

export const cache = new CacheManager()