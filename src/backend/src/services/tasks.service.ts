import prisma from '../config/database';
import { logger } from '../utils/logger';
import { errors, ApiError } from '../middleware/errorHandler';
import { TaskResponse, ApplyTaskRequest, KolOrderResponse } from '../types';

export class TasksService {
  /**
   * Get available tasks for KOL
   */
  async getAvailableTasks(
    kolId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      platform?: string;
      min_budget?: number;
      max_budget?: number;
      status?: string;
    }
  ): Promise<{ items: TaskResponse[]; total: number }> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    const where: any = {
      status: 'active',
    };

    // Platform filter - match KOL's platform
    if (filters?.platform) {
      where.targetPlatforms = { has: filters.platform };
    } else if (kol.platform) {
      where.targetPlatforms = { has: kol.platform };
    }

    // Budget filter
    if (filters?.min_budget !== undefined) {
      where.budget = { ...where.budget, gte: filters.min_budget };
    }
    if (filters?.max_budget !== undefined) {
      where.budget = { ...where.budget, lte: filters.max_budget };
    }

    // Status filter
    if (filters?.status) {
      where.status = filters.status;
    }

    // Filter by KOL's followers and engagement rate
    const kolFilters: any[] = [];
    
    if (kol.followers) {
      // Campaigns where KOL meets follower requirements
      kolFilters.push({
        AND: [
          { minFollowers: { lte: kol.followers } },
          {
            OR: [
              { maxFollowers: { gte: kol.followers } },
              { maxFollowers: null },
            ],
          },
        ],
      });
    }

    if (kol.engagementRate) {
      const kolEngagementRate = kol.engagementRate.toNumber();
      kolFilters.push({
        OR: [
          { minEngagementRate: { lte: kolEngagementRate } },
          { minEngagementRate: null },
        ],
      });
    }

    if (kolFilters.length > 0) {
      where.AND = [...(where.AND || []), ...kolFilters];
    }

    // Exclude campaigns where KOL already has an order
    const existingOrders = await prisma.order.findMany({
      where: { kolId },
      select: { campaignId: true },
    });

    const excludedCampaignIds = existingOrders.map((o) => o.campaignId);
    if (excludedCampaignIds.length > 0) {
      where.id = { notIn: excludedCampaignIds };
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.campaign.count({ where }),
    ]);

    return {
      items: campaigns.map((c) => this.formatTaskResponse(c)),
      total,
    };
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string, kolId?: string): Promise<TaskResponse> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: taskId },
    });

    if (!campaign) {
      throw errors.notFound('任务不存在');
    }

    // Check if KOL can view this task
    if (kolId) {
      const kol = await prisma.kol.findUnique({
        where: { id: kolId },
      });

      if (!kol) {
        throw errors.notFound('KOL 不存在');
      }

      // Check if campaign is active or pending_review
      if (!['active', 'pending_review'].includes(campaign.status)) {
        throw new ApiError('任务状态不允许查看', 403, 'INVALID_TASK_STATUS');
      }
    }

    return this.formatTaskResponse(campaign);
  }

  /**
   * Apply for a task
   */
  async applyForTask(kolId: string, taskId: string, data: ApplyTaskRequest): Promise<KolOrderResponse> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: taskId },
    });

    if (!campaign) {
      throw errors.notFound('任务不存在');
    }

    // Check campaign status
    if (!['active', 'pending_review'].includes(campaign.status)) {
      throw new ApiError('任务状态不允许申请', 400, 'INVALID_TASK_STATUS');
    }

    // Check if KOL already has an order for this campaign
    const existingOrder = await prisma.order.findFirst({
      where: {
        kolId,
        campaignId: taskId,
      },
    });

    if (existingOrder) {
      throw new ApiError('已申请过该任务', 409, 'ALREADY_APPLIED');
    }

    // Generate order number
    const orderNo = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Use offered price or campaign budget as default
    const price = data.expected_price || campaign.budget.toNumber();
    const platformFeeRate = 0.1;
    const platformFee = price * platformFeeRate;
    const kolEarning = price - platformFee;

    // Create order with pending status
    const order = await prisma.order.create({
      data: {
        campaignId: taskId,
        kolId,
        advertiserId: campaign.advertiserId,
        orderNo,
        price,
        platformFee,
        kolEarning,
        contentType: 'video',
        contentCount: 1,
        contentDescription: data.message || campaign.contentRequirements,
        draftUrls: data.draft_urls || [],
        status: 'pending',
        deadline: campaign.deadline,
      },
      include: {
        campaign: {
          select: {
            title: true,
          },
        },
        advertiser: {
          select: {
            companyName: true,
          },
        },
      },
    });

    // Update campaign applied_kols count
    await prisma.campaign.update({
      where: { id: taskId },
      data: {
        appliedKols: { increment: 1 },
      },
    });

    logger.info('KOL applied for task', {
      kolId,
      taskId,
      orderId: order.id,
    });

    return this.formatKolOrderResponse(order);
  }

  /**
   * Format task response
   */
  private formatTaskResponse(campaign: any): TaskResponse {
    return {
      id: campaign.id,
      campaign_id: campaign.id,
      advertiser_id: campaign.advertiserId,
      title: campaign.title,
      description: campaign.description,
      objective: campaign.objective,
      platform: campaign.targetPlatforms?.[0] || '',
      content_type: 'video',
      content_count: 1,
      budget: campaign.budget.toNumber(),
      min_followers: campaign.minFollowers,
      max_followers: campaign.maxFollowers,
      min_engagement_rate: campaign.minEngagementRate?.toNumber(),
      required_categories: campaign.requiredCategories || [],
      target_countries: campaign.targetCountries || [],
      content_requirements: campaign.contentRequirements,
      content_guidelines: campaign.contentGuidelines,
      required_hashtags: campaign.requiredHashtags || [],
      required_mentions: campaign.requiredMentions || [],
      start_date: campaign.startDate?.toISOString(),
      end_date: campaign.endDate?.toISOString(),
      deadline: campaign.deadline?.toISOString(),
      status: campaign.status,
      total_kols: campaign.totalKols,
      applied_kols: campaign.appliedKols,
      selected_kols: campaign.selectedKols,
      published_videos: campaign.publishedVideos,
      created_at: campaign.createdAt.toISOString(),
      updated_at: campaign.updatedAt.toISOString(),
    };
  }

  /**
   * Format KOL order response
   */
  private formatKolOrderResponse(order: any): KolOrderResponse {
    return {
      id: order.id,
      campaign_id: order.campaignId,
      campaign_title: order.campaign?.title || '',
      advertiser_id: order.advertiserId,
      advertiser_name: order.advertiser?.companyName,
      order_no: order.orderNo,
      price: order.price.toNumber(),
      platform_fee: order.platformFee.toNumber(),
      kol_earning: order.kolEarning.toNumber(),
      content_type: order.contentType,
      content_count: order.contentCount,
      content_description: order.contentDescription,
      draft_urls: order.draftUrls || [],
      published_urls: order.publishedUrls || [],
      accepted_at: order.acceptedAt?.toISOString(),
      deadline: order.deadline?.toISOString(),
      submitted_at: order.submittedAt?.toISOString(),
      approved_at: order.approvedAt?.toISOString(),
      published_at: order.publishedAt?.toISOString(),
      completed_at: order.completedAt?.toISOString(),
      status: order.status,
      review_notes: order.reviewNotes,
      revision_count: order.revisionCount,
      advertiser_rating: order.advertiserRating,
      advertiser_review: order.advertiserReview,
      kol_rating: order.kolRating,
      kol_review: order.kolReview,
      views: order.views,
      likes: order.likes,
      comments: order.comments,
      shares: order.shares,
      created_at: order.createdAt.toISOString(),
      updated_at: order.updatedAt.toISOString(),
    };
  }
}

export const tasksService = new TasksService();
