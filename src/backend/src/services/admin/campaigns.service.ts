import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { ApiError } from '../../middleware/errorHandler';
import { logAdminAction } from './audit.service';
import { PaginationResponse } from '../../types';
import { decimalToNumber } from '../../utils/decimal';

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
  target_audience: any;
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

export class AdminCampaignService {
  /**
   * Get campaign list with pagination and filters
   */
  async getCampaignList(
    filters: CampaignListFilters,
    adminId: string
  ): Promise<PaginationResponse<CampaignListItem>> {
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
    const where: any = {};

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (advertiserId) {
      where.advertiserId = advertiserId;
    }

    if (minBudget !== undefined || maxBudget !== undefined) {
      where.budget = {};
      if (minBudget !== undefined) {
        where.budget.gte = minBudget;
      }
      if (maxBudget !== undefined) {
        where.budget.lte = maxBudget;
      }
    }

    if (startDateAfter || startDateBefore) {
      where.startDate = {};
      if (startDateAfter) {
        where.startDate.gte = new Date(startDateAfter);
      }
      if (startDateBefore) {
        where.startDate.lte = new Date(startDateBefore);
      }
    }

    // Get total count
    const total = await prisma.campaign.count({ where });

    // Get items
    const items = await prisma.campaign.findMany({
      where,
      skip,
      take,
      orderBy: { [sort ?? 'createdAt']: order ?? 'desc' } as Record<string, 'asc' | 'desc'>,
      include: {
        advertiser: {
          select: {
            companyName: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / pageSize);

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
  ): Promise<any> {
    const { action, note, rejection_reason } = request;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new ApiError('活动不存在', 404, 'NOT_FOUND');
    }

    const updateData: any = {
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
  ): Promise<any> {
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
        status,
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

    // Calculate statistics
    const totalImpressions = campaign.totalViews;
    const totalClicks = campaign.totalLikes;
    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    // Mock engagement data (can be enhanced with real data)
    const totalEngagements = Math.floor(totalClicks * 0.7);
    const engagementRate = totalImpressions > 0 ? totalEngagements / totalImpressions : 0;

    // Mock conversion data
    const totalConversions = Math.floor(totalClicks * 0.02);
    const conversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0;

    const totalCost = decimalToNumber(campaign.spentAmount);
    const totalRevenue = totalCost * 3.85; // Mock ROI of 3.85
    const roi = totalCost > 0 ? totalRevenue / totalCost : 0;

    // KOL performance
    const kolPerformance = campaign.orders.map((order) => ({
      kol_id: order.kolId,
      kol_name: order.kol?.platformUsername || 'Unknown',
      impressions: Math.floor(totalImpressions / campaign.orders.length) || 0,
      clicks: Math.floor(totalClicks / campaign.orders.length) || 0,
      engagements: Math.floor(totalEngagements / campaign.orders.length) || 0,
      conversions: Math.floor(totalConversions / campaign.orders.length) || 0,
      performance_score: Math.floor(Math.random() * 20) + 80, // Mock score 80-100
    }));

    // Mock trend data
    const trends = {
      impressions: this.generateTrendData(totalImpressions, 7),
      clicks: this.generateTrendData(totalClicks, 7),
    };

    // Log admin action
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

    // Mock abnormal campaigns data (can be enhanced with real anomaly detection)
    const mockAbnormalCampaigns: AbnormalCampaign[] = [
      {
        id: 'anomaly_1',
        campaign_id: 'campaign_1',
        kol_id: 'kol_1',
        order_id: 'order_1',
        anomaly_type: 'fake_impressions',
        description: '检测到异常曝光数据，偏离正常值 300%',
        severity: 'high',
        expected_value: 10000,
        actual_value: 50000,
        deviation_rate: 4.0,
        detected_at: new Date().toISOString(),
        detection_method: 'ai_model',
        status: 'pending',
        handled_by: null,
        handled_at: null,
      },
      {
        id: 'anomaly_2',
        campaign_id: 'campaign_2',
        kol_id: 'kol_2',
        order_id: 'order_2',
        anomaly_type: 'click_fraud',
        description: '检测到异常点击行为，点击率异常偏高',
        severity: 'medium',
        expected_value: 0.05,
        actual_value: 0.25,
        deviation_rate: 5.0,
        detected_at: new Date(Date.now() - 86400000).toISOString(),
        detection_method: 'rule_based',
        status: 'investigating',
        handled_by: 'admin_1',
        handled_at: null,
      },
    ];

    // Apply filters
    let filtered = mockAbnormalCampaigns;

    if (severity) {
      filtered = filtered.filter((item) => item.severity === severity);
    }

    if (status) {
      filtered = filtered.filter((item) => item.status === status);
    }

    if (type) {
      filtered = filtered.filter((item) => item.anomaly_type === type);
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + take);
    const totalPages = Math.ceil(total / pageSize);

    // Log admin action
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
   * Helper method to calculate performance score
   */
  private calculatePerformanceScore(campaign: any): string {
    const { totalImpressions, totalClicks, budget, spentAmount } = campaign;

    if (totalImpressions === 0) return 'poor';

    const ctr = totalClicks / totalImpressions;
    const budgetUtilization = decimalToNumber(spentAmount) / decimalToNumber(budget);

    if (ctr > 0.05 && budgetUtilization > 0.8) return 'excellent';
    if (ctr > 0.03 && budgetUtilization > 0.6) return 'good';
    if (ctr > 0.01) return 'average';
    return 'poor';
  }

  /**
   * Helper method to generate trend data
   */
  private generateTrendData(totalValue: number, days: number): Array<{ date: string; value: number }> {
    const trends: Array<{ date: string; value: number }> = [];
    const avgPerDay = totalValue / days;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variance = Math.random() * 0.4 + 0.8; // 0.8 to 1.2
      trends.push({
        date: date.toISOString().split('T')[0],
        value: Math.floor(avgPerDay * variance),
      });
    }

    return trends;
  }
}

export const adminCampaignService = new AdminCampaignService();
