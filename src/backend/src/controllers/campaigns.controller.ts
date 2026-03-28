import { Request, Response } from 'express';
import { campaignService } from '../services/campaigns.service';
import { asyncHandler, errors } from '../middleware/errorHandler';
import { parseBodyOrRespond } from '../middleware/validation';
import { createCampaignSchema, updateCampaignSchema } from '../utils/validator';
import { ApiResponse } from '../types';

export class CampaignController {
  /**
   * POST /api/v1/campaigns
   * Create campaign
   */
  createCampaign = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(createCampaignSchema, req, res)) {
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    // Get advertiser ID from user
    const advertiser = await this.getAdvertiserIdByUserId(userId);

    const campaign = await campaignService.createCampaign(advertiser, req.body);

    const response: ApiResponse<typeof campaign> = {
      success: true,
      data: campaign,
      message: '活动创建成功',
    };

    res.status(201).json(response);
  });

  /**
   * GET /api/v1/campaigns
   * Get campaigns list
   */
  getCampaigns = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const advertiser = await this.getAdvertiserIdByUserId(userId);

    const { page = 1, page_size = 20, status, keyword, objective } = req.query;

    const filters: { status?: string; keyword?: string; objective?: string } = {};
    if (status) {
      filters.status = status as string;
    }
    if (keyword) {
      filters.keyword = keyword as string;
    }
    if (objective) {
      filters.objective = objective as string;
    }

    const result = await campaignService.getCampaigns(advertiser, Number(page), Number(page_size), filters);

    const totalPages = Math.ceil(result.total / Number(page_size));

    const response: ApiResponse = {
      success: true,
      data: {
        items: result.items,
        pagination: {
          page: Number(page),
          page_size: Number(page_size),
          total: result.total,
          total_pages: totalPages,
          has_next: Number(page) < totalPages,
          has_prev: Number(page) > 1,
        },
      },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/campaigns/:id
   * Get campaign by ID
   */
  getCampaign = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { id } = req.params;

    const campaign = await campaignService.getCampaignById(id as string);

    const response: ApiResponse<typeof campaign> = {
      success: true,
      data: campaign,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/campaigns/:id
   * Update campaign
   */
  updateCampaign = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(updateCampaignSchema, req, res)) {
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { id } = req.params;
    const advertiser = await this.getAdvertiserIdByUserId(userId);

    const campaign = await campaignService.updateCampaign(id as string, advertiser, req.body);

    const response: ApiResponse<typeof campaign> = {
      success: true,
      data: campaign,
      message: '活动更新成功',
    };

    res.status(200).json(response);
  });

  /**
   * DELETE /api/v1/campaigns/:id
   * Delete campaign
   */
  deleteCampaign = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { id } = req.params;
    const advertiser = await this.getAdvertiserIdByUserId(userId);

    await campaignService.deleteCampaign(id as string, advertiser);

    const response: ApiResponse = {
      success: true,
      message: '活动已删除',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/campaigns/:id/submit
   * Submit campaign for review
   */
  submitCampaign = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { id } = req.params;
    const advertiser = await this.getAdvertiserIdByUserId(userId);

    const campaign = await campaignService.submitCampaign(id as string, advertiser);

    const response: ApiResponse<typeof campaign> = {
      success: true,
      data: campaign,
      message: '活动已提交，开始匹配 KOL',
    };

    res.status(200).json(response);
  });

  /**
   * Helper: Get advertiser ID by user ID
   */
  private async getAdvertiserIdByUserId(userId: string): Promise<string> {
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!advertiser) {
      throw errors.notFound('广告主资料不存在，请先创建');
    }

    return advertiser.id;
  }
}

// Need to import prisma for helper method
import prisma from '../config/database';

export const campaignController = new CampaignController();
