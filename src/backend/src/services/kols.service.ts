import prisma from '../config/database';
import { logger } from '../utils/logger';
import { errors, ApiError } from '../middleware/errorHandler';
import { cacheService } from '../config/redis';
import { KolResponse, CreateKolRequest, UpdateKolRequest, KolAccountResponse, BindKolAccountRequest } from '../types';
import { Prisma, type Kol, type KolAccount, type OrderStatus } from '@prisma/client';
import { computeKolKeywordRank } from '../utils/kolSearchRank';

type KolSearchFilters = {
  platform?: string;
  min_followers?: number;
  max_followers?: number;
  categories?: string;
  regions?: string;
  min_engagement_rate?: number;
  keyword?: string;
};

const KOL_SEARCH_SELECT = {
  id: true,
  platform: true,
  platformUsername: true,
  platformDisplayName: true,
  platformAvatarUrl: true,
  bio: true,
  category: true,
  subcategory: true,
  country: true,
  followers: true,
  following: true,
  avgViews: true,
  avgLikes: true,
  avgComments: true,
  avgShares: true,
  engagementRate: true,
  verified: true,
  basePrice: true,
  tags: true,
  createdAt: true,
} as const;

type KolSearchRow = Prisma.KolGetPayload<{ select: typeof KOL_SEARCH_SELECT }>;

export class KolService {
  /**
   * Search KOLs with filters
   * P1 Performance: Optimized with selective field selection and caching
   */
  async searchKols(
    page: number = 1,
    pageSize: number = 20,
    filters: KolSearchFilters
  ): Promise<{ items: KolResponse[]; total: number }> {
    const andClauses: Record<string, unknown>[] = [{ status: 'active' }];

    if (filters.platform) {
      andClauses.push({ platform: filters.platform });
    }

    if (filters.min_followers !== undefined || filters.max_followers !== undefined) {
      const fr: { gte?: number; lte?: number } = {};
      if (filters.min_followers !== undefined) {
        fr.gte = filters.min_followers;
      }
      if (filters.max_followers !== undefined) {
        fr.lte = filters.max_followers;
      }
      andClauses.push({ followers: fr });
    }

    if (filters.min_engagement_rate !== undefined) {
      andClauses.push({ engagementRate: { gte: filters.min_engagement_rate } });
    }

    if (filters.categories) {
      const categories = filters.categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      if (categories.length > 0) {
        andClauses.push({
          OR: categories.map((cat) => ({
            category: { contains: cat, mode: 'insensitive' as const },
          })),
        });
      }
    }

    if (filters.regions) {
      const regions = filters.regions
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      if (regions.length > 0) {
        andClauses.push({ country: { in: regions } });
      }
    }

    const kw = filters.keyword?.trim();
    if (kw) {
      andClauses.push({
        OR: [
          { platformUsername: { contains: kw, mode: 'insensitive' as const } },
          { platformDisplayName: { contains: kw, mode: 'insensitive' as const } },
          { bio: { contains: kw, mode: 'insensitive' as const } },
          { category: { contains: kw, mode: 'insensitive' as const } },
        ],
      });
    }

    const where: { AND: Record<string, unknown>[] } = { AND: andClauses };

    // Keyword search - use cache for expensive keyword queries
    const cacheKey = `kol:search:${this.buildSearchCacheKey(filters, page, pageSize)}`;

    // P1 Performance: Use cache for search results (5 min TTL)
    if (!filters.keyword) {
      const cached = await cacheService.get<{ items: KolResponse[]; total: number }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const [kols, total] = await Promise.all([
      prisma.kol.findMany({
        where,
        select: KOL_SEARCH_SELECT,
        orderBy: { followers: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.kol.count({ where }),
    ]);

    let items = kols.map((k) => this.formatKolSearchResult(k));

    if (kw) {
      items = items.map((item, i) => {
        const row = kols[i];
        const rank = computeKolKeywordRank(
          {
            platformUsername: row.platformUsername,
            platformDisplayName: row.platformDisplayName,
            bio: row.bio,
            category: row.category,
          },
          kw
        );
        return { ...item, search_rank: rank };
      });
      items.sort((a, b) => {
        const sa = a.search_rank?.score ?? 0;
        const sb = b.search_rank?.score ?? 0;
        if (sb !== sa) {
          return sb - sa;
        }
        return b.followers - a.followers;
      });
    }

    const result = {
      items,
      total,
    };

    // Cache non-keyword searches for 5 minutes
    if (!filters.keyword) {
      await cacheService.set(cacheKey, result, 300);
    }

    return result;
  }

  /**
   * 广告主/KOL 发现页：按 ID 查看公开摘要（不含敏感流水字段，与列表口径一致）
   */
  async getKolForAdvertiserDiscovery(kolId: string): Promise<KolResponse> {
    const kol = await prisma.kol.findFirst({
      where: { id: kolId, status: 'active' },
      select: KOL_SEARCH_SELECT,
    });

    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    return this.formatKolSearchResult(kol);
  }

  /**
   * Build cache key for search parameters
   */
  private buildSearchCacheKey(filters: KolSearchFilters, page: number, pageSize: number): string {
    const params = {
      p: filters.platform || '',
      minF: filters.min_followers || 0,
      maxF: filters.max_followers || 999999999,
      cat: filters.categories || '',
      reg: filters.regions || '',
      minE: filters.min_engagement_rate || 0,
      kw: (filters.keyword || '').trim(),
      page,
      size: pageSize,
    };
    return Buffer.from(JSON.stringify(params)).toString('base64').substring(0, 32);
  }

  /**
   * Format KOL search result (lightweight version)
   * P1 Performance: Avoid formatting unnecessary fields for search results
   */
  private formatKolSearchResult(kol: KolSearchRow): KolResponse {
    return {
      id: kol.id,
      user_id: '', // Not needed in search results
      platform: kol.platform,
      platform_id: '',
      platform_username: kol.platformUsername,
      platform_display_name: kol.platformDisplayName ?? undefined,
      platform_avatar_url: kol.platformAvatarUrl ?? undefined,
      bio: kol.bio ?? undefined,
      category: kol.category ?? undefined,
      subcategory: kol.subcategory ?? undefined,
      country: kol.country ?? undefined,
      followers: kol.followers,
      following: kol.following,
      total_videos: 0,
      total_likes: 0,
      avg_views: kol.avgViews,
      avg_likes: kol.avgLikes,
      avg_comments: kol.avgComments,
      avg_shares: kol.avgShares,
      engagement_rate: kol.engagementRate.toNumber(),
      status: 'active',
      verified: kol.verified,
      verified_at: undefined,
      base_price: kol.basePrice?.toNumber(),
      price_per_video: undefined,
      currency: 'USD',
      total_earnings: 0,
      available_balance: 0,
      pending_balance: 0,
      total_orders: 0,
      completed_orders: 0,
      avg_rating: 0,
      tags: kol.tags || [],
      created_at: kol.createdAt.toISOString(),
      updated_at: '',
      last_synced_at: undefined,
    };
  }

  /**
   * Get KOL by ID
   */
  async getKolById(kolId: string): Promise<KolResponse> {
    // Try cache first
    const cacheKey = `kol:${kolId}`;
    const cached = await cacheService.get<KolResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    const response = this.formatKolResponse(kol);

    // Cache for 10 minutes
    await cacheService.set(cacheKey, response, 600);

    return response;
  }

  /**
   * Get KOL by user ID
   */
  async getKolByUserId(userId: string): Promise<KolResponse | null> {
    // Try cache first
    const cacheKey = `kol:user:${userId}`;
    const cached = await cacheService.get<KolResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const kol = await prisma.kol.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!kol) {
      return null;
    }

    const response = this.formatKolResponse(kol);

    // Cache for 5 minutes
    await cacheService.set(cacheKey, response, 300);

    return response;
  }

  /**
   * Create KOL profile
   */
  async createKol(userId: string, data: CreateKolRequest): Promise<KolResponse> {
    // Check if kol already exists
    const existing = await prisma.kol.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ApiError('KOL 资料已存在', 409, 'CONFLICT');
    }

    // Check if user exists and has kol role
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw errors.notFound('用户不存在');
    }

    if (user.role !== 'kol') {
      throw new ApiError('用户角色不是 KOL', 400, 'INVALID_ROLE');
    }

    const kol = await prisma.kol.create({
      data: {
        userId,
        platform: data.platform,
        platformId: data.platform_id,
        platformUsername: data.platform_username,
        bio: data.bio,
        category: data.category,
        country: data.country,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    logger.info('KOL profile created', { kolId: kol.id, userId });

    return this.formatKolResponse(kol);
  }

  /**
   * Update KOL profile
   */
  async updateKol(userId: string, data: UpdateKolRequest): Promise<KolResponse> {
    const kol = await prisma.kol.findUnique({
      where: { userId },
    });

    if (!kol) {
      throw errors.notFound('KOL 资料不存在');
    }

    // Build update data
    const updateData: Prisma.KolUpdateInput = {};
    if (data.bio !== undefined) {
      updateData.bio = data.bio;
    }
    if (data.category !== undefined) {
      updateData.category = data.category;
    }
    if (data.base_price !== undefined) {
      updateData.basePrice = data.base_price;
    }
    if (data.tags !== undefined) {
      updateData.tags = data.tags;
    }

    const updated = await prisma.kol.update({
      where: { userId },
      data: updateData,
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    // Invalidate cache
    await cacheService.delete(`kol:user:${userId}`);
    await cacheService.delete(`kol:${updated.id}`);

    logger.info('KOL profile updated', { kolId: updated.id });

    return this.formatKolResponse(updated);
  }

  /**
   * Get KOLs by IDs (for AI matching)
   */
  async getKolsByIds(kolIds: string[]): Promise<KolResponse[]> {
    const kols = await prisma.kol.findMany({
      where: {
        id: { in: kolIds },
        status: 'active',
      },
    });

    return kols.map((k) => this.formatKolResponse(k));
  }

  /**
   * Bind social account to KOL
   */
  async bindAccount(kolId: string, data: BindKolAccountRequest): Promise<KolAccountResponse> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    // Check if account already exists for this platform
    const existing = await prisma.kolAccount.findFirst({
      where: {
        kolId,
        platform: data.platform,
      },
    });

    if (existing) {
      throw new ApiError('该平台的账号已绑定', 409, 'ACCOUNT_EXISTS');
    }

    const account = await prisma.kolAccount.create({
      data: {
        kolId,
        platform: data.platform,
        platformUsername: data.platform_username,
        platformId: data.platform_id,
        platformDisplayName: data.platform_display_name,
        platformAvatarUrl: data.platform_avatar_url,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        isPrimary: false,
        isVerified: false,
      },
    });

    logger.info('KOL account bound', { kolId, accountId: account.id, platform: data.platform });

    return this.formatAccountResponse(account);
  }

  /**
   * Get all accounts for a KOL
   */
  async getAccounts(kolId: string): Promise<KolAccountResponse[]> {
    const accounts = await prisma.kolAccount.findMany({
      where: { kolId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((a) => this.formatAccountResponse(a));
  }

  /**
   * Unbind account
   */
  async unbindAccount(kolId: string, accountId: string): Promise<void> {
    const account = await prisma.kolAccount.findFirst({
      where: {
        id: accountId,
        kolId,
      },
    });

    if (!account) {
      throw errors.notFound('账号不存在或无权操作');
    }

    await prisma.kolAccount.delete({
      where: { id: accountId },
    });

    logger.info('KOL account unbound', { kolId, accountId });
  }

  /**
   * Sync KOL data from platform
   */
  async syncData(
    kolId: string,
    accountIds?: string[]
  ): Promise<{
    synced: number;
    failed: number;
  }> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    // Get accounts to sync
    const where: Prisma.KolAccountWhereInput = { kolId };
    if (accountIds && accountIds.length > 0) {
      where.id = { in: accountIds };
    }

    const accounts = await prisma.kolAccount.findMany({
      where,
    });

    let synced = 0;
    let failed = 0;

    for (const account of accounts) {
      try {
        // Simulate API call to platform
        // In production, this would call the actual platform API
        const platformData = await this.fetchPlatformData(account);

        if (platformData) {
          await prisma.kolAccount.update({
            where: { id: account.id },
            data: {
              followers: platformData.followers,
              following: platformData.following,
              totalVideos: platformData.totalVideos,
              totalLikes: platformData.totalLikes,
              avgViews: platformData.avgViews,
              avgLikes: platformData.avgLikes,
              avgComments: platformData.avgComments,
              avgShares: platformData.avgShares,
              engagementRate: platformData.engagementRate,
              lastSyncedAt: new Date(),
            },
          });

          // Update KOL stats history
          await prisma.kolStatsHistory.create({
            data: {
              kolId,
              followers: platformData.followers,
              following: platformData.following,
              totalVideos: platformData.totalVideos,
              totalLikes: platformData.totalLikes,
              avgViews: platformData.avgViews,
              avgLikes: platformData.avgLikes,
              avgComments: platformData.avgComments,
              avgShares: platformData.avgShares,
              engagementRate: platformData.engagementRate,
              snapshotDate: new Date(),
            },
          });

          synced++;
        }
      } catch (error) {
        logger.error('Failed to sync account', { accountId: account.id, error });
        failed++;
      }
    }

    // Update KOL lastSyncedAt
    await prisma.kol.update({
      where: { id: kolId },
      data: {
        lastSyncedAt: new Date(),
      },
    });

    // Invalidate cache
    await cacheService.delete(`kol:${kolId}`);
    await cacheService.delete(`kol:user:${kol.userId}`);

    logger.info('KOL data synced', { kolId, synced, failed });

    return { synced, failed };
  }

  /**
   * Fetch platform data (mock implementation)
   */
  private async fetchPlatformData(account: KolAccount): Promise<{
    followers: number;
    following?: number;
    totalVideos?: number;
    totalLikes?: number;
    avgViews?: number;
    avgLikes?: number;
    avgComments?: number;
    avgShares?: number;
    engagementRate: number;
  } | null> {
    // In production, this would call the actual platform API
    // For now, return mock data with slight variations
    const baseFollowers = account.followers || 10000;
    const variation = Math.random() * 0.1 - 0.05; // +/- 5%

    const followers = Math.round(baseFollowers * (1 + variation));
    const avgViews = Math.round(followers * 0.1 * (1 + variation));
    const avgLikes = Math.round(avgViews * 0.05 * (1 + variation));
    const avgComments = Math.round(avgViews * 0.01 * (1 + variation));
    const avgShares = Math.round(avgViews * 0.005 * (1 + variation));
    const engagementRate = ((avgLikes + avgComments + avgShares) / avgViews) * 100;

    return {
      followers,
      following: account.following || Math.round(followers * 0.01),
      totalVideos: account.totalVideos || Math.round(followers * 0.001),
      totalLikes: account.totalLikes || Math.round(followers * 0.1),
      avgViews,
      avgLikes,
      avgComments,
      avgShares,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
    };
  }

  /**
   * Format KOL response
   */
  private formatKolResponse(kol: Kol): KolResponse {
    return {
      id: kol.id,
      user_id: kol.userId,
      platform: kol.platform,
      platform_id: kol.platformId,
      platform_username: kol.platformUsername,
      platform_display_name: kol.platformDisplayName ?? undefined,
      platform_avatar_url: kol.platformAvatarUrl ?? undefined,
      bio: kol.bio ?? undefined,
      category: kol.category ?? undefined,
      subcategory: kol.subcategory ?? undefined,
      country: kol.country ?? undefined,
      region: kol.region ?? undefined,
      city: kol.city ?? undefined,
      followers: kol.followers,
      following: kol.following,
      total_videos: kol.totalVideos,
      total_likes: kol.totalLikes,
      avg_views: kol.avgViews,
      avg_likes: kol.avgLikes,
      avg_comments: kol.avgComments,
      avg_shares: kol.avgShares,
      engagement_rate: kol.engagementRate.toNumber(),
      status: kol.status,
      verified: kol.verified,
      verified_at: kol.verifiedAt?.toISOString(),
      base_price: kol.basePrice?.toNumber(),
      price_per_video: kol.pricePerVideo?.toNumber(),
      currency: kol.currency,
      total_earnings: kol.totalEarnings.toNumber(),
      available_balance: kol.availableBalance.toNumber(),
      pending_balance: kol.pendingBalance.toNumber(),
      total_orders: kol.totalOrders,
      completed_orders: kol.completedOrders,
      avg_rating: kol.avgRating.toNumber(),
      tags: kol.tags || [],
      created_at: kol.createdAt.toISOString(),
      updated_at: kol.updatedAt.toISOString(),
      last_synced_at: kol.lastSyncedAt?.toISOString(),
    };
  }

  /**
   * 仪表盘统计：订单聚合 + 本月入账（流水）+ 曝光互动汇总
   */
  async getKolStats(kolId: string): Promise<{
    total_earnings: number;
    monthly_earnings: number;
    pending_earnings: number;
    available_balance: number;
    total_tasks: number;
    ongoing_tasks: number;
    completed_tasks: number;
    success_rate: number;
    total_views: number;
    total_likes: number;
  }> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
      select: {
        totalEarnings: true,
        availableBalance: true,
        pendingBalance: true,
      },
    });
    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyIncome = await prisma.transaction.aggregate({
      where: {
        kolId,
        status: 'completed',
        type: { in: ['order_income', 'bonus'] },
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    const ongoingStatuses: OrderStatus[] = [
      'pending',
      'accepted',
      'in_progress',
      'submitted',
      'approved',
      'revision',
      'published',
      'disputed',
    ];

    const [totalTasks, completedTasks, ongoingTasks, rejectedCount, cancelledCount, viewsSum] = await Promise.all([
      prisma.order.count({ where: { kolId } }),
      prisma.order.count({ where: { kolId, status: 'completed' } }),
      prisma.order.count({
        where: { kolId, status: { in: ongoingStatuses } },
      }),
      prisma.order.count({ where: { kolId, status: 'rejected' } }),
      prisma.order.count({ where: { kolId, status: 'cancelled' } }),
      prisma.order.aggregate({
        where: { kolId },
        _sum: { views: true, likes: true },
      }),
    ]);

    const terminal = completedTasks + rejectedCount + cancelledCount;
    const successRate = terminal > 0 ? Math.round((completedTasks / terminal) * 1000) / 10 : 0;

    return {
      total_earnings: kol.totalEarnings.toNumber(),
      monthly_earnings: monthlyIncome._sum.amount?.toNumber() ?? 0,
      pending_earnings: kol.pendingBalance.toNumber(),
      available_balance: kol.availableBalance.toNumber(),
      total_tasks: totalTasks,
      ongoing_tasks: ongoingTasks,
      completed_tasks: completedTasks,
      success_rate: successRate,
      total_views: viewsSum._sum.views ?? 0,
      total_likes: viewsSum._sum.likes ?? 0,
    };
  }

  /**
   * Format account response
   */
  private formatAccountResponse(account: KolAccount): KolAccountResponse {
    return {
      id: account.id,
      kol_id: account.kolId,
      platform: account.platform,
      platform_username: account.platformUsername,
      platform_display_name: account.platformDisplayName ?? undefined,
      platform_avatar_url: account.platformAvatarUrl ?? undefined,
      followers: account.followers ?? 0,
      following: account.following ?? undefined,
      total_videos: account.totalVideos ?? undefined,
      total_likes: account.totalLikes ?? undefined,
      avg_views: account.avgViews ?? undefined,
      avg_likes: account.avgLikes ?? undefined,
      avg_comments: account.avgComments ?? undefined,
      avg_shares: account.avgShares ?? undefined,
      engagement_rate: account.engagementRate?.toNumber(),
      is_primary: account.isPrimary,
      is_verified: account.isVerified,
      last_synced_at: account.lastSyncedAt?.toISOString(),
      created_at: account.createdAt.toISOString(),
      updated_at: account.updatedAt.toISOString(),
    };
  }
}

export const kolService = new KolService();
