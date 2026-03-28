import { Request, Response } from 'express';
import { adminUsersService } from '../../services/admin/users.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAdmin } from '../../middleware/adminAuth';
import { parseBodyOrRespond } from '../../middleware/validation';
import { ApiResponse } from '../../types';
import { z } from 'zod';

// Validation schemas
const updateUserSchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  realName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  phone: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
});

const banUserSchema = z.object({
  reason: z.string().min(1, '需要填写封禁原因'),
  duration: z.number().min(0, '封禁天数必须大于等于 0'),
  note: z.string().optional(),
});

const unbanUserSchema = z.object({
  note: z.string().optional(),
});

const suspendUserSchema = z.object({
  reason: z.string().min(1, '需要填写冻结原因'),
  durationHours: z.number().min(1, '冻结小时数必须大于 0'),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, '密码至少 8 位'),
  sendEmail: z.boolean().optional(),
});

export class AdminUsersController {
  /**
   * GET /api/v1/admin/users
   * Get user list with pagination and filters
   */
  getUserList = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, role, status, keyword, email_verified, created_after, created_before, sort, order } =
      req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      role: role as string,
      status: status as string,
      keyword: keyword as string,
      emailVerified: email_verified === 'true' || email_verified === 'false' ? email_verified === 'true' : undefined,
      createdAfter: created_after as string,
      createdBefore: created_before as string,
      sort: sort as string,
      order: (order as 'asc' | 'desc') || 'desc',
    };

    const adminId = requireAdmin(req).id;
    const result = await adminUsersService.getUserList(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/users/:id
   * Get user by ID
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = requireAdmin(req).id;

    const result = await adminUsersService.getUserById(id.toString(), adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/users/:id
   * Update user
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(updateUserSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminUsersService.updateUser(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '用户信息已更新',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/users/:id/status
   * Update user status
   */
  updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const statusSchema = z.object({
      status: z.enum(['active', 'suspended', 'banned']),
      reason: z.string().optional(),
      note: z.string().optional(),
    });

    if (!parseBodyOrRespond(statusSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminUsersService.updateUserStatus(
      id.toString(),
      req.body.status,
      req.body.reason,
      req.body.note,
      adminId,
      adminEmail
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '用户状态已更新',
    };

    res.status(200).json(response);
  });

  /**
   * DELETE /api/v1/admin/users/:id
   * Delete user (soft delete)
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminUsersService.deleteUser(id.toString(), adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '用户已删除',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/users/:id/activity
   * Get user activity log
   */
  getUserActivity = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page, limit, action, created_after, created_before } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      action: action as string,
      createdAfter: created_after as string,
      createdBefore: created_before as string,
    };

    const adminId = requireAdmin(req).id;
    const result = await adminUsersService.getUserActivity(id.toString(), filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/users/:id/ban
   * Ban user
   */
  banUser = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(banUserSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminUsersService.banUser(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '用户已封禁',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/users/:id/unban
   * Unban user
   */
  unbanUser = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(unbanUserSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminUsersService.unbanUser(id.toString(), adminId, adminEmail, req.body.note);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '用户已解封',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/users/:id/suspend
   * Suspend user
   */
  suspendUser = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(suspendUserSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminUsersService.suspendUser(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '用户已冻结',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/users/:id/reset-password
   * Reset user password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(resetPasswordSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminUsersService.resetUserPassword(
      id.toString(),
      req.body.newPassword,
      req.body.sendEmail,
      adminId,
      adminEmail
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '密码已重置',
    };

    res.status(200).json(response);
  });
}

export const adminUsersController = new AdminUsersController();
