import { Request, Response } from 'express';
import { adminAdvertiserService } from '../../services/admin/advertisers.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAdmin } from '../../middleware/adminAuth';
import { parseBodyOrRespond } from '../../middleware/validation';
import { ApiResponse } from '../../types';
import { z } from 'zod';

// Validation schemas
const verifyAdvertiserSchema = z.object({
  action: z.enum(['approve', 'reject'] as const, {
    message: '操作类型必须是 approve 或 reject',
  }),
  note: z.string().optional(),
  rejection_reason: z.string().optional(),
});

const balanceAdjustmentSchema = z.object({
  amount: z.number().refine((val) => val !== 0, {
    message: '调整金额不能为 0',
  }),
  type: z.enum(['manual', 'refund', 'compensation', 'penalty'] as const, {
    message: '调整类型必须是 manual, refund, compensation 或 penalty',
  }),
  reason: z.string().min(1, '调整原因不能为空'),
  notify_advertiser: z.boolean().default(true),
});

const freezeAccountSchema = z.object({
  reason: z.string().min(1, '冻结原因不能为空'),
  freeze_amount: z.number().optional(),
});

const unfreezeAccountSchema = z.object({
  reason: z.string().min(1, '解冻原因不能为空'),
  unfreeze_amount: z.number().optional(),
});

export class AdminAdvertisersController {
  /**
   * GET /api/v1/admin/advertisers
   * Get advertiser list with pagination and filters
   */
  getAdvertiserList = asyncHandler(async (req: Request, res: Response) => {
    const {
      page,
      page_size,
      keyword,
      verification_status,
      industry,
      min_balance,
      max_balance,
      created_after,
      created_before,
      sort,
      order,
    } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: page_size ? parseInt(page_size as string, 10) : 20,
      keyword: keyword as string,
      verificationStatus: verification_status as string,
      industry: industry as string,
      minBalance: min_balance ? parseFloat(min_balance as string) : undefined,
      maxBalance: max_balance ? parseFloat(max_balance as string) : undefined,
      createdAfter: created_after as string,
      createdBefore: created_before as string,
      sort: (sort as string) || 'created_at',
      order: (order as 'asc' | 'desc') || 'desc',
    };

    const adminId = requireAdmin(req).id;
    const result = await adminAdvertiserService.getAdvertiserList(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/advertisers/:id
   * Get advertiser details by ID
   */
  getAdvertiserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = requireAdmin(req).id;

    const result = await adminAdvertiserService.getAdvertiserById(id.toString(), adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/advertisers/:id/verify
   * Verify advertiser (approve or reject)
   */
  verifyAdvertiser = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(verifyAdvertiserSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminAdvertiserService.verifyAdvertiser(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: req.body.action === 'approve' ? '广告主审核通过' : '广告主审核拒绝',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/advertisers/:id/recharges
   * Get advertiser recharge records
   */
  getRechargeRecords = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page, page_size, status, payment_method, created_after, created_before } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: page_size ? parseInt(page_size as string, 10) : 20,
      status: status as string,
      paymentMethod: payment_method as string,
      createdAfter: created_after as string,
      createdBefore: created_before as string,
    };

    const adminId = requireAdmin(req).id;
    const result = await adminAdvertiserService.getRechargeRecords(id.toString(), filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/advertisers/:id/consumptions
   * Get advertiser consumption records
   */
  getConsumptionRecords = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page, page_size, type, status, created_after, created_before } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: page_size ? parseInt(page_size as string, 10) : 20,
      type: type as string,
      status: status as string,
      createdAfter: created_after as string,
      createdBefore: created_before as string,
    };

    const adminId = requireAdmin(req).id;
    const result = await adminAdvertiserService.getConsumptionRecords(id.toString(), filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/advertisers/:id/balance
   * Adjust advertiser balance
   */
  adjustBalance = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(balanceAdjustmentSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminAdvertiserService.adjustBalance(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '余额调整成功',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/advertisers/:id/freeze
   * Freeze advertiser account
   */
  freezeAccount = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(freezeAccountSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminAdvertiserService.freezeAccount(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '账户已冻结',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/advertisers/:id/unfreeze
   * Unfreeze advertiser account
   */
  unfreezeAccount = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(unfreezeAccountSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminAdvertiserService.unfreezeAccount(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '账户已解冻',
    };

    res.status(200).json(response);
  });
}

export const adminAdvertisersController = new AdminAdvertisersController();
