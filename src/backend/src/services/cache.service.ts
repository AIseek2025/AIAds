import { KolPlatform, KolStatus, Prisma } from '@prisma/client';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// P1 Bug Fix: Remove circular dependency by not importing getRedis at module level
// Instead, we'll get Redis instance lazily when needed
let redisInstance: Redis | null = null;

/**
 * Set Redis instance for cache service
 * Called during application initialization
 */
export function setRedisInstance(redis: Redis | null): void {
  redisInstance = redis;
  logger.debug('Redis instance set for cache service', { connected: redis !== null });
}

/**
 * Get Redis instance
 * P1 Fix: Lazy initialization to avoid circular dependency
 */
function getRedisInstance(): Redis | null {
  return redisInstance;
}

/**
 * Cache Key Builder
 * Centralized cache key naming convention
 */
export const CacheKeys = {
  // User related
  user: {
    byId: (id: string): string => `user:${id}`,
    byEmail: (email: string): string => `user:email:${email}`,
    byPhone: (phone: string): string => `user:phone:${phone}`,
    list: (role?: string, status?: string): string => `user:list:${role || 'all'}:${status || 'all'}`,
  },

  // Advertiser related
  advertiser: {
    byId: (id: string): string => `advertiser:${id}`,
    byUserId: (userId: string): string => `advertiser:user:${userId}`,
    campaigns: (advertiserId: string, status?: string): string =>
      `advertiser:${advertiserId}:campaigns:${status || 'all'}`,
    wallet: (advertiserId: string): string => `advertiser:${advertiserId}:wallet`,
  },

  // KOL related
  kol: {
    byId: (id: string): string => `kol:${id}`,
    byUserId: (userId: string): string => `kol:user:${userId}`,
    byPlatform: (platform: string, status?: string): string => `kol:platform:${platform}:${status || 'all'}`,
    search: (params: KolSearchParams): string => `kol:search:${hashParams(params as Record<string, unknown>)}`,
    stats: (kolId: string, date?: string): string => `kol:${kolId}:stats:${date || 'latest'}`,
    accounts: (kolId: string): string => `kol:${kolId}:accounts`,
  },

  // Campaign related
  campaign: {
    byId: (id: string): string => `campaign:${id}`,
    list: (advertiserId: string, status?: string): string => `campaign:list:${advertiserId}:${status || 'all'}`,
    active: (): string => 'campaign:active',
    stats: (campaignId: string): string => `campaign:${campaignId}:stats`,
  },

  // Order related
  order: {
    byId: (id: string): string => `order:${id}`,
    byNo: (orderNo: string): string => `order:no:${orderNo}`,
    list: (advertiserId?: string, kolId?: string, status?: string): string =>
      `order:list:${advertiserId || 'all'}:${kolId || 'all'}:${status || 'all'}`,
    stats: (orderId: string): string => `order:${orderId}:stats`,
  },

  // Dashboard related
  dashboard: {
    advertiser: (advertiserId: string, range: string): string => `dashboard:advertiser:${advertiserId}:${range}`,
    kol: (kolId: string, range: string): string => `dashboard:kol:${kolId}:${range}`,
    admin: (adminId: string, range: string): string => `dashboard:admin:${adminId}:${range}`,
    analytics: (type: string, params: string): string => `dashboard:analytics:${type}:${params}`,
  },

  // System related
  system: {
    config: (key: string): string => `system:config:${key}`,
    counters: (name: string): string => `system:counters:${name}`,
    locks: (name: string): string => `system:locks:${name}`,
  },
};

/**
 * KOL Search Parameters for cache key generation
 */
interface KolSearchParams {
  platform?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  category?: string;
  country?: string;
  status?: string;
}

/**
 * Hash function for generating cache keys from complex parameters
 */
function hashParams(params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .map((key) => {
      const v = params[key];
      const serialized = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
      return `${key}=${serialized}`;
    })
    .join('&');

  // Simple hash - in production, use crypto.createHash('md5')
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Cache TTL Configuration
 * P1 Performance: Optimized TTL settings based on data access patterns
 */
export const CacheTTL = {
  // User related - high frequency access
  user: {
    detail: 600, // 10 minutes - user details change infrequently
    list: 300, // 5 minutes - user lists
  },

  // KOL related - high frequency access
  kol: {
    detail: 600, // 10 minutes - KOL details
    search: 300, // 5 minutes - search results
    stats: 180, // 3 minutes - statistics
    accounts: 300, // 5 minutes - account list
  },

  // Campaign related - medium frequency
  campaign: {
    detail: 300, // 5 minutes - campaign details
    list: 180, // 3 minutes - campaign lists
    stats: 120, // 2 minutes - statistics
  },

  // Order related - medium frequency
  order: {
    detail: 180, // 3 minutes - order details
    list: 120, // 2 minutes - order lists
    stats: 60, // 1 minute - real-time stats
  },

  // Dashboard related - low frequency (aggregated data)
  dashboard: {
    advertiser: 60, // 1 minute - near real-time
    kol: 60, // 1 minute - near real-time
    admin: 60, // 1 minute - near real-time
    analytics: 120, // 2 minutes - analytics data
  },

  // System related
  system: {
    config: 3600, // 1 hour - configuration
    counters: 60, // 1 minute - counters
  },
};

/**
 * Cache Service Configuration
 */
interface CacheConfig {
  defaultTTL: number;
  prefix?: string;
  enabled: boolean;
}

/**
 * Advanced Cache Service
 * Provides multi-level caching, cache warming, and invalidation strategies
 */
export class AdvancedCacheService {
  private redis: Redis | null;
  private config: CacheConfig;
  private stats: CacheStats;

  constructor(config?: Partial<CacheConfig>) {
    // P1 Fix: Use lazy initialization to avoid circular dependency
    this.redis = getRedisInstance();
    this.config = {
      defaultTTL: 300, // 5 minutes
      prefix: 'aiads:',
      enabled: true,
      ...config,
    };
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * Get or Set pattern
   * Fetches from cache, if not exists, calls fetcher and caches the result
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const fullKey = this.buildKey(key);

    if (!this.config.enabled || !this.redis) {
      return fetcher();
    }

    try {
      // Try to get from cache
      const cached = await this.redis.get(fullKey);
      if (cached) {
        this.stats.hits++;
        logger.debug('Cache hit', { key: fullKey });
        return JSON.parse(cached) as T;
      }

      // Cache miss, fetch from source
      this.stats.misses++;
      logger.debug('Cache miss', { key: fullKey });

      const data = await fetcher();

      // Cache the result
      await this.set(key, data, ttl);

      return data;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache getOrSet error', { key: fullKey, error });
      // Fallback to fetcher on cache error
      return fetcher();
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);

    if (!this.config.enabled || !this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(fullKey);
      if (value) {
        this.stats.hits++;
        return JSON.parse(value) as T;
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache get error', { key: fullKey, error });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const fullKey = this.buildKey(key);

    if (!this.config.enabled || !this.redis) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      const expiration = ttl ?? this.config.defaultTTL;
      await this.redis.setex(fullKey, expiration, serialized);
      this.stats.sets++;
      logger.debug('Cache set', { key: fullKey, ttl: expiration });
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache set error', { key: fullKey, error });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);

    if (!this.config.enabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.del(fullKey);
      this.stats.deletes++;
      logger.debug('Cache delete', { key: fullKey });
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache delete error', { key: fullKey, error });
      return false;
    }
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const fullKeys = keys.map((k) => this.buildKey(k));

    if (!this.config.enabled || !this.redis || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const values = await this.redis.mget(...fullKeys);
      return values.map((v) => {
        if (v) {
          this.stats.hits++;
          return JSON.parse(v) as T;
        }
        this.stats.misses++;
        return null;
      });
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache mget error', { keys: fullKeys, error });
      return keys.map(() => null);
    }
  }

  /**
   * Batch set multiple keys
   */
  async mset<T>(entries: { key: string; value: T; ttl?: number }[]): Promise<boolean> {
    if (!this.config.enabled || !this.redis || entries.length === 0) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();

      entries.forEach(({ key, value, ttl }) => {
        const fullKey = this.buildKey(key);
        const expiration = ttl ?? this.config.defaultTTL;
        const serialized = JSON.stringify(value);
        pipeline.setex(fullKey, expiration, serialized);
      });

      await pipeline.exec();
      this.stats.sets += entries.length;
      logger.debug('Cache mset', { count: entries.length });
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache mset error', { error });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.config.enabled || !this.redis) {
      return 0;
    }

    try {
      const fullPattern = this.buildKey(pattern);
      const keys = await this.redis.keys(fullPattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.deletes += keys.length;
        logger.info('Cache invalidation by pattern', { pattern: fullPattern, count: keys.length });
        return keys.length;
      }

      return 0;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache deleteByPattern error', { pattern, error });
      return 0;
    }
  }

  /**
   * Cache warming - preload multiple keys in parallel
   */
  async warmup(
    entries: { key: string; fetcher: () => Promise<unknown>; ttl?: number }[],
    concurrency: number = 5
  ): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      return;
    }

    logger.info('Starting cache warmup', { count: entries.length });

    // Process in batches to avoid overwhelming the system
    const batches = this.chunkArray(entries, concurrency);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async ({ key, fetcher, ttl }) => {
          try {
            const data = await fetcher();
            await this.set(key, data, ttl);
            logger.debug('Cache warmed', { key: this.buildKey(key) });
          } catch (error) {
            logger.error('Cache warmup failed', { key, error });
          }
        })
      );
    }

    logger.info('Cache warmup completed');
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);

    if (!this.config.enabled || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache exists error', { key: fullKey, error });
      return false;
    }
  }

  /**
   * Increment a counter in cache with TTL
   * Used for rate limiting and counters
   */
  async increment(key: string, ttlSeconds: number): Promise<number> {
    const fullKey = this.buildKey(key);

    if (!this.config.enabled || !this.redis) {
      return 0;
    }

    try {
      const result = await this.redis.incr(fullKey);
      // Set TTL only on first increment (when value is 1)
      if (result === 1) {
        await this.redis.expire(fullKey, ttlSeconds);
      }
      logger.debug('Cache increment', { key: fullKey, value: result });
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache increment error', { key: fullKey, error });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, errors: 0, sets: 0, deletes: 0 };
  }

  /**
   * Enable/disable cache
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    logger.info(`Cache ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  /**
   * Chunk array for batch processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Cache Statistics Interface
 */
interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  sets: number;
  deletes: number;
}

/**
 * Cache Invalidation Helper
 * Invalidates related cache entries when data changes
 */
export class CacheInvalidator {
  private cache: AdvancedCacheService;

  constructor(cache: AdvancedCacheService) {
    this.cache = cache;
  }

  /**
   * Invalidate user related cache
   */
  async invalidateUser(userId: string): Promise<void> {
    const patterns = [`user:${userId}`, `user:${userId}:*`, `advertiser:user:${userId}`, `kol:user:${userId}`];

    await Promise.all(patterns.map((p) => this.cache.deleteByPattern(p)));
    logger.info('User cache invalidated', { userId });
  }

  /**
   * Invalidate advertiser related cache
   */
  async invalidateAdvertiser(advertiserId: string): Promise<void> {
    const patterns = [
      `advertiser:${advertiserId}`,
      `advertiser:${advertiserId}:*`,
      `campaign:list:${advertiserId}:*`,
      `order:list:${advertiserId}:*:*`,
      `dashboard:advertiser:${advertiserId}:*`,
    ];

    await Promise.all(patterns.map((p) => this.cache.deleteByPattern(p)));
    logger.info('Advertiser cache invalidated', { advertiserId });
  }

  /**
   * Invalidate KOL related cache
   */
  async invalidateKol(kolId: string): Promise<void> {
    const patterns = [`kol:${kolId}`, `kol:${kolId}:*`, `order:list:*:${kolId}:*`, `dashboard:kol:${kolId}:*`];

    await Promise.all(patterns.map((p) => this.cache.deleteByPattern(p)));
    logger.info('KOL cache invalidated', { kolId });
  }

  /**
   * Invalidate campaign related cache
   */
  async invalidateCampaign(campaignId: string): Promise<void> {
    const patterns = [`campaign:${campaignId}`, `campaign:${campaignId}:*`];

    await Promise.all(patterns.map((p) => this.cache.deleteByPattern(p)));
    logger.info('Campaign cache invalidated', { campaignId });
  }

  /**
   * Invalidate order related cache
   */
  async invalidateOrder(orderId: string): Promise<void> {
    const patterns = [`order:${orderId}`, `order:${orderId}:*`];

    await Promise.all(patterns.map((p) => this.cache.deleteByPattern(p)));
    logger.info('Order cache invalidated', { orderId });
  }

  /**
   * Invalidate dashboard cache
   */
  async invalidateDashboard(type: 'advertiser' | 'kol' | 'admin', id: string): Promise<void> {
    const pattern = `dashboard:${type}:${id}:*`;
    await this.cache.deleteByPattern(pattern);
    logger.info('Dashboard cache invalidated', { type, id });
  }
}

/**
 * Create singleton cache service instance
 */
export const cacheService = new AdvancedCacheService({
  defaultTTL: 300, // 5 minutes
  enabled: process.env.CACHE_ENABLED !== 'false',
});

/**
 * Create cache invalidator instance
 */
export const cacheInvalidator = new CacheInvalidator(cacheService);

/**
 * Cache Warmer Service
 * P1 Performance: Pre-warm cache with frequently accessed data
 */
export class CacheWarmer {
  private cache: AdvancedCacheService;

  constructor(cache: AdvancedCacheService) {
    this.cache = cache;
  }

  /**
   * Warm up popular KOLs cache
   * P1 Performance: Pre-cache top KOLs for faster search results
   */
  async warmupPopularKols(limit: number = 50): Promise<void> {
    logger.info('Starting popular KOLs cache warmup', { limit });

    try {
      const prisma = (await import('../config/database')).default;

      // Fetch popular KOLs (by followers)
      const popularKols = await prisma.kol.findMany({
        where: { status: KolStatus.active },
        select: {
          id: true,
          platform: true,
          platformUsername: true,
          platformDisplayName: true,
          platformAvatarUrl: true,
          bio: true,
          category: true,
          country: true,
          followers: true,
          engagementRate: true,
          verified: true,
          basePrice: true,
          tags: true,
        },
        orderBy: { followers: 'desc' },
        take: limit,
      });

      // Cache each popular KOL
      const warmupTasks = popularKols.map(async (kol) => {
        const cacheKey = `kol:${kol.id}`;
        await this.cache.set(cacheKey, kol, CacheTTL.kol.detail);
        logger.debug('Warmed up KOL cache', { kolId: kol.id });
      });

      await Promise.all(warmupTasks);
      logger.info('Popular KOLs cache warmup completed', { count: popularKols.length });
    } catch (error) {
      logger.error('Failed to warm up popular KOLs', { error });
    }
  }

  /**
   * Warm up KOL search cache for common filters
   * P1 Performance: Pre-cache common search queries
   */
  async warmupCommonSearches(): Promise<void> {
    logger.info('Starting common KOL searches cache warmup');

    try {
      const prisma = (await import('../config/database')).default;

      // Common search combinations（字段与 Prisma Kol 对齐；minFollowers 映射到 followers.gte）
      const commonSearches: Array<{
        platform: KolPlatform;
        status: KolStatus;
        minFollowers?: number;
      }> = [
        { platform: KolPlatform.tiktok, status: KolStatus.active },
        { platform: KolPlatform.youtube, status: KolStatus.active },
        { platform: KolPlatform.instagram, status: KolStatus.active },
        { platform: KolPlatform.tiktok, status: KolStatus.active, minFollowers: 10000 },
        { platform: KolPlatform.tiktok, status: KolStatus.active, minFollowers: 100000 },
      ];

      const warmupTasks = commonSearches.map(async (filters) => {
        const where: Prisma.KolWhereInput = {
          platform: filters.platform,
          status: filters.status,
        };
        if (filters.minFollowers !== undefined) {
          where.followers = { gte: filters.minFollowers };
        }
        const [kols, total] = await Promise.all([
          prisma.kol.findMany({
            where,
            select: {
              id: true,
              platform: true,
              platformUsername: true,
              platformDisplayName: true,
              followers: true,
              engagementRate: true,
            },
            orderBy: { followers: 'desc' },
            take: 20,
          }),
          prisma.kol.count({ where }),
        ]);

        const cacheKey = `kol:search:${Buffer.from(
          JSON.stringify({
            p: filters.platform,
            minF: filters.minFollowers || 0,
            page: 1,
            size: 20,
          })
        )
          .toString('base64')
          .substring(0, 32)}`;

        await this.cache.set(cacheKey, { items: kols, total }, CacheTTL.kol.search);
        logger.debug('Warmed up search cache', { filters, cacheKey });
      });

      await Promise.all(warmupTasks);
      logger.info('Common searches cache warmup completed');
    } catch (error) {
      logger.error('Failed to warm up common searches', { error });
    }
  }

  /**
   * Warm up dashboard cache for active users
   * P2 Performance: Pre-cache dashboard data for active advertisers
   */
  async warmupActiveDashboards(): Promise<void> {
    logger.info('Starting active dashboards cache warmup');

    try {
      const prisma = (await import('../config/database')).default;

      // Get active advertisers (with recent campaigns)
      const activeAdvertisers = await prisma.advertiser.findMany({
        where: {
          campaigns: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              },
            },
          },
        },
        select: { id: true },
        take: 20,
      });

      // Warm up dashboard cache for each active advertiser
      const warmupTasks = activeAdvertisers.map(async (advertiser) => {
        const cacheKey = `dashboard:advertiser:${advertiser.id}:today`;
        // Placeholder data - actual data will be populated on first request
        await this.cache.set(cacheKey, { warmed: true }, CacheTTL.dashboard.advertiser);
        logger.debug('Warmed up dashboard cache', { advertiserId: advertiser.id });
      });

      await Promise.all(warmupTasks);
      logger.info('Active dashboards cache warmup completed', { count: activeAdvertisers.length });
    } catch (error) {
      logger.error('Failed to warm up active dashboards', { error });
    }
  }

  /**
   * Run full cache warmup
   * P1 Performance: Execute all warmup tasks
   */
  async warmupAll(): Promise<void> {
    logger.info('Starting full cache warmup');

    const startTime = Date.now();

    await this.warmupPopularKols(50);
    await this.warmupCommonSearches();
    await this.warmupActiveDashboards();

    const duration = Date.now() - startTime;
    logger.info('Full cache warmup completed', { duration: `${duration}ms` });
  }
}

/**
 * Create cache warmer instance
 */
export const cacheWarmer = new CacheWarmer(cacheService);

/**
 * Decorator for caching function results
 */
export function Cached(keyFn: (...args: unknown[]) => string, ttl?: number) {
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value as ((this: unknown, ...args: unknown[]) => Promise<unknown>) | undefined;
    if (typeof originalMethod !== 'function') {
      return descriptor;
    }

    descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
      const cacheKey = keyFn(...args);
      const cache = cacheService;

      return cache.getOrSet(cacheKey, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}
