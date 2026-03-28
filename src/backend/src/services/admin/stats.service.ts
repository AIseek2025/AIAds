import { OrderStatus, TransactionStatus, TransactionType } from '@prisma/client';
import prisma from '../../config/database';
import { logAdminAction } from './audit.service';
import { decimalToNumber } from '../../utils/decimal';

// Stats query parameters
export interface StatsQuery {
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
}

// Export stats parameters
export interface ExportStatsQuery extends StatsQuery {
  type: 'users' | 'campaigns' | 'revenue' | 'kols' | 'all';
  format?: 'csv' | 'xlsx' | 'pdf';
}

// Overview stats response
export interface OverviewStats {
  totalUsers: number;
  totalAdvertisers: number;
  totalKols: number;
  totalCampaigns: number;
  totalOrders: number;
  totalRevenue: number;
  monthlyGmv: number;
  monthlyRevenue: number;
  pendingKolReviews: number;
  pendingContentReviews: number;
  pendingWithdrawals: number;
  userGrowthRate: number;
  revenueGrowthRate: number;
}

// User stats response
export interface UserStats {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  userGrowthTrend: Array<{ date: string; count: number }>;
  usersByRole: { role: string; count: number }[];
  usersByStatus: { status: string; count: number }[];
}

// Campaign stats response
export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalBudget: number;
  totalSpent: number;
  campaignTrend: Array<{ date: string; count: number }>;
  campaignsByStatus: { status: string; count: number }[];
}

// Revenue stats response
export interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  dailyRevenue: number;
  revenueTrend: Array<{ date: string; amount: number }>;
  revenueByType: { type: string; amount: number }[];
  averageOrderValue: number;
}

// KOL stats response
export interface KolStats {
  totalKols: number;
  verifiedKols: number;
  activeKols: number;
  kolGrowthTrend: Array<{ date: string; count: number }>;
  kolsByPlatform: { platform: string; count: number }[];
  kolsByRating: { rating: string; count: number }[];
  averageFollowers: number;
  averageEngagementRate: number;
}

// Order stats response
export interface OrderStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  orderTrend: Array<{ date: string; count: number }>;
  ordersByStatus: { status: string; count: number }[];
  totalOrderValue: number;
  averageOrderValue: number;
}

/** 与 `StatsQuery.period` 一致，供日期区间与趋势接口复用 */
export type StatsPeriod = NonNullable<StatsQuery['period']>;

// Content stats response
export interface ContentStats {
  totalContent: number;
  pendingContent: number;
  approvedContent: number;
  rejectedContent: number;
  contentTrend: Array<{ date: string; count: number }>;
  contentByType: { type: string; count: number }[];
  averageReviewTime: number;
}

export class AdminStatsService {
  /**
   * Get overview statistics
   */
  async getOverview(query: StatsQuery, adminId: string): Promise<OverviewStats> {
    const { period = 'month' } = query;

    // Calculate date range
    const { startDate, endDate } = this.getDateRange(period, query.startDate, query.endDate);

    // Get counts
    const [
      totalUsers,
      totalAdvertisers,
      totalKols,
      totalCampaigns,
      totalOrders,
      pendingKolReviews,
      pendingContentReviews,
      pendingWithdrawals,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.advertiser.count(),
      prisma.kol.count({ where: { user: { deletedAt: null } } }),
      prisma.campaign.count(),
      prisma.order.count(),
      prisma.kol.count({ where: { status: 'pending' } }),
      prisma.contentModeration.count({ where: { status: 'pending' } }),
      prisma.withdrawal.count({ where: { status: 'pending' } }),
    ]);

    // Get revenue
    const revenueResult = await prisma.transaction.aggregate({
      where: {
        type: TransactionType.commission,
        status: TransactionStatus.completed,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    // Get GMV
    const gmvResult = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { price: true },
    });

    // Calculate growth rates (simplified)
    const previousPeriod = this.getPreviousPeriod(period, startDate);
    const previousUsers = await prisma.user.count({
      where: {
        createdAt: { gte: previousPeriod, lt: startDate },
        deletedAt: null,
      },
    });

    const userGrowthRate = previousUsers > 0 ? ((totalUsers - previousUsers) / previousUsers) * 100 : 0;

    const revenueGrowthRate = 0; // Simplified

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'stats_overview',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/stats/overview',
      status: 'success',
    });

    return {
      totalUsers,
      totalAdvertisers,
      totalKols,
      totalCampaigns,
      totalOrders,
      totalRevenue: decimalToNumber(revenueResult._sum?.amount),
      monthlyGmv: decimalToNumber(gmvResult._sum?.price),
      monthlyRevenue: decimalToNumber(revenueResult._sum?.amount),
      pendingKolReviews,
      pendingContentReviews,
      pendingWithdrawals,
      userGrowthRate,
      revenueGrowthRate,
    };
  }

  /**
   * Get user statistics
   */
  async getUserStats(query: StatsQuery, adminId: string): Promise<UserStats> {
    const { period = 'month' } = query;
    const { startDate, endDate } = this.getDateRange(period, query.startDate, query.endDate);

    // Get total users
    const totalUsers = await prisma.user.count({ where: { deletedAt: null } });

    // Get new users in period
    const newUsers = await prisma.user.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
    });

    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await prisma.user.count({
      where: {
        lastLoginAt: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
    });

    // Get user growth trend
    const userGrowthTrend = await this.getTimeSeriesData('user', startDate, endDate);

    // Get users by role
    const usersByRoleRaw = await prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    const usersByRole = usersByRoleRaw.map((r) => ({
      role: r.role,
      count: r._count.id,
    }));

    // Get users by status
    const usersByStatusRaw = await prisma.user.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    const usersByStatus = usersByStatusRaw.map((r) => ({
      status: r.status,
      count: r._count.id,
    }));

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'stats_users',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/stats/users',
      status: 'success',
    });

    return {
      totalUsers,
      newUsers,
      activeUsers,
      userGrowthTrend,
      usersByRole,
      usersByStatus,
    };
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(query: StatsQuery, adminId: string): Promise<CampaignStats> {
    const { period = 'month' } = query;
    const { startDate, endDate } = this.getDateRange(period, query.startDate, query.endDate);

    // Get counts
    const totalCampaigns = await prisma.campaign.count();
    const activeCampaigns = await prisma.campaign.count({ where: { status: 'active' } });
    const completedCampaigns = await prisma.campaign.count({ where: { status: 'completed' } });

    // Get budget and spent
    const budgetResult = await prisma.campaign.aggregate({
      _sum: { budget: true, spentAmount: true },
    });

    // Get campaign trend
    const campaignTrend = await this.getTimeSeriesData('campaign', startDate, endDate);

    // Get campaigns by status
    const campaignsByStatusRaw = await prisma.campaign.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const campaignsByStatus = campaignsByStatusRaw.map((r) => ({
      status: r.status,
      count: r._count.id,
    }));

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'stats_campaigns',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/stats/campaigns',
      status: 'success',
    });

    return {
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalBudget: decimalToNumber(budgetResult._sum?.budget),
      totalSpent: decimalToNumber(budgetResult._sum?.spentAmount),
      campaignTrend,
      campaignsByStatus,
    };
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(query: StatsQuery, adminId: string): Promise<RevenueStats> {
    const { period = 'month' } = query;
    const { startDate, endDate } = this.getDateRange(period, query.startDate, query.endDate);

    // Get total revenue
    const totalRevenueResult = await prisma.transaction.aggregate({
      where: {
        type: TransactionType.commission,
        status: TransactionStatus.completed,
      },
      _sum: { amount: true },
    });

    // Get monthly revenue
    const monthlyRevenueResult = await prisma.transaction.aggregate({
      where: {
        type: TransactionType.commission,
        status: TransactionStatus.completed,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    // Get revenue trend
    const revenueTrend = await this.getRevenueTimeSeries(startDate, endDate);

    // Get revenue by type
    const revenueByTypeRaw = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        status: TransactionStatus.completed,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const revenueByType = revenueByTypeRaw.map((r) => ({
      type: r.type,
      amount: decimalToNumber(r._sum?.amount),
    }));

    // Get order stats
    const orderResult = await prisma.order.aggregate({
      where: { status: OrderStatus.completed },
      _sum: { price: true },
      _count: true,
    });

    const completedCount = orderResult._count ?? 0;
    const averageOrderValue = completedCount > 0 ? decimalToNumber(orderResult._sum?.price) / completedCount : 0;

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'stats_revenue',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/stats/revenue',
      status: 'success',
    });

    return {
      totalRevenue: decimalToNumber(totalRevenueResult._sum?.amount),
      monthlyRevenue: decimalToNumber(monthlyRevenueResult._sum?.amount),
      dailyRevenue: decimalToNumber(monthlyRevenueResult._sum?.amount) / 30,
      revenueTrend,
      revenueByType,
      averageOrderValue,
    };
  }

  /**
   * Get KOL statistics
   */
  async getKolStats(query: StatsQuery, adminId: string): Promise<KolStats> {
    const { period = 'month' } = query;
    const { startDate, endDate } = this.getDateRange(period, query.startDate, query.endDate);

    // Get counts
    const kolNotDeleted = { user: { deletedAt: null } };
    const totalKols = await prisma.kol.count({ where: kolNotDeleted });
    const verifiedKols = await prisma.kol.count({
      where: { verified: true, ...kolNotDeleted },
    });
    const activeKols = await prisma.kol.count({
      where: { status: 'active', ...kolNotDeleted },
    });

    // Get KOL growth trend
    const kolGrowthTrend = await this.getTimeSeriesData('kol', startDate, endDate);

    // Get KOLs by platform
    const kolsByPlatformRaw = await prisma.kol.groupBy({
      by: ['platform'],
      where: kolNotDeleted,
      _count: { id: true },
    });

    const kolsByPlatform = kolsByPlatformRaw.map((r) => ({
      platform: r.platform,
      count: r._count.id,
    }));

    // Bucket by rounded avgRating (schema uses avgRating, not rating)
    const kolsByRatingRaw = await prisma.kol.groupBy({
      by: ['avgRating'],
      where: kolNotDeleted,
      _count: { id: true },
    });

    const kolsByRating = kolsByRatingRaw.map((r) => ({
      rating: String(decimalToNumber(r.avgRating)),
      count: r._count.id,
    }));

    // Get average followers and engagement rate
    const kolStatsResult = await prisma.kol.aggregate({
      where: kolNotDeleted,
      _avg: { followers: true, engagementRate: true },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'stats_kols',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/stats/kols',
      status: 'success',
    });

    return {
      totalKols,
      verifiedKols,
      activeKols,
      kolGrowthTrend,
      kolsByPlatform,
      kolsByRating,
      averageFollowers: Math.round(kolStatsResult._avg?.followers ?? 0),
      averageEngagementRate: decimalToNumber(kolStatsResult._avg?.engagementRate),
    };
  }

  /**
   * Get order statistics
   */
  async getOrderStats(query: StatsQuery, adminId: string): Promise<OrderStats> {
    const { period = 'month' } = query;
    const { startDate, endDate } = this.getDateRange(period, query.startDate, query.endDate);

    // Get counts
    const totalOrders = await prisma.order.count();
    const completedOrders = await prisma.order.count({ where: { status: OrderStatus.completed } });
    const pendingOrders = await prisma.order.count({
      where: {
        status: {
          in: [OrderStatus.pending, OrderStatus.accepted, OrderStatus.in_progress, OrderStatus.submitted],
        },
      },
    });

    // Get order trend
    const orderTrend = await this.getTimeSeriesData('order', startDate, endDate);

    // Get orders by status
    const ordersByStatusRaw = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const ordersByStatus = ordersByStatusRaw.map((r) => ({
      status: r.status,
      count: r._count.id,
    }));

    // Get order value
    const orderValueResult = await prisma.order.aggregate({
      where: { status: OrderStatus.completed },
      _sum: { price: true },
      _count: true,
    });

    const totalOrderValue = decimalToNumber(orderValueResult._sum?.price);
    const ovCount = orderValueResult._count ?? 0;
    const averageOrderValue = ovCount > 0 ? totalOrderValue / ovCount : 0;

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'stats_orders',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/stats/orders',
      status: 'success',
    });

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      orderTrend,
      ordersByStatus,
      totalOrderValue,
      averageOrderValue,
    };
  }

  /**
   * Get content statistics
   */
  async getContentStats(query: StatsQuery, adminId: string): Promise<ContentStats> {
    const { period = 'month' } = query;
    const { startDate, endDate } = this.getDateRange(period, query.startDate, query.endDate);

    // Get counts
    const totalContent = await prisma.contentModeration.count();
    const pendingContent = await prisma.contentModeration.count({ where: { status: 'pending' } });
    const approvedContent = await prisma.contentModeration.count({ where: { status: 'approved' } });
    const rejectedContent = await prisma.contentModeration.count({ where: { status: 'rejected' } });

    // Get content trend
    const contentTrend = await this.getTimeSeriesData('content', startDate, endDate);

    // Get content by type
    const contentByTypeRaw = await prisma.contentModeration.groupBy({
      by: ['contentType'],
      _count: { id: true },
    });

    const contentByType = contentByTypeRaw.map((r) => ({
      type: r.contentType,
      count: r._count.id,
    }));

    // Average review time (simplified)
    const averageReviewTime = 24; // hours

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'stats_content',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/stats/content',
      status: 'success',
    });

    return {
      totalContent,
      pendingContent,
      approvedContent,
      rejectedContent,
      contentTrend,
      contentByType,
      averageReviewTime,
    };
  }

  /**
   * Export statistics data
   */
  async exportStats(
    query: ExportStatsQuery,
    adminId: string
  ): Promise<{ csvData: string; format: NonNullable<ExportStatsQuery['format']>; type: ExportStatsQuery['type'] }> {
    const { type, format = 'csv' } = query;

    let data: (string | number)[][] = [];
    let headers: string[] = [];

    // Get data based on type
    switch (type) {
      case 'users': {
        const userStats = await this.getUserStats(query, adminId);
        headers = ['metric', 'value'];
        data = [
          ['totalUsers', userStats.totalUsers],
          ['newUsers', userStats.newUsers],
          ['activeUsers', userStats.activeUsers],
        ];
        break;
      }
      case 'campaigns': {
        const campaignStats = await this.getCampaignStats(query, adminId);
        headers = ['metric', 'value'];
        data = [
          ['totalCampaigns', campaignStats.totalCampaigns],
          ['activeCampaigns', campaignStats.activeCampaigns],
          ['totalBudget', campaignStats.totalBudget],
          ['totalSpent', campaignStats.totalSpent],
        ];
        break;
      }
      case 'revenue': {
        const revenueStats = await this.getRevenueStats(query, adminId);
        headers = ['metric', 'value'];
        data = [
          ['totalRevenue', revenueStats.totalRevenue],
          ['monthlyRevenue', revenueStats.monthlyRevenue],
          ['averageOrderValue', revenueStats.averageOrderValue],
        ];
        break;
      }
      case 'kols': {
        const kolStats = await this.getKolStats(query, adminId);
        headers = ['metric', 'value'];
        data = [
          ['totalKols', kolStats.totalKols],
          ['verifiedKols', kolStats.verifiedKols],
          ['averageFollowers', kolStats.averageFollowers],
          ['averageEngagementRate', kolStats.averageEngagementRate],
        ];
        break;
      }
      case 'all':
        headers = ['metric', 'value'];
        data = [];
        break;
    }

    // Generate CSV
    const csvData = [headers.join(','), ...data.map((row) => row.join(','))].join('\n');

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'export',
      resourceType: 'stats',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/stats/export',
      status: 'success',
    });

    return {
      csvData,
      format,
      type,
    };
  }

  /**
   * Get statistics trends
   */
  async getTrends(
    metric: string,
    period: string,
    _adminId: string
  ): Promise<{ metric: string; period: string; trend: Array<{ date: string; value: number }> }> {
    const { startDate, endDate } = this.getDateRange(period);

    let trendData: Array<{ date: string; value: number }> = [];

    switch (metric) {
      case 'users':
        trendData = (await this.getTimeSeriesData('user', startDate, endDate)).map((d) => ({
          date: d.date,
          value: d.count,
        }));
        break;
      case 'kols':
        trendData = (await this.getTimeSeriesData('kol', startDate, endDate)).map((d) => ({
          date: d.date,
          value: d.count,
        }));
        break;
      case 'campaigns':
        trendData = (await this.getTimeSeriesData('campaign', startDate, endDate)).map((d) => ({
          date: d.date,
          value: d.count,
        }));
        break;
      case 'revenue':
        trendData = (await this.getRevenueTimeSeries(startDate, endDate)).map((d) => ({
          date: d.date,
          value: d.amount,
        }));
        break;
      case 'orders':
        trendData = (await this.getTimeSeriesData('order', startDate, endDate)).map((d) => ({
          date: d.date,
          value: d.count,
        }));
        break;
    }

    return {
      metric,
      period,
      trend: trendData,
    };
  }

  /**
   * Get statistics comparison
   */
  async getComparison(
    metric: string,
    currentPeriod: string,
    previousPeriod: string,
    adminId: string
  ): Promise<{
    metric: string;
    current: { period: string; value: number };
    previous: { period: string; value: number };
    change: { absolute: number; percentage: number };
  }> {
    const current = await this.getTrends(metric, currentPeriod, adminId);
    const previous = await this.getTrends(metric, previousPeriod, adminId);

    const currentValue = current.trend.reduce((sum, item) => sum + item.value, 0);
    const previousValue = previous.trend.reduce((sum, item) => sum + item.value, 0);

    const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

    return {
      metric,
      current: {
        period: currentPeriod,
        value: currentValue,
      },
      previous: {
        period: previousPeriod,
        value: previousValue,
      },
      change: {
        absolute: currentValue - previousValue,
        percentage: change,
      },
    };
  }

  /**
   * Helper: Get date range from period
   */
  private getDateRange(
    period: StatsPeriod | string = 'month',
    startDate?: string,
    endDate?: string
  ): { startDate: Date; endDate: Date } {
    if (startDate && endDate) {
      return {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    }

    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'day':
        start.setDate(end.getDate() - 1);
        break;
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(end.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    return { startDate: start, endDate: end };
  }

  /**
   * Helper: Get previous period start date
   */
  private getPreviousPeriod(period: string, fromDate: Date): Date {
    const date = new Date(fromDate);

    switch (period) {
      case 'day':
        date.setDate(date.getDate() - 1);
        break;
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'quarter':
        date.setMonth(date.getMonth() - 3);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - 1);
        break;
    }

    return date;
  }

  /**
   * Helper: Get time series data
   */
  private async getTimeSeriesData(
    _model: 'user' | 'kol' | 'campaign' | 'order' | 'content',
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; count: number }>> {
    // Simplified implementation - in production, use raw SQL or Prisma raw queries
    const trend: Array<{ date: string; count: number }> = [];
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      trend.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 100), // Placeholder
      });
    }

    return trend;
  }

  /**
   * Helper: Get revenue time series
   */
  private async getRevenueTimeSeries(startDate: Date, endDate: Date): Promise<Array<{ date: string; amount: number }>> {
    const trend: Array<{ date: string; amount: number }> = [];
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      trend.push({
        date: date.toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 10000), // Placeholder
      });
    }

    return trend;
  }
}

export const adminStatsService = new AdminStatsService();
