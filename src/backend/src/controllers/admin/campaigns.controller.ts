import { Request, Response } from 'express';
import { adminCampaignService } from '../../services/admin/campaigns.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAdmin } from '../../middleware/adminAuth';
import { parseBodyOrRespond } from '../../middleware/validation';
import { ApiResponse } from '../../types';
import { z } from 'zod';
import { getBudgetRiskThreshold } from '../../utils/budgetRiskThreshold';

// Validation schemas
const verifyCampaignSchema = z.object({
  action: z.enum(['approve', 'reject'] as const, {
    message: '操作类型必须是 approve 或 reject',
  }),
  note: z.string().optional(),
  rejection_reason: z.string().optional(),
});

const updateCampaignStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled'] as const, {
    message: '状态必须是 draft, active, paused, completed 或 cancelled',
  }),
  reason: z.string().optional(),
});

export class AdminCampaignsController {
  /**
   * GET /api/v1/admin/campaigns
   * Get campaign list with pagination and filters
   */
  getCampaignList = asyncHandler(async (req: Request, res: Response) => {
    const {
      page,
      page_size,
      keyword,
      status,
      advertiser_id,
      industry,
      start_date_after,
      start_date_before,
      min_budget,
      max_budget,
      sort,
      order,
    } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: page_size ? parseInt(page_size as string, 10) : 20,
      keyword: keyword as string,
      status: status as string,
      advertiserId: advertiser_id as string,
      industry: industry as string,
      startDateAfter: start_date_after as string,
      startDateBefore: start_date_before as string,
      minBudget: min_budget ? parseFloat(min_budget as string) : undefined,
      maxBudget: max_budget ? parseFloat(max_budget as string) : undefined,
      sort: (sort as string) || 'created_at',
      order: (order as 'asc' | 'desc') || 'desc',
    };

    const adminId = requireAdmin(req).id;
    const result = await adminCampaignService.getCampaignList(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/campaigns/budget-risks
   * 预算占用率 ≥ 阈值的活动（须在 :id 之前注册路由）
   */
  getBudgetRiskCampaigns = asyncHandler(async (req: Request, res: Response) => {
    const raw = req.query.threshold as string | undefined;
    let threshold = getBudgetRiskThreshold();
    if (raw !== undefined) {
      const p = parseFloat(raw);
      if (Number.isFinite(p)) {
        threshold = p;
      }
    }
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminCampaignService.getBudgetRiskCampaigns(threshold, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/campaigns/:id
   * Get campaign details by ID
   */
  getCampaignById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = requireAdmin(req).id;

    const result = await adminCampaignService.getCampaignById(id.toString(), adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/campaigns/:id/verify
   * Verify campaign (approve or reject)
   */
  verifyCampaign = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(verifyCampaignSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminCampaignService.verifyCampaign(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: req.body.action === 'approve' ? '活动审核通过' : '活动审核拒绝',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/campaigns/:id/status
   * Update campaign status
   */
  updateCampaignStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(updateCampaignStatusSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminCampaignService.updateCampaignStatus(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '活动状态已更新',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/campaigns/:id/stats
   * Get campaign statistics
   */
  getCampaignStats = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = requireAdmin(req).id;

    const result = await adminCampaignService.getCampaignStats(id.toString(), adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/campaigns/abnormal
   * Get abnormal campaigns
   */
  getAbnormalCampaigns = asyncHandler(async (req: Request, res: Response) => {
    const { page, page_size, severity, status, type, sort, order } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: page_size ? parseInt(page_size as string, 10) : 20,
      severity: severity as string,
      status: status as string,
      type: type as string,
      sort: (sort as string) || 'detected_at',
      order: (order as 'asc' | 'desc') || 'desc',
    };

    const adminId = requireAdmin(req).id;
    const result = await adminCampaignService.getAbnormalCampaigns(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });
}

export const adminCampaignsController = new AdminCampaignsController();
