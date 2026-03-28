import { CampaignStatus, OrderStatus, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { ApiError } from '../../middleware/errorHandler';
import { logAdminAction } from './audit.service';
import { PaginationResponse } from '../../types';
import { decimalToNumber } from '../../utils/decimal';
import { sumFrozenAmountForCampaign, sumFrozenAmountForCampaigns } from '../order-frozen.util';
import { notificationService } from '../notifications.service';
import { getBudgetRiskThreshold } from '../../utils/budgetRiskThreshold';

// Types and interfaces
export interface CampaignListFilters {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
  advertiserId?: string;
  industry?: string;
  startDateAfter?: string;
  startDateBefore?: string;
  minBudget?: number;
  maxBudget?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CampaignListItem {
  id: string;
  advertiser_id: string;
  advertiser_name: string;
  title: string;
  description: string | null;
  budget: number;
  spent_amount: number;
  status: string;
  objective: string | null;
  start_date: string;
  end_date: string;
  total_orders: number;
  completed_orders: number;
  total_impressions: number;
  total_clicks: number;
  performance_score: string | null;
  /** 本活动关联订单 frozen_amount 合计（列表批量聚合） */
  orders_frozen_total: number;
  created_at: string;
}

export interface CampaignDetail {
  id: string;
  advertiser_id: string;
  advertiser_name: string;
  title: string;
  description: string | null;
  objective: string | null;
  budget: number;
  budget_type: string;
  spent_amount: number;
  pricing_model: string | null;
  target_audience: Prisma.JsonValue;
  target_platforms: string[];
  min_followers: number;
  max_followers: number;
  min_engagement_rate: number;
  required_categories: string[];
  target_countries: string[];
  start_date: string;
  end_date: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  statistics: {
    total_kols: number;
    applied_kols: number;
    selected_kols: number;
    published_videos: number;
    total_impressions: number;
    total_clicks: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
    estimated_reach: number;
    actual_reach: number;
  };
  /** 本活动关联订单 frozen_amount 合计 */
  orders_frozen_total: number;
  created_at: string;
  updated_at: string;
}

export interface VerifyCampaignRequest {
  action: 'approve' | 'reject';
  note?: string;
  rejection_reason?: string;
}

export interface UpdateCampaignStatusRequest {
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  reason?: string;
}

export interface CampaignStats {
  campaign_id: string;
  overview: {
    total_impressions: number;
    total_clicks: number;
    ctr: number;
    total_engagements: number;
    engagement_rate: number;
    total_conversions: number;
    conversion_rate: number;
    total_cost: number;
    total_revenue: number;
    roi: number;
  };
  trends: {
    impressions: Array<{ date: string; value: number }>;
    clicks: Array<{ date: string; value: number }>;
  };
  kol_performance: Array<{
    kol_id: string;
    kol_name: string;
    impressions: number;
    clicks: number;
    engagements: number;
    conversions: number;
    performance_score: number;
  }>;
}

export interface AbnormalCampaign {
  id: string;
  campaign_id: string;
  kol_id: string | null;
  order_id: string | null;
  anomaly_type: string;
  description: string;
  severity: string;
  expected_value: number;
  actual_value: number;
  deviation_rate: number;
  detected_at: string;
  detection_method: string;
  status: string;
  handled_by: string | null;
  handled_at: string | null;
}

export interface AbnormalCampaignFilters {
  page: number;
  pageSize: number;
  severity?: string;
  status?: string;
  type?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface VerifyCampaignResponse {
  id: string;
  status: string;
  reviewed_at: string | undefined;
  reviewed_by: string;
}

export interface UpdateCampaignStatusResponse {
  id: string;
  status: string;
  updated_at: string;
}

/** Fields used by performance score helper (list rows include these) */
type CampaignPerformanceInput = {
  totalViews: number;
  totalLikes: number;
  budget: Prisma.Decimal;
  spentAmount: Prisma.Decimal;
};

export class AdminCampaignService {
  /**
   * Get campaign list with pagination and filters
   */
  async getCampaignList(filters: CampaignListFilters, adminId: string): Promise<PaginationResponse<CampaignListItem>> {
    const {
      page,
      pageSize,
      keyword,
      status,
      advertiserId,
      startDateAfter,
      startDateBefore,
      minBudget,
      maxBudget,
      sort,
      order,
    } = filters;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where: Prisma.CampaignWhereInput = {};

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as CampaignStatus;
    }

    if (advertiserId) {
      where.advertiserId = advertiserId;
    }

    if (minBudget !== undefined || maxBudget !== undefined) {
      const budget: Prisma.DecimalFilter = {};
      if (minBudget !== undefined) {
        budget.gte = new Prisma.Decimal(minBudget);
      }
      if (maxBudget !== undefined) {
        budget.lte = new Prisma.Decimal(maxBudget);
      }
      where.budget = budget;
    }

    if (startDateAfter || startDateBefore) {
      const startDate: Prisma.DateTimeNullableFilter = {};
      if (startDateAfter) {
        startDate.gte = new Date(startDateAfter);
      }
      if (startDateBefore) {
        startDate.lte = new Date(startDateBefore);
      }
      where.startDate = startDate;
    }

    // Prisma 字段名为 camelCase；查询参数多为 snake_case
    const sortKey =
      sort === 'created_at' || sort === undefined || sort === null
        ? 'createdAt'
        : sort === 'updated_at'
          ? 'updatedAt'
          : sort === 'start_date'
            ? 'startDate'
            : sort === 'budget'
              ? 'budget'
              : sort === 'title'
                ? 'title'
                : 'createdAt';

    // Get total count
    const total = await prisma.campaign.count({ where });

    // Get items
    const items = await prisma.campaign.findMany({
      where,
      skip,
      take,
      orderBy: { [sortKey]: order ?? 'desc' } as Record<string, 'asc' | 'desc'>,
      include: {
        advertiser: {
          select: {
            companyName: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    const frozenByCampaign = await sumFrozenAmountForCampaigns(items.map((c) => c.id));

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'list',
      resourceType: 'campaigns',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/campaigns',
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'campaign.list',
      filters,
      total,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        advertiser_id: item.advertiserId,
        advertiser_name: item.advertiser.companyName,
        title: item.title,
        description: item.description,
        budget: decimalToNumber(item.budget),
        spent_amount: decimalToNumber(item.spentAmount),
        status: item.status,
        objective: item.objective,
        start_date: (item.startDate ?? item.createdAt).toISOString(),
        end_date: (item.endDate ?? item.createdAt).toISOString(),
        total_orders: item.totalKols,
        completed_orders: item.publishedVideos,
        total_impressions: item.totalViews,
        total_clicks: item.totalLikes,
        performance_score: this.calculatePerformanceScore(item),
        orders_frozen_total: frozenByCampaign.get(item.id) ?? 0,
        created_at: item.createdAt.toISOString(),
      })),
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Get campaign details by ID
   */
  async getCampaignById(campaignId: string, adminId: string): Promise<CampaignDetail> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        advertiser: {
          select: {
            companyName: true,
          },
        },
        orders: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new ApiError('活动不存在', 404, 'NOT_FOUND');
    }

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'campaigns',
      resourceId: campaignId,
      resourceName: campaign.title,
      requestMethod: 'GET',
      requestPath: `/api/v1/admin/campaigns/${campaignId}`,
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'campaign.view',
      targetId: campaignId,
    });

    const orders_frozen_total = await sumFrozenAmountForCampaign(campaignId);

    return {
      id: campaign.id,
      advertiser_id: campaign.advertiserId,
      advertiser_name: campaign.advertiser.companyName,
      title: campaign.title,
      description: campaign.description,
      objective: campaign.objective,
      budget: decimalToNumber(campaign.budget),
      budget_type: 'fixed',
      spent_amount: decimalToNumber(campaign.spentAmount),
      pricing_model: campaign.budgetType,
      target_audience: campaign.targetAudience || {},
      target_platforms: [],
      min_followers: 0,
      max_followers: 0,
      min_engagement_rate: 0,
      required_categories: [],
      target_countries: [],
      start_date: (campaign.startDate ?? campaign.createdAt).toISOString(),
      end_date: (campaign.endDate ?? campaign.createdAt).toISOString(),
      status: campaign.status,
      reviewed_by: campaign.reviewedBy,
      reviewed_at: campaign.reviewedAt?.toISOString() || null,
      review_notes: campaign.reviewNotes,
      statistics: {
        total_kols: campaign.orders.length,
        applied_kols: campaign.orders.length,
        selected_kols: campaign.orders.filter((o) => o.status !== 'cancelled').length,
        published_videos: campaign.orders.filter((o) => o.status === 'completed').length,
        total_impressions: campaign.totalViews,
        total_clicks: campaign.totalLikes,
        total_likes: 0,
        total_comments: 0,
        total_shares: 0,
        estimated_reach: 0,
        actual_reach: 0,
      },
      orders_frozen_total,
      created_at: campaign.createdAt.toISOString(),
      updated_at: campaign.updatedAt.toISOString(),
    };
  }

  /**
   * Verify campaign (approve or reject)
   */
  async verifyCampaign(
    campaignId: string,
    request: VerifyCampaignRequest,
    adminId: string,
    adminEmail: string
  ): Promise<VerifyCampaignResponse> {
    const { action, note, rejection_reason } = request;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new ApiError('活动不存在', 404, 'NOT_FOUND');
    }

    const updateData: Prisma.CampaignUpdateInput = {
      reviewedAt: new Date(),
      reviewedBy: adminId,
    };

    if (action === 'approve') {
      updateData.status = 'active';
      updateData.reviewNotes = null;
    } else {
      updateData.status = 'rejected';
      updateData.reviewNotes = rejection_reason || '审核未通过';
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'verify',
      resourceType: 'campaigns',
      resourceId: campaignId,
      resourceName: campaign.title,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/campaigns/${campaignId}/verify`,
      requestBody: JSON.stringify(request),
      newValues: JSON.stringify(updateData),
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'campaign.verify',
      targetId: campaignId,
      changes: { action, note, rejection_reason },
    });

    const adv = await prisma.advertiser.findUnique({
      where: { id: campaign.advertiserId },
      select: { userId: true },
    });
    if (adv?.userId) {
      notificationService.notifyCampaignReviewForAdvertiser(
        adv.userId,
        campaignId,
        campaign.title,
        action === 'approve',
        action === 'approve' ? note : rejection_reason || note
      );
    }

    return {
      id: campaignId,
      status: updatedCampaign.status,
      reviewed_at: updatedCampaign.reviewedAt?.toISOString(),
      reviewed_by: adminId,
    };
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(
    campaignId: string,
    request: UpdateCampaignStatusRequest,
    adminId: string,
    adminEmail: string
  ): Promise<UpdateCampaignStatusResponse> {
    const { status, reason } = request;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new ApiError('活动不存在', 404, 'NOT_FOUND');
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: status as CampaignStatus,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'update_status',
      resourceType: 'campaigns',
      resourceId: campaignId,
      resourceName: campaign.title,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/campaigns/${campaignId}/status`,
      requestBody: JSON.stringify(request),
      oldValues: JSON.stringify({ status: campaign.status }),
      newValues: JSON.stringify({ status }),
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'campaign.update_status',
      targetId: campaignId,
      changes: { status, reason },
    });

    return {
      id: campaignId,
      status: updatedCampaign.status,
      updated_at: updatedCampaign.updatedAt.toISOString(),
    };
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string, adminId: string): Promise<CampaignStats> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        orders: {
          include: {
            kol: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new ApiError('活动不存在', 404, 'NOT_FOUND');
    }

    const totalImpressions = campaign.totalViews;
    const totalClicks = campaign.totalLikes;
    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    const totalEngagements = campaign.totalLikes + campaign.totalComments;
    const engagementRate = totalImpressions > 0 ? totalEngagements / totalImpressions : 0;

    const orderCount = campaign.orders.length;
    const completedOrders = campaign.orders.filter((o) => o.status === OrderStatus.completed);
    const totalConversions = completedOrders.length;
    const conversionRate = orderCount > 0 ? totalConversions / orderCount : 0;

    const totalCost = decimalToNumber(campaign.spentAmount);
    const totalRevenue = completedOrders.reduce((sum, o) => sum + decimalToNumber(o.price), 0);
    const roi = totalCost > 0 ? totalRevenue / totalCost : 0;

    const kolPerformance = campaign.orders.map((order) => {
      const v = Math.max(order.views, 0);
      const likes = Math.max(order.likes, 0);
      const comments = Math.max(order.comments, 0);
      const engagements = likes + comments;
      const conv = order.status === OrderStatus.completed ? 1 : 0;
      const erLocal = v > 0 ? engagements / v : 0;
      const performance_score = Math.min(100, Math.round(erLocal * 180 + conv * 28 + (v > 500 ? 12 : v > 0 ? 6 : 0)));
      return {
        kol_id: order.kolId,
        kol_name: order.kol?.platformDisplayName || order.kol?.platformUsername || 'KOL',
        impressions: order.views,
        clicks: order.likes,
        engagements,
        conversions: conv,
        performance_score,
      };
    });

    const trends = {
      impressions: this.generateDeterministicTrendData(totalImpressions, 7),
      clicks: this.generateDeterministicTrendData(totalClicks, 7),
    };

    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'campaign_stats',
      resourceId: campaignId,
      requestMethod: 'GET',
      requestPath: `/api/v1/admin/campaigns/${campaignId}/stats`,
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'campaign.stats',
      targetId: campaignId,
    });

    return {
      campaign_id: campaignId,
      overview: {
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        ctr,
        total_engagements: totalEngagements,
        engagement_rate: engagementRate,
        total_conversions: totalConversions,
        conversion_rate: conversionRate,
        total_cost: totalCost,
        total_revenue: totalRevenue,
        roi,
      },
      trends,
      kol_performance: kolPerformance,
    };
  }

  /**
   * Get abnormal campaigns
   */
  async getAbnormalCampaigns(
    filters: AbnormalCampaignFilters,
    adminId: string
  ): Promise<PaginationResponse<AbnormalCampaign>> {
    const { page, pageSize, severity, status, type } = filters;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const items: AbnormalCampaign[] = [];
    const now = Date.now();
    const THRESH_BUDGET = 0.85;
    const CTR_EXPECT = 0.08;

    const campaigns = await prisma.campaign.findMany({
      where: {
        status: { in: [CampaignStatus.active, CampaignStatus.paused, CampaignStatus.completed] },
      },
      select: {
        id: true,
        title: true,
        budget: true,
        spentAmount: true,
        totalViews: true,
        totalLikes: true,
        status: true,
        createdAt: true,
        selectedKols: true,
        publishedVideos: true,
      },
      take: 300,
      orderBy: { updatedAt: 'desc' },
    });

    for (const c of campaigns) {
      const budgetN = decimalToNumber(c.budget);
      const spentN = decimalToNumber(c.spentAmount);
      const util = budgetN > 0 ? spentN / budgetN : 0;
      if (util >= THRESH_BUDGET && budgetN > 0) {
        items.push({
          id: `anomaly_budget_${c.id}`,
          campaign_id: c.id,
          kol_id: null,
          order_id: null,
          anomaly_type: 'budget_overspend',
          description: `活动「${c.title}」预算占用率 ${(util * 100).toFixed(1)}%（≥${THRESH_BUDGET * 100}%）`,
          severity: util >= 0.98 ? 'high' : 'medium',
          expected_value: THRESH_BUDGET,
          actual_value: util,
          deviation_rate: util / THRESH_BUDGET,
          detected_at: new Date().toISOString(),
          detection_method: 'rule_based',
          status: 'pending',
          handled_by: null,
          handled_at: null,
        });
      }

      const ageDays = (now - c.createdAt.getTime()) / 86400000;
      if (c.status === CampaignStatus.active && c.totalViews === 0 && ageDays > 3 && c.selectedKols > 0) {
        items.push({
          id: `anomaly_zero_delivery_${c.id}`,
          campaign_id: c.id,
          kol_id: null,
          order_id: null,
          anomaly_type: 'other',
          description: `活动「${c.title}」进行中但累计曝光为 0（已创建 ${Math.floor(ageDays)} 天）`,
          severity: 'medium',
          expected_value: 1,
          actual_value: 0,
          deviation_rate: 1,
          detected_at: c.createdAt.toISOString(),
          detection_method: 'rule_based',
          status: 'pending',
          handled_by: null,
          handled_at: null,
        });
      }

      if (c.totalViews > 5000 && c.totalLikes > 0) {
        const ctr = c.totalLikes / c.totalViews;
        if (ctr > 0.2) {
          items.push({
            id: `anomaly_ctr_campaign_${c.id}`,
            campaign_id: c.id,
            kol_id: null,
            order_id: null,
            anomaly_type: 'unusual_engagement',
            description: `活动「${c.title}」全活动互动率（likes/views=${ctr.toFixed(3)}）偏高`,
            severity: ctr > 0.35 ? 'high' : 'medium',
            expected_value: CTR_EXPECT,
            actual_value: ctr,
            deviation_rate: ctr / CTR_EXPECT,
            detected_at: new Date().toISOString(),
            detection_method: 'rule_based',
            status: 'pending',
            handled_by: null,
            handled_at: null,
          });
        }
      }
    }

    const orders = await prisma.order.findMany({
      where: { views: { gte: 100 } },
      select: {
        id: true,
        campaignId: true,
        kolId: true,
        views: true,
        likes: true,
        comments: true,
      },
      take: 200,
      orderBy: { updatedAt: 'desc' },
    });

    for (const o of orders) {
      const v = o.views;
      const engagement = o.likes + o.comments;
      if (v < 100) {
        continue;
      }
      const er = engagement / v;
      if (er > 0.35) {
        items.push({
          id: `anomaly_order_eng_${o.id}`,
          campaign_id: o.campaignId,
          kol_id: o.kolId,
          order_id: o.id,
          anomaly_type: 'unusual_engagement',
          description: `订单 ${o.id.slice(0, 8)}… 互动率(赞+评)/曝光=${er.toFixed(3)}，高于常规阈值`,
          severity: er > 0.5 ? 'high' : 'medium',
          expected_value: 0.12,
          actual_value: er,
          deviation_rate: er / 0.12,
          detected_at: new Date().toISOString(),
          detection_method: 'rule_based',
          status: 'pending',
          handled_by: null,
          handled_at: null,
        });
      }
    }

    let filtered = items;
    if (severity) {
      filtered = filtered.filter((item) => item.severity === severity);
    }
    if (status) {
      filtered = filtered.filter((item) => item.status === status);
    }
    if (type) {
      filtered = filtered.filter((item) => item.anomaly_type === type);
    }

    filtered.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + take);
    const totalPages = Math.ceil(total / pageSize) || 1;

    await logAdminAction({
      adminId,
      action: 'list',
      resourceType: 'abnormal_campaigns',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/campaigns/abnormal',
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'campaign.abnormal',
      filters,
      total,
    });

    return {
      items: paginated,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  /**
   * 活动预算占用率 ≥ 阈值（spent / budget），供 Cron / 运营巡检；默认阈值 0.85
   */
  async getBudgetRiskCampaigns(
    threshold: number,
    adminId: string,
    adminEmail: string
  ): Promise<{
    items: Array<{
      id: string;
      title: string;
      budget: number;
      spent_amount: number;
      utilization: number;
      status: string;
    }>;
    threshold: number;
  }> {
    const t = Number.isFinite(threshold) ? Math.min(1, Math.max(0, threshold)) : getBudgetRiskThreshold();
    const rows = await prisma.campaign.findMany({
      where: {
        status: { in: ['active', 'paused'] },
        budget: { gt: 0 },
      },
      select: {
        id: true,
        title: true,
        budget: true,
        spentAmount: true,
        status: true,
      },
    });

    const items = rows
      .map((c) => {
        const budget = decimalToNumber(c.budget);
        const spent = decimalToNumber(c.spentAmount);
        const utilization = budget > 0 ? spent / budget : 0;
        return {
          id: c.id,
          title: c.title,
          budget,
          spent_amount: spent,
          utilization,
          status: c.status,
        };
      })
      .filter((x) => x.utilization >= t)
      .sort((a, b) => b.utilization - a.utilization);

    await logAdminAction({
      adminId,
      adminEmail,
      action: 'list_budget_risks',
      resourceType: 'campaigns',
      resourceId: 'aggregate',
      resourceName: 'budget_risks',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/campaigns/budget-risks',
      requestBody: JSON.stringify({ threshold: t }),
      status: 'success',
    });

    logger.info('Admin budget risk campaigns', { adminId, count: items.length, threshold: t });

    return { items, threshold: t };
  }

  /**
   * Helper method to calculate performance score
   */
  private calculatePerformanceScore(campaign: CampaignPerformanceInput): string {
    const totalImpressions = campaign.totalViews;
    const totalClicks = campaign.totalLikes;
    const { budget, spentAmount } = campaign;

    if (totalImpressions === 0) {
      return 'poor';
    }

    const ctr = totalClicks / totalImpressions;
    const budgetUtilization = decimalToNumber(spentAmount) / decimalToNumber(budget);

    if (ctr > 0.05 && budgetUtilization > 0.8) {
      return 'excellent';
    }
    if (ctr > 0.03 && budgetUtilization > 0.6) {
      return 'good';
    }
    if (ctr > 0.01) {
      return 'average';
    }
    return 'poor';
  }

  /**
   * 将累计值按天均分（余数摊到前若干天），保证与总量一致、可复现
   */
  private generateDeterministicTrendData(totalValue: number, days: number): Array<{ date: string; value: number }> {
    const trends: Array<{ date: string; value: number }> = [];
    if (days <= 0) {
      return trends;
    }
    const base = Math.floor(totalValue / days);
    const rem = totalValue - base * days;
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const v = base + (i < rem ? 1 : 0);
      trends.push({
        date: date.toISOString().split('T')[0],
        value: v,
      });
    }
    return trends;
  }
}

export const adminCampaignService = new AdminCampaignService();
