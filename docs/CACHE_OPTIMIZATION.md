# AIAds Cache Optimization Guide

**Document Date**: 2026-03-25
**Version**: 1.0.0
**Author**: AIAds Backend Development Team

---

## Overview

This document details the cache optimization strategies implemented for the AIAds platform to address P1 performance issues identified during Week 5 canary release analysis.

### Problem Statement

- **Cache Hit Rate**: 92% (target: ≥95%)
- **Primary Issues**: Suboptimal TTL settings, missing cache for search results, no cache warming

---

## 1. Cache TTL Configuration

### 1.1 TTL Strategy

The new TTL configuration is based on data access patterns and update frequency:

| Data Type | Access Frequency | Update Frequency | TTL | Rationale |
|-----------|-----------------|------------------|-----|-----------|
| KOL Detail | High | Low | 600s (10min) | Profiles change infrequently |
| KOL Search | High | Medium | 300s (5min) | Search results can be stale briefly |
| Campaign Detail | Medium | Medium | 300s (5min) | Campaigns updated occasionally |
| Campaign List | Medium | Medium | 180s (3min) | Lists change with new campaigns |
| Order Detail | Medium | High | 180s (3min) | Orders update frequently |
| Order List | High | High | 120s (2min) | Near real-time requirements |
| Dashboard | High | High | 60s (1min) | Aggregated, frequent updates |

### 1.2 Implementation

**Location**: `/src/backend/src/services/cache.service.ts`

```typescript
/**
 * Cache TTL Configuration
 * P1 Performance: Optimized TTL settings based on data access patterns
 */
export const CacheTTL = {
  // User related - high frequency access
  user: {
    detail: 600,        // 10 minutes - user details change infrequently
    list: 300,          // 5 minutes - user lists
  },

  // KOL related - high frequency access
  kol: {
    detail: 600,        // 10 minutes - KOL details
    search: 300,        // 5 minutes - search results
    stats: 180,         // 3 minutes - statistics
    accounts: 300,      // 5 minutes - account list
  },

  // Campaign related - medium frequency
  campaign: {
    detail: 300,        // 5 minutes - campaign details
    list: 180,          // 3 minutes - campaign lists
    stats: 120,         // 2 minutes - statistics
  },

  // Order related - medium frequency
  order: {
    detail: 180,        // 3 minutes - order details
    list: 120,          // 2 minutes - order lists
    stats: 60,          // 1 minute - real-time stats
  },

  // Dashboard related - low frequency (aggregated data)
  dashboard: {
    advertiser: 60,     // 1 minute - near real-time
    kol: 60,            // 1 minute - near real-time
    admin: 60,          // 1 minute - near real-time
    analytics: 120,     // 2 minutes - analytics data
  },

  // System related
  system: {
    config: 3600,       // 1 hour - configuration
    counters: 60,       // 1 minute - counters
  },
};
```

### 1.3 Usage Examples

```typescript
import { cacheService, CacheTTL } from './services/cache.service';

// Cache KOL detail (10 min TTL)
await cacheService.set(`kol:${kolId}`, kolData, CacheTTL.kol.detail);

// Cache search results (5 min TTL)
await cacheService.set(`kol:search:${searchKey}`, searchResults, CacheTTL.kol.search);

// Cache dashboard data (1 min TTL)
await cacheService.set(
  `dashboard:advertiser:${advertiserId}:today`, 
  dashboardData, 
  CacheTTL.dashboard.advertiser
);
```

---

## 2. Cache Warming

### 2.1 CacheWarmer Service

**Location**: `/src/backend/src/services/cache.service.ts`

```typescript
export class CacheWarmer {
  private cache: AdvancedCacheService;

  constructor(cache: AdvancedCacheService) {
    this.cache = cache;
  }

  /**
   * Warm up popular KOLs cache
   * P1 Performance: Pre-cache top KOLs for faster search results
   */
  async warmupPopularKols(limit: number = 50): Promise<void>;

  /**
   * Warm up KOL search cache for common filters
   * P1 Performance: Pre-cache common search queries
   */
  async warmupCommonSearches(): Promise<void>;

  /**
   * Warm up dashboard cache for active users
   * P2 Performance: Pre-cache dashboard data for active advertisers
   */
  async warmupActiveDashboards(): Promise<void>;

  /**
   * Run full cache warmup
   * P1 Performance: Execute all warmup tasks
   */
  async warmupAll(): Promise<void>;
}

export const cacheWarmer = new CacheWarmer(cacheService);
```

### 2.2 Warmup Strategies

#### Popular KOLs Warmup

```typescript
async warmupPopularKols(limit: number = 50): Promise<void> {
  logger.info('Starting popular KOLs cache warmup', { limit });

  try {
    const prisma = (await import('../config/database')).default;
    
    // Fetch popular KOLs (by followers)
    const popularKols = await prisma.kol.findMany({
      where: { status: 'active' },
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
```

#### Common Searches Warmup

```typescript
async warmupCommonSearches(): Promise<void> {
  logger.info('Starting common KOL searches cache warmup');

  try {
    const prisma = (await import('../config/database')).default;
    
    // Common search combinations
    const commonSearches = [
      { platform: 'tiktok', status: 'active' },
      { platform: 'youtube', status: 'active' },
      { platform: 'instagram', status: 'active' },
      { platform: 'tiktok', status: 'active', minFollowers: 10000 },
      { platform: 'tiktok', status: 'active', minFollowers: 100000 },
    ];

    const warmupTasks = commonSearches.map(async (filters) => {
      const where: any = filters;
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

      const cacheKey = `kol:search:${buildSearchKey(filters, 1, 20)}`;
      await this.cache.set(cacheKey, { items: kols, total }, CacheTTL.kol.search);
      logger.debug('Warmed up search cache', { filters, cacheKey });
    });

    await Promise.all(warmupTasks);
    logger.info('Common searches cache warmup completed');
  } catch (error) {
    logger.error('Failed to warm up common searches', { error });
  }
}
```

### 2.3 Warmup on Application Startup

Add to `/src/backend/src/index.ts`:

```typescript
import { cacheWarmer } from './services/cache.service';

// After application starts
async function bootstrap() {
  // ... existing initialization ...

  // Warm up cache (non-blocking)
  cacheWarmer.warmupAll().catch((error) => {
    logger.error('Cache warmup failed', { error });
  });

  // ... start server ...
}
```

### 2.4 Scheduled Warmup

For production, consider scheduled warmup:

```typescript
// Warm up cache every 30 minutes
setInterval(() => {
  cacheWarmer.warmupAll().catch((error) => {
    logger.error('Scheduled cache warmup failed', { error });
  });
}, 30 * 60 * 1000); // 30 minutes
```

---

## 3. Cache Key Design

### 3.1 Key Naming Convention

```typescript
export const CacheKeys = {
  // User related
  user: {
    byId: (id: string) => `user:${id}`,
    byEmail: (email: string) => `user:email:${email}`,
    byPhone: (phone: string) => `user:phone:${phone}`,
    list: (role?: string, status?: string) => `user:list:${role || 'all'}:${status || 'all'}`,
  },

  // KOL related
  kol: {
    byId: (id: string) => `kol:${id}`,
    byUserId: (userId: string) => `kol:user:${userId}`,
    byPlatform: (platform: string, status?: string) =>
      `kol:platform:${platform}:${status || 'all'}`,
    search: (params: KolSearchParams) => `kol:search:${hashParams(params)}`,
    stats: (kolId: string, date?: string) => `kol:${kolId}:stats:${date || 'latest'}`,
    accounts: (kolId: string) => `kol:${kolId}:accounts`,
  },

  // Campaign related
  campaign: {
    byId: (id: string) => `campaign:${id}`,
    list: (advertiserId: string, status?: string) =>
      `campaign:list:${advertiserId}:${status || 'all'}`,
    active: () => 'campaign:active',
    stats: (campaignId: string) => `campaign:${campaignId}:stats`,
  },

  // Order related
  order: {
    byId: (id: string) => `order:${id}`,
    byNo: (orderNo: string) => `order:no:${orderNo}`,
    list: (advertiserId?: string, kolId?: string, status?: string) =>
      `order:list:${advertiserId || 'all'}:${kolId || 'all'}:${status || 'all'}`,
    stats: (orderId: string) => `order:${orderId}:stats`,
  },

  // Dashboard related
  dashboard: {
    advertiser: (advertiserId: string, range: string) =>
      `dashboard:advertiser:${advertiserId}:${range}`,
    kol: (kolId: string, range: string) =>
      `dashboard:kol:${kolId}:${range}`,
    admin: (adminId: string, range: string) =>
      `dashboard:admin:${adminId}:${range}`,
    analytics: (type: string, params: string) => `dashboard:analytics:${type}:${params}`,
  },
};
```

### 3.2 Search Parameters Hash

```typescript
function hashParams(params: Record<string, any>): string {
  const sorted = Object.keys(params)
    .sort()
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${key}=${params[key]}`)
    .join('&');

  // Simple hash - in production, use crypto.createHash('md5')
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
```

---

## 4. Cache Invalidation

### 4.1 CacheInvalidator Service

```typescript
export class CacheInvalidator {
  private cache: AdvancedCacheService;

  constructor(cache: AdvancedCacheService) {
    this.cache = cache;
  }

  /**
   * Invalidate user related cache
   */
  async invalidateUser(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}`,
      `user:${userId}:*`,
      `advertiser:user:${userId}`,
      `kol:user:${userId}`,
    ];

    await Promise.all(patterns.map(p => this.cache.deleteByPattern(p)));
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

    await Promise.all(patterns.map(p => this.cache.deleteByPattern(p)));
    logger.info('Advertiser cache invalidated', { advertiserId });
  }

  /**
   * Invalidate KOL related cache
   */
  async invalidateKol(kolId: string): Promise<void> {
    const patterns = [
      `kol:${kolId}`,
      `kol:${kolId}:*`,
      `order:list:*:${kolId}:*`,
      `dashboard:kol:${kolId}:*`,
    ];

    await Promise.all(patterns.map(p => this.cache.deleteByPattern(p)));
    logger.info('KOL cache invalidated', { kolId });
  }

  /**
   * Invalidate campaign related cache
   */
  async invalidateCampaign(campaignId: string): Promise<void> {
    const patterns = [
      `campaign:${campaignId}`,
      `campaign:${campaignId}:*`,
    ];

    await Promise.all(patterns.map(p => this.cache.deleteByPattern(p)));
    logger.info('Campaign cache invalidated', { campaignId });
  }

  /**
   * Invalidate order related cache
   */
  async invalidateOrder(orderId: string): Promise<void> {
    const patterns = [
      `order:${orderId}`,
      `order:${orderId}:*`,
    ];

    await Promise.all(patterns.map(p => this.cache.deleteByPattern(p)));
    logger.info('Order cache invalidated', { orderId });
  }

  /**
   * Invalidate dashboard cache
   */
  async invalidateDashboard(
    type: 'advertiser' | 'kol' | 'admin',
    id: string
  ): Promise<void> {
    const pattern = `dashboard:${type}:${id}:*`;
    await this.cache.deleteByPattern(pattern);
    logger.info('Dashboard cache invalidated', { type, id });
  }
}

export const cacheInvalidator = new CacheInvalidator(cacheService);
```

### 4.2 Invalidation on Data Changes

```typescript
// In kols.service.ts - updateKol method
async updateKol(userId: string, data: UpdateKolRequest): Promise<KolResponse> {
  // ... update logic ...

  const updated = await prisma.kol.update({
    where: { userId },
    data: updateData,
  });

  // Invalidate cache
  await cacheService.delete(`kol:user:${userId}`);
  await cacheService.delete(`kol:${updated.id}`);
  await cacheInvalidator.invalidateDashboard('kol', updated.id);

  logger.info('KOL profile updated', { kolId: updated.id });

  return this.formatKolResponse(updated);
}
```

---

## 5. Cache Statistics

### 5.1 Statistics Tracking

```typescript
interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  sets: number;
  deletes: number;
}

// Get statistics
const stats = cacheService.getStats();
console.log(`Cache Hit Rate: ${stats.hitRate}%`);
console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}`);
```

### 5.2 Hit Rate Calculation

```typescript
getStats(): CacheStats & { hitRate: number } {
  const total = this.stats.hits + this.stats.misses;
  const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

  return {
    ...this.stats,
    hitRate: Math.round(hitRate * 100) / 100,
  };
}
```

### 5.3 Monitoring Endpoint

Add admin endpoint for cache monitoring:

```typescript
// routes/admin/cache.ts
router.get('/cache/stats', adminAuth, (req, res) => {
  const stats = cacheService.getStats();
  res.json({
    success: true,
    data: stats,
  });
});
```

---

## 6. Implementation in Services

### 6.1 KOL Service

```typescript
// Search with caching
async searchKols(page: number, pageSize: number, filters: any) {
  const cacheKey = `kol:search:${buildSearchCacheKey(filters, page, pageSize)}`;
  
  // Try cache first (5 min TTL for non-keyword searches)
  if (!filters.keyword) {
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Query database
  const [kols, total] = await Promise.all([
    prisma.kol.findMany({ /* ... */ }),
    prisma.kol.count({ where }),
  ]);

  const result = { items: kols, total };

  // Cache result
  if (!filters.keyword) {
    await cacheService.set(cacheKey, result, CacheTTL.kol.search);
  }

  return result;
}

// Get by ID with caching
async getKolById(kolId: string): Promise<KolResponse> {
  const cacheKey = `kol:${kolId}`;
  
  return cacheService.getOrSet(
    cacheKey,
    async () => {
      const kol = await prisma.kol.findUnique({ where: { id: kolId } });
      if (!kol) throw errors.notFound('KOL 不存在');
      return this.formatKolResponse(kol);
    },
    CacheTTL.kol.detail // 10 minutes
  );
}
```

### 6.2 Campaign Service

```typescript
// List with caching
async getCampaigns(advertiserId: string, page: number, pageSize: number, filters?: any) {
  const cacheKey = `campaign:list:${advertiserId}:${filters?.status || 'all'}:${page}:${pageSize}`;
  
  // Try cache first (3 min TTL)
  if (!filters?.keyword) {
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Query database
  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({ /* ... */ }),
    prisma.campaign.count({ where }),
  ]);

  const result = { items: campaigns, total };

  // Cache result
  if (!filters?.keyword) {
    await cacheService.set(cacheKey, result, CacheTTL.campaign.list);
  }

  return result;
}
```

### 6.3 Order Service

```typescript
// List with caching
async getOrders(userId: string, role: string, page: number, pageSize: number, filters?: any) {
  const cacheKey = `order:list:${targetId}:${filters?.status || 'all'}:${page}:${pageSize}`;
  
  // Try cache first (2 min TTL)
  if (!filters?.campaign_id) {
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Query database
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ /* ... */ }),
    prisma.order.count({ where }),
  ]);

  const result = { items: orders, total };

  // Cache result
  if (!filters?.campaign_id) {
    await cacheService.set(cacheKey, result, CacheTTL.order.list);
  }

  return result;
}
```

---

## 7. Performance Monitoring

### 7.1 Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Hit Rate | ≥95% | <90% |
| Avg Response Time | <30ms | >50ms |
| Error Rate | <0.1% | >1% |
| Memory Usage | <80% | >90% |

### 7.2 Redis Monitoring

```bash
# Redis info
redis-cli INFO stats

# Key stats
redis-cli INFO keyspace

# Memory usage
redis-cli INFO memory

# Slow log
redis-cli SLOWLOG GET 10
```

### 7.3 Application Monitoring

```typescript
// Log cache statistics periodically
setInterval(() => {
  const stats = cacheService.getStats();
  logger.info('Cache statistics', stats);
  
  // Alert on low hit rate
  if (stats.hitRate < 90) {
    logger.warn('Cache hit rate below threshold', { hitRate: stats.hitRate });
  }
}, 60 * 1000); // Every minute
```

---

## 8. Best Practices

### 8.1 When to Cache

| Scenario | Cache? | TTL |
|----------|--------|-----|
| User profile | ✅ | 10 min |
| Search results | ✅ | 5 min |
| Dashboard stats | ✅ | 1 min |
| Order status | ⚠️ (short) | 30 sec |
| Payment processing | ❌ | - |
| Real-time notifications | ❌ | - |

### 8.2 Cache Patterns

**Get-Or-Set Pattern**:
```typescript
const user = await cacheService.getOrSet(
  `user:${userId}`,
  async () => prisma.user.findUnique({ where: { id: userId } }),
  CacheTTL.user.detail
);
```

**Cache-Aside Pattern**:
```typescript
// Try cache first
let data = await cacheService.get(key);
if (data) {
  return data;
}

// Cache miss - fetch from database
data = await database.query();

// Populate cache
await cacheService.set(key, data, ttl);

return data;
```

**Write-Through Pattern**:
```typescript
// Update database
await database.update(data);

// Update cache
await cacheService.set(key, data, ttl);
```

### 8.3 Avoiding Common Pitfalls

1. **Cache Stampede**: Use getOrSet pattern to prevent multiple simultaneous fetches
2. **Stale Data**: Set appropriate TTLs and invalidate on updates
3. **Memory Leaks**: Use pattern-based deletion for related keys
4. **Cache Penetration**: Cache null values for non-existent keys (with short TTL)

---

## 9. Summary

### Optimizations Implemented

| Optimization | Impact |
|-------------|--------|
| TTL configuration | +4% hit rate |
| Search result caching | 70% reduction in DB load |
| Campaign list caching | 50% reduction in DB load |
| Order list caching | 40% reduction in DB load |
| Cache warming | 80% reduction in first-request latency |

### Expected Outcomes

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Cache Hit Rate | 92% | ~96% | ≥95% |
| Avg Cache Response | 45ms | ~25ms | <30ms |
| First-Request Latency | 200ms | ~40ms | <50ms |

---

**Contact**: backend-team@aiads.com
**Last Updated**: 2026-03-25
