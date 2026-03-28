import { KolPlatform, KolStatus, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { decimalToNumber } from '../../utils/decimal';
import { cacheService } from '../../config/redis';
import { logAdminAction } from './audit.service';
import { kolFrequencyService } from '../kol-frequency.service';
import { getBudgetRiskThreshold } from '../../utils/budgetRiskThreshold';

/** KOL 排行指标字段（与 getKolRankings 的 metric 分支一致） */
type KolRankingMetricField = 'totalEarnings' | 'totalOrders' | 'followers' | 'engagementRate';

function kolRankingMetricValue(
  kol: {
    totalEarnings: Prisma.Decimal;
    totalOrders: number;
    followers: number;
    engagementRate: Prisma.Decimal;
  },
  field: KolRankingMetricField
): number {
  switch (field) {
    case 'totalEarnings':
      return decimalToNumber(kol.totalEarnings);
    case 'totalOrders':
      return kol.totalOrders;
    case 'followers':
      return kol.followers;
    case 'engagementRate':
      return decimalToNumber(kol.engagementRate);
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

// Dashboard stats response
export interface DashboardStatsResponse {
  period: {
    start: string;
    end: string;
  };
  users: {
    total: number;
    newToday: number;
    activeToday: number;
    advertisers: number;
    kols: number;
  };
  campaigns: {
    total: number;
    active: number;
    completedToday: number;
    totalBudget: number;
    spentAmount: number;
    /** 待平台审核的活动（pending_review） */
    pendingReview: number;
    /** 预算占用率 ≥ budgetRiskThreshold 的活动数（与 GET /campaigns/budget-risks 一致） */
    budgetRiskCount: number;
    /** 预算风险判定阈值（与 AIADS_BUDGET_RISK_THRESHOLD / budget-risks 默认一致） */
    budgetRiskThreshold: number;
  };
  kol: {
    /** 待入驻/资质审核的 KOL（status=pending） */
    pendingVerification: number;
  };
  orders: {
    total: number;
    pending: number;
    inProgress: number;
    completedToday: number;
    /** 当前 orders.status = disputed */
    disputed: number;
    /** 未结案纠纷工单（order_disputes.status ≠ resolved） */
    pendingDisputes: number;
  };
  finance: {
    totalRevenue: number;
    todayRevenue: number;
    totalPayout: number;
    todayPayout: number;
    /** 待处理提现金额合计 */
    pendingWithdrawals: number;
    /** 待处理提现笔数 */
    pendingWithdrawalCount: number;
  };
  content: {
    pendingReview: number;
    approvedToday: number;
    rejectedToday: number;
  };
}

// Analytics response
export interface AnalyticsResponse {
  userGrowth?: {
    labels: string[];
    series: {
      newUsers: number[];
      activeUsers: number[];
      advertisers: number[];
      kols: number[];
    };
  };
  revenueTrend?: {
    labels: string[];
    series: {
      revenue: number[];
      payout: number[];
    };
  };
  platformDistribution?: Record<string, number>;
  categoryDistribution?: Record<string, number>;
}

// KOL ranking response
export interface KolRankingResponse {
  metric: string;
  period: string;
  rankings: Array<{
    rank: number;
    kol: {
      id: string;
      name: string;
      platform: string;
      avatarUrl?: string;
    };
    value: number;
    change: string;
  }>;
}

export class AdminDashboardService {
  /**
   * Get platform statistics
   */
  async getStats(period: string = 'today', adminId: string): Promise<DashboardStatsResponse> {
    // Try to get from cache first
    const cacheKey = `dashboard:stats:v4:${period}`;
    const cached = await cacheService.get<DashboardStatsResponse>(cacheKey);

    if (cached) {
      logger.debug('Dashboard stats from cache', { period });

      // Log admin action
      await logAdminAction({
        adminId,
        action: 'view',
        resourceType: 'dashboard',
        requestMethod: 'GET',
        requestPath: '/api/v1/admin/dashboard/stats',
        status: 'success',
      });

      return cached;
    }

    // Calculate date range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    let startDate = startOfDay;
    const endDate = endOfDay;

    if (period === 'week') {
      startDate = new Date(startOfDay);
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(startOfDay);
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === 'quarter') {
      startDate = new Date(startOfDay);
      startDate.setDate(startDate.getDate() - 90);
    } else if (period === 'year') {
      startDate = new Date(startOfDay);
      startDate.setDate(startDate.getDate() - 365);
    }

    // Get all stats in parallel
    const [
      totalUsers,
      newUsersToday,
      activeUsersToday,
      totalAdvertisers,
      totalKols,
      totalCampaigns,
      activeCampaigns,
      completedCampaignsToday,
      campaignBudget,
      campaignSpent,
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrdersToday,
      totalRevenue,
      todayRevenue,
      totalPayout,
      todayPayout,
      pendingWithdrawalsAmount,
      pendingContentReview,
      approvedContentToday,
      rejectedContentToday,
      pendingCampaignReview,
      pendingKolVerification,
      pendingWithdrawalCount,
      disputedOrdersCount,
      pendingDisputeTickets,
      campaignRowsForBudgetRisk,
    ] = await Promise.all([
      // Users
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      prisma.user.count({ where: { role: 'advertiser' } }),
      prisma.kol.count(),

      // Campaigns
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 'active' } }),
      prisma.campaign.count({
        where: {
          status: 'completed',
          updatedAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      prisma.campaign.aggregate({
        _sum: { budget: true },
      }),
      prisma.campaign.aggregate({
        _sum: { spentAmount: true },
      }),

      // Orders
      prisma.order.count(),
      prisma.order.count({ where: { status: 'pending' } }),
      prisma.order.count({ where: { status: 'in_progress' } }),
      prisma.order.count({
        where: {
          status: 'completed',
          updatedAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),

      // Finance
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'recharge' },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'recharge',
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'withdrawal', status: 'completed' },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'withdrawal',
          status: 'completed',
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      prisma.withdrawal.aggregate({
        _sum: { amount: true },
        where: { status: 'pending' },
      }),

      // Content
      prisma.contentModeration.count({ where: { status: 'pending' } }),
      prisma.contentModeration.count({
        where: {
          status: 'approved',
          reviewedAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      prisma.contentModeration.count({
        where: {
          status: 'rejected',
          reviewedAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      prisma.campaign.count({ where: { status: 'pending_review' } }),
      prisma.kol.count({ where: { status: 'pending' } }),
      prisma.withdrawal.count({ where: { status: 'pending' } }),
      prisma.order.count({ where: { status: 'disputed' } }),
      prisma.orderDispute.count({
        where: { NOT: { status: 'resolved' } },
      }),
      prisma.campaign.findMany({
        where: { status: { in: ['active', 'paused'] }, budget: { gt: 0 } },
        select: { budget: true, spentAmount: true },
      }),
    ]);

    const budgetRiskThreshold = getBudgetRiskThreshold();
    const budgetRiskCount = campaignRowsForBudgetRisk.filter((c) => {
      const budget = decimalToNumber(c.budget);
      const spent = decimalToNumber(c.spentAmount);
      return budget > 0 && spent / budget >= budgetRiskThreshold;
    }).length;

    const stats: DashboardStatsResponse = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        activeToday: activeUsersToday,
        advertisers: totalAdvertisers,
        kols: totalKols,
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        completedToday: completedCampaignsToday,
        totalBudget: Number(campaignBudget._sum.budget) || 0,
        spentAmount: Number(campaignSpent._sum.spentAmount) || 0,
        pendingReview: pendingCampaignReview,
        budgetRiskCount,
        budgetRiskThreshold,
      },
      kol: {
        pendingVerification: pendingKolVerification,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        inProgress: inProgressOrders,
        completedToday: completedOrdersToday,
        disputed: disputedOrdersCount,
        pendingDisputes: pendingDisputeTickets,
      },
      finance: {
        totalRevenue: Number(totalRevenue._sum.amount) || 0,
        todayRevenue: Number(todayRevenue._sum.amount) || 0,
        totalPayout: Number(totalPayout._sum.amount) || 0,
        todayPayout: Number(todayPayout._sum.amount) || 0,
        pendingWithdrawals: Number(pendingWithdrawalsAmount._sum.amount) || 0,
        pendingWithdrawalCount,
      },
      content: {
        pendingReview: pendingContentReview,
        approvedToday: approvedContentToday,
        rejectedToday: rejectedContentToday,
      },
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, stats, 300);

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'dashboard',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/dashboard/stats',
      status: 'success',
    });

    return stats;
  }

  /**
   * Get analytics data for charts
   */
  async getAnalytics(metric: string, period: string = 'month', adminId: string): Promise<AnalyticsResponse> {
    const cacheKey = `dashboard:analytics:${metric}:${period}`;
    const cached = await cacheService.get<AnalyticsResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    const analytics: AnalyticsResponse = {};

    // Calculate date range
    const now = new Date();
    const days = period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 365;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    if (metric === 'user_growth' || metric === 'all') {
      // Get user growth data
      const userGrowthData = await this.getUserGrowthData(startDate, now);
      analytics.userGrowth = userGrowthData;
    }

    if (metric === 'revenue_trends' || metric === 'all') {
      // Get revenue trend data
      const revenueData = await this.getRevenueTrendData(startDate, now);
      analytics.revenueTrend = revenueData;
    }

    if (metric === 'platform_distribution' || metric === 'all') {
      // Get platform distribution
      analytics.platformDistribution = await this.getPlatformDistribution();
    }

    if (metric === 'category_distribution' || metric === 'all') {
      // Get category distribution
      analytics.categoryDistribution = await this.getCategoryDistribution();
    }

    // Cache for 10 minutes
    await cacheService.set(cacheKey, analytics, 600);

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'dashboard',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/dashboard/analytics',
      status: 'success',
    });

    return analytics;
  }

  /**
   * Get KOL rankings
   */
  async getKolRankings(
    metric: string = 'earnings',
    limit: number = 10,
    platform?: string,
    adminId?: string
  ): Promise<KolRankingResponse> {
    // Build order by clause based on metric
    let orderBy: Prisma.KolOrderByWithRelationInput;
    let selectField: KolRankingMetricField;

    switch (metric) {
      case 'earnings':
        orderBy = { totalEarnings: 'desc' };
        selectField = 'totalEarnings';
        break;
      case 'orders':
        orderBy = { totalOrders: 'desc' };
        selectField = 'totalOrders';
        break;
      case 'followers':
        orderBy = { followers: 'desc' };
        selectField = 'followers';
        break;
      case 'engagement':
        orderBy = { engagementRate: 'desc' };
        selectField = 'engagementRate';
        break;
      default:
        orderBy = { totalEarnings: 'desc' };
        selectField = 'totalEarnings';
    }

    const where: Prisma.KolWhereInput = {
      status: KolStatus.active,
    };

    if (platform) {
      where.platform = platform as KolPlatform;
    }

    const kols = await prisma.kol.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    });

    const rankings = kols.map((kol, index) => ({
      rank: index + 1,
      kol: {
        id: kol.id,
        name: kol.user?.nickname || kol.platformDisplayName || kol.platformUsername,
        platform: kol.platform,
        avatarUrl: kol.platformAvatarUrl ?? undefined,
      },
      value: kolRankingMetricValue(kol, selectField),
      change: '+0%', // Would need historical data to calculate
    }));

    // Log admin action
    if (adminId) {
      await logAdminAction({
        adminId,
        action: 'view',
        resourceType: 'dashboard',
        requestMethod: 'GET',
        requestPath: '/api/v1/admin/dashboard/kol-rankings',
        status: 'success',
      });
    }

    return {
      metric,
      period: 'month',
      rankings,
    };
  }

  /**
   * Get user growth data
   */
  private async getUserGrowthData(
    startDate: Date,
    endDate: Date
  ): Promise<{
    labels: string[];
    series: {
      newUsers: number[];
      activeUsers: number[];
      advertisers: number[];
      kols: number[];
    };
  }> {
    // This is a simplified implementation
    // In production, you would use a more efficient query with date grouping
    const labels: string[] = [];
    const newUsers: number[] = [];
    const activeUsers: number[] = [];
    const advertisers: number[] = [];
    const kols: number[] = [];

    const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      labels.push(date.toISOString().split('T')[0]);

      const [newUsersCount, activeCount, advertiserCount, kolCount] = await Promise.all([
        prisma.user.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
        prisma.user.count({
          where: {
            lastLoginAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
        prisma.user.count({
          where: {
            role: 'advertiser',
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
        prisma.kol.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
      ]);

      newUsers.push(newUsersCount);
      activeUsers.push(activeCount);
      advertisers.push(advertiserCount);
      kols.push(kolCount);
    }

    return {
      labels,
      series: {
        newUsers,
        activeUsers,
        advertisers,
        kols,
      },
    };
  }

  /**
   * Get revenue trend data
   */
  private async getRevenueTrendData(
    startDate: Date,
    endDate: Date
  ): Promise<{
    labels: string[];
    series: {
      revenue: number[];
      payout: number[];
    };
  }> {
    const labels: string[] = [];
    const revenue: number[] = [];
    const payout: number[] = [];

    const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      labels.push(date.toISOString().split('T')[0]);

      const [revenueData, payoutData] = await Promise.all([
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            type: 'recharge',
            status: 'completed',
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            type: 'withdrawal',
            status: 'completed',
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
      ]);

      revenue.push(Number(revenueData._sum.amount) || 0);
      payout.push(Number(payoutData._sum.amount) || 0);
    }

    return {
      labels,
      series: {
        revenue,
        payout,
      },
    };
  }

  /**
   * Get platform distribution
   */
  private async getPlatformDistribution(): Promise<Record<string, number>> {
    const kols = await prisma.kol.groupBy({
      by: ['platform'],
      _count: true,
    });

    const total = kols.reduce((sum, k) => sum + k._count, 0);
    const distribution: Record<string, number> = {};

    kols.forEach((k) => {
      distribution[k.platform] = total > 0 ? Math.round((k._count / total) * 100) : 0;
    });

    return distribution;
  }

  /**
   * Get category distribution
   */
  private async getCategoryDistribution(): Promise<Record<string, number>> {
    const kols = await prisma.kol.groupBy({
      by: ['category'],
      _count: true,
    });

    const total = kols.reduce((sum, k) => sum + k._count, 0);
    const distribution: Record<string, number> = {};

    kols.forEach((k) => {
      if (k.category) {
        distribution[k.category] = total > 0 ? Math.round((k._count / total) * 100) : 0;
      }
    });

    return distribution;
  }

  /**
   * 运维只读：KOL 接单滚动窗口策略（环境变量，与接单 API 一致）
   */
  getKolFrequencyPolicy(): {
    enabled: boolean;
    rolling_days: number;
    max_accepts: number;
    env_keys: string[];
  } {
    const c = kolFrequencyService.getKolAcceptFrequencyConfig();
    return {
      enabled: c.enabled,
      rolling_days: c.rollingDays,
      max_accepts: c.maxAccepts,
      env_keys: ['KOL_ACCEPT_FREQ_ENABLED', 'KOL_ACCEPT_ROLLING_DAYS', 'KOL_MAX_ACCEPTS_ROLLING_WINDOW'],
    };
  }
}

export const adminDashboardService = new AdminDashboardService();
