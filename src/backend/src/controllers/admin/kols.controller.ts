import { Request, Response } from 'express';
import { adminKolsService } from '../../services/admin/kols.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAdmin } from '../../middleware/adminAuth';
import { parseBodyOrRespond } from '../../middleware/validation';
import { ApiResponse } from '../../types';
import { z } from 'zod';

// Validation schemas
const approveKolSchema = z.object({
  note: z.string().optional(),
  setVerified: z.boolean().optional(),
});

const rejectKolSchema = z.object({
  reason: z.string().min(1, '需要填写拒绝原因'),
  note: z.string().optional(),
});

const rateKolSchema = z.object({
  rating: z.enum(['S', 'A', 'B', 'C'], '评级必须是 S/A/B/C'),
  note: z.string().optional(),
});

const blacklistKolSchema = z.object({
  reason: z.string().min(1, '需要填写原因'),
  note: z.string().optional(),
});

const verifyKolSchema = z.object({
  syncData: z.boolean().optional(),
  note: z.string().optional(),
});

export class AdminKolsController {
  /**
   * GET /api/v1/admin/kols/pending
   * Get pending KOLs for review
   */
  getPendingKols = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, platform } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      platform: platform as string,
    };

    const adminId = requireAdmin(req).id;
    const result = await adminKolsService.getPendingKols(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/kols
   * Get KOL list with filters
   */
  getKolList = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status, platform, category, min_followers, max_followers, verified, sort, order } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      status: status as string,
      platform: platform as string,
      category: category as string,
      minFollowers: min_followers ? parseInt(min_followers as string, 10) : undefined,
      maxFollowers: max_followers ? parseInt(max_followers as string, 10) : undefined,
      verified: verified === 'true' || verified === 'false' ? verified === 'true' : undefined,
      sort: sort as string,
      order: (order as 'asc' | 'desc') || 'desc',
    };

    const adminId = requireAdmin(req).id;
    const result = await adminKolsService.getKolList(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/kols/:id
   * Get KOL by ID
   */
  getKolById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = requireAdmin(req).id;

    const result = await adminKolsService.getKolById(id.toString(), adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/kols/:id/verify
   * Verify KOL (admin verification)
   */
  verifyKol = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(verifyKolSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminKolsService.verifyKol(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'KOL 已认证',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/kols/:id/rating
   * Rate KOL
   */
  rateKol = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(rateKolSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminKolsService.rateKol(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'KOL 评级已更新',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/kols/:id/blacklist
   * Add KOL to blacklist
   */
  blacklistKol = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(blacklistKolSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminKolsService.blacklistKol(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'KOL 已加入黑名单',
    };

    res.status(200).json(response);
  });

  /**
   * DELETE /api/v1/admin/kols/:id/blacklist
   * Remove KOL from blacklist
   */
  removeFromBlacklist = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminKolsService.removeFromBlacklist(id.toString(), adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'KOL 已移出黑名单',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/kols/:id/approve
   * Approve KOL
   */
  approveKol = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(approveKolSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminKolsService.approveKol(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'KOL 审核通过',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/kols/:id/reject
   * Reject KOL
   */
  rejectKol = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(rejectKolSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminKolsService.rejectKol(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'KOL 审核拒绝',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/kols/:id/suspend
   * Suspend KOL
   */
  suspendKol = asyncHandler(async (req: Request, res: Response) => {
    const suspendSchema = z.object({
      reason: z.string().min(1, '需要填写原因'),
      durationDays: z.number().min(1),
    });

    if (!parseBodyOrRespond(suspendSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminKolsService.suspendKol(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'KOL 资格已暂停',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/kols/:id/unsuspend
   * Unsuspend KOL
   */
  unsuspendKol = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminKolsService.unsuspendKol(id.toString(), adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'KOL 资格已恢复',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/kols/:id/sync
   * Sync KOL data from platform
   */
  syncKolData = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = requireAdmin(req).id;

    const result = await adminKolsService.syncKolData(id.toString(), adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'KOL 数据已同步',
    };

    res.status(200).json(response);
  });
}

export const adminKolsController = new AdminKolsController();
