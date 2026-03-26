import prisma from '../config/database';
import { logger } from '../utils/logger';
import { errors, ApiError } from '../middleware/errorHandler';
import { cacheService } from '../config/redis';
import { CreateCampaignRequest, CampaignResponse } from '../types';
import { Prisma } from '@prisma/client';

export class CampaignService {
  /**
   * Create campaign
   */
  async createCampaign(advertiserId: string, data: CreateCampaignRequest): Promise<CampaignResponse> {
    // Get advertiser
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser) {
      throw errors.notFound('广告主不存在');
    }

    // Check budget
    if (data.budget > advertiser.walletBalance.toNumber()) {
      throw new ApiError('余额不足，请充值后创建', 400, 'INSUFFICIENT_BALANCE');
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        advertiserId,
        title: data.title,
        description: data.description,
        objective: data.objective || 'awareness',
        budget: data.budget,
        budgetType: data.budget_type || 'fixed',
        targetAudience: data.target_audience as Prisma.InputJsonValue,
        targetPlatforms: data.target_platforms || [],
        minFollowers: data.min_followers,
        maxFollowers: data.max_followers,
        minEngagementRate: data.min_engagement_rate,
        requiredCategories: data.required_categories || [],
        targetCountries: data.target_countries || [],
        contentRequirements: data.content_requirements,
        requiredHashtags: data.required_hashtags || [],
        startDate: data.start_date ? new Date(data.start_date) : null,
        endDate: data.end_date ? new Date(data.end_date) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: 'draft',
      },
    });

    logger.info('Campaign created', { campaignId: campaign.id, advertiserId });

    return this.formatCampaignResponse(campaign);
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId: string, advertiserId?: string): Promise<CampaignResponse> {
    // Try cache first
    const cacheKey = `campaign:${campaignId}`;
    const cached = await cacheService.get<CampaignResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = { id: campaignId };
    
    // If advertiserId is provided, ensure ownership
    if (advertiserId) {
      where.advertiserId = advertiserId;
    }

    const campaign = await prisma.campaign.findUnique({
      where,
    });

    if (!campaign) {
      throw errors.notFound('活动不存在');
    }

    const response = this.formatCampaignResponse(campaign);
    
    // Cache for 5 minutes
    await cacheService.set(cacheKey, response, 300);
    
    return response;
  }

  /**
   * Get campaigns list with pagination and filters
   * P1 Performance: Optimized with selective fields and caching
   */
  async getCampaigns(
    advertiserId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      status?: string;
      keyword?: string;
      objective?: string;
    }
  ): Promise<{ items: CampaignResponse[]; total: number }> {
    const where: any = {
      advertiserId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.objective) {
      where.objective = filters.objective;
    }

    if (filters?.keyword) {
      where.OR = [
        { title: { contains: filters.keyword } },
        { description: { contains: filters.keyword } },
      ];
    }

    // P1 Performance: Cache key for campaign list
    const cacheKey = `campaign:list:${advertiserId}:${filters?.status || 'all'}:${page}:${pageSize}`;
    
    // Try cache first (3 min TTL for campaign lists)
    if (!filters?.keyword) {
      const cached = await cacheService.get<{ items: CampaignResponse[]; total: number }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // P1 Performance: Use selective field selection
    const selectFields = {
      id: true,
      title: true,
      description: true,
      objective: true,
      budget: true,
      budgetType: true,
      spentAmount: true,
      status: true,
      totalKols: true,
      selectedKols: true,
      publishedVideos: true,
      totalViews: true,
      totalLikes: true,
      totalComments: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
    };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        select: selectFields,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.campaign.count({ where }),
    ]);

    const result = {
      items: campaigns.map((c) => this.formatCampaignResponse(c)),
      total,
    };

    // Cache non-keyword searches for 3 minutes
    if (!filters?.keyword) {
      await cacheService.set(cacheKey, result, 180);
    }

    return result;
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: string,
    advertiserId: string,
    data: any
  ): Promise<CampaignResponse> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw errors.notFound('活动不存在');
    }

    if (campaign.advertiserId !== advertiserId) {
      throw errors.forbidden('没有权限修改此活动');
    }

    // Can't modify completed or cancelled campaigns
    if (['completed', 'cancelled'].includes(campaign.status)) {
      throw new ApiError('已完成或已取消的活动不能修改', 400, 'INVALID_STATUS');
    }

    // Build update data
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.objective !== undefined) updateData.objective = data.objective;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.budget_type !== undefined) updateData.budgetType = data.budget_type;
    if (data.target_audience !== undefined) updateData.targetAudience = data.target_audience;
    if (data.target_platforms !== undefined) updateData.targetPlatforms = data.target_platforms;
    if (data.min_followers !== undefined) updateData.minFollowers = data.min_followers;
    if (data.max_followers !== undefined) updateData.maxFollowers = data.max_followers;
    if (data.min_engagement_rate !== undefined) updateData.minEngagementRate = data.min_engagement_rate;
    if (data.required_categories !== undefined) updateData.requiredCategories = data.required_categories;
    if (data.target_countries !== undefined) updateData.targetCountries = data.target_countries;
    if (data.content_requirements !== undefined) updateData.contentRequirements = data.content_requirements;
    if (data.required_hashtags !== undefined) updateData.requiredHashtags = data.required_hashtags;
    if (data.start_date !== undefined) updateData.startDate = data.start_date ? new Date(data.start_date) : null;
    if (data.end_date !== undefined) updateData.endDate = data.end_date ? new Date(data.end_date) : null;
    if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    // Invalidate cache
    await cacheService.delete(`campaign:${campaignId}`);

    logger.info('Campaign updated', { campaignId });

    return this.formatCampaignResponse(updated);
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string, advertiserId: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw errors.notFound('活动不存在');
    }

    if (campaign.advertiserId !== advertiserId) {
      throw errors.forbidden('没有权限删除此活动');
    }

    // Can only delete draft or cancelled campaigns
    if (!['draft', 'cancelled'].includes(campaign.status)) {
      throw new ApiError('只能删除草稿或已取消的活动', 400, 'INVALID_STATUS');
    }

    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    // Invalidate cache
    await cacheService.delete(`campaign:${campaignId}`);

    logger.info('Campaign deleted', { campaignId });
  }

  /**
   * Submit campaign (start KOL matching)
   */
  async submitCampaign(campaignId: string, advertiserId: string): Promise<CampaignResponse> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw errors.notFound('活动不存在');
    }

    if (campaign.advertiserId !== advertiserId) {
      throw errors.forbidden('没有权限操作此活动');
    }

    // Can only submit draft campaigns
    if (campaign.status !== 'draft') {
      throw new ApiError('只能提交草稿状态的活动', 400, 'INVALID_STATUS');
    }

    // Validate campaign has required fields
    if (!campaign.title || !campaign.budget) {
      throw new ApiError('活动信息不完整', 400, 'INVALID_CAMPAIGN');
    }

    // Update status to pending_review
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'pending_review',
      },
    });

    // Invalidate cache
    await cacheService.delete(`campaign:${campaignId}`);

    logger.info('Campaign submitted for review', { campaignId });

    return this.formatCampaignResponse(updated);
  }

  /**
   * Format campaign response
   */
  private formatCampaignResponse(campaign: any): CampaignResponse {
    return {
      id: campaign.id,
      advertiser_id: campaign.advertiserId,
      title: campaign.title,
      description: campaign.description,
      objective: campaign.objective,
      budget: campaign.budget.toNumber(),
      budget_type: campaign.budgetType,
      spent_amount: campaign.spentAmount.toNumber(),
      target_audience: campaign.targetAudience,
      target_platforms: campaign.targetPlatforms,
      min_followers: campaign.minFollowers,
      max_followers: campaign.maxFollowers,
      min_engagement_rate: campaign.minEngagementRate,
      required_categories: campaign.requiredCategories,
      excluded_categories: campaign.excludedCategories,
      target_countries: campaign.targetCountries,
      content_requirements: campaign.contentRequirements,
      content_guidelines: campaign.contentGuidelines,
      required_hashtags: campaign.requiredHashtags,
      required_mentions: campaign.requiredMentions,
      start_date: campaign.startDate?.toISOString().split('T')[0],
      end_date: campaign.endDate?.toISOString().split('T')[0],
      deadline: campaign.deadline?.toISOString(),
      status: campaign.status,
      total_kols: campaign.totalKols,
      applied_kols: campaign.appliedKols,
      selected_kols: campaign.selectedKols,
      published_videos: campaign.publishedVideos,
      total_views: campaign.totalViews,
      total_likes: campaign.totalLikes,
      total_comments: campaign.totalComments,
      reviewed_by: campaign.reviewedBy,
      reviewed_at: campaign.reviewedAt?.toISOString(),
      review_notes: campaign.reviewNotes,
      created_at: campaign.createdAt.toISOString(),
      updated_at: campaign.updatedAt.toISOString(),
    };
  }
}

export const campaignService = new CampaignService();
