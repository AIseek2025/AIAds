import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redis: Redis | null = null;
let redisInitialized = false;

// Redis connection pool configuration
const redisPoolConfig = {
  // Maximum number of retries per request
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  // Connection timeout
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
  // Keep alive
  keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE || '30000', 10),
  // Maximum listeners
  maxListeners: parseInt(process.env.REDIS_MAX_LISTENERS || '20', 10),
};

/**
 * Initialize Redis connection with optimized configuration
 * P1 Bug Fix: Added proper error handling and initialization flag
 */
export function initRedis(): Redis | null {
  // P1 Fix: Prevent multiple initializations
  if (redisInitialized) {
    logger.debug('Redis already initialized');
    return redis;
  }

  const redisUrl = process.env.REDIS_URL;

  // P1 Fix: Handle missing Redis URL gracefully
  if (!redisUrl || redisUrl.trim() === '') {
    logger.warn('REDIS_URL not configured, Redis disabled');
    redisInitialized = true;
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      ...redisPoolConfig,
      // Retry strategy
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.warn('Redis max retries reached');
          return null;
        }
        const delay = Math.min(times * 200, 2000);
        logger.info(`Redis reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
      // Reconnect on error
      reconnectOnError: (err: Error) => {
        logger.warn('Redis connection error, attempting reconnect', { error: err.message });
        return true;
      },
      // Enable auto-pipelining for better performance
      enableAutoPipelining: true,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
      redisInitialized = true;
    });

    redis.on('error', (err) => {
      logger.error('Redis error', { error: err.message });
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
      redisInitialized = false;
    });

    redis.on('reconnecting', (delay: number) => {
      logger.info('Redis reconnecting', { delay });
    });

    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis', { error });
    redisInitialized = true;
    return null;
  }
}

// Get Redis instance
export function getRedis(): Redis | null {
  return redis;
}

// Close Redis connection
export async function closeRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
      logger.info('Redis connection closed');
      redis = null;
    } catch (error) {
      logger.error('Error closing Redis connection', { error });
    }
  }
}

// Cache utilities
export class CacheService {
  private redis: Redis | null;
  private defaultTTL: number;

  constructor(redisInstance: Redis | null = null, defaultTTL: number = 3600) {
    this.redis = redisInstance || getRedis();
    this.defaultTTL = defaultTTL;
  }

  // Get value from cache
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  // Set value in cache
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const serialized = JSON.stringify(value);
      const expiration = ttl || this.defaultTTL;
      await this.redis.setex(key, expiration, serialized);
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error });
      return false;
    }
  }

  // Delete value from cache
  async delete(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error });
      return false;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  }

  // Increment counter
  async increment(key: string, ttl?: number): Promise<number> {
    if (!this.redis) return 0;

    try {
      const value = await this.redis.incr(key);
      if (ttl && value === 1) {
        await this.redis.expire(key, ttl);
      }
      return value;
    } catch (error) {
      logger.error('Cache increment error', { key, error });
      return 0;
    }
  }

  // Get counter value
  async getCounter(key: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      const value = await this.redis.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      logger.error('Cache getCounter error', { key, error });
      return 0;
    }
  }
}

export const cacheService = new CacheService();
