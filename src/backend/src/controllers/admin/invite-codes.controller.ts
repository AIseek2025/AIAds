import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAdmin } from '../../middleware/adminAuth';
import { parseBodyOrRespond } from '../../middleware/validation';
import { ApiResponse } from '../../types';
import { adminInviteCodesService } from '../../services/admin/invite-codes.service';

const createInviteSchema = z.object({
  role_target: z.enum(['advertiser', 'kol']),
  max_uses: z.coerce.number().int().min(1).max(100_000).optional(),
  expires_at: z.string().min(1).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

const patchInviteSchema = z.object({
  active: z.boolean(),
});

export class AdminInviteCodesController {
  list = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.page_size ?? '20'), 10) || 20));
    const result = await adminInviteCodesService.list(page, pageSize);
    const response: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(response);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(createInviteSchema, req, res)) return;
    const admin = requireAdmin(req);
    const row = await adminInviteCodesService.create(req.body, admin.id);
    const response: ApiResponse<typeof row> = {
      success: true,
      data: row,
      message: '邀请码已创建',
    };
    res.status(201).json(response);
  });

  patch = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(patchInviteSchema, req, res)) return;
    requireAdmin(req);
    const { id } = req.params;
    const row = await adminInviteCodesService.setActive(id as string, req.body.active);
    const response: ApiResponse<typeof row> = { success: true, data: row };
    res.status(200).json(response);
  });
}

export const adminInviteCodesController = new AdminInviteCodesController();
