import { Request, Response } from 'express';
import { adminAuthService } from '../../services/admin/auth.service';
import { asyncHandler, errors } from '../../middleware/errorHandler';
import { parseBodyOrRespond } from '../../middleware/validation';
import { ApiResponse } from '../../types';
import { getClientIP } from '../../utils/helpers';
import { z } from 'zod';

// Validation schemas
const adminLoginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(8, '密码至少 8 位'),
  mfaCode: z.string().length(6, 'MFA 验证码为 6 位数字').optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, '当前密码至少 8 位'),
  newPassword: z
    .string()
    .min(8, '新密码至少 8 位')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, '密码必须包含大小写字母和数字'),
});

const resetPasswordSchema = z.object({
  adminId: z.string().uuid('管理员 ID 格式不正确'),
  newPassword: z.string().min(8, '密码至少 8 位'),
});

const enableMfaSchema = z.object({
  mfaCode: z.string().length(6, 'MFA 验证码为 6 位数字'),
});

const verifyMfaSchema = z.object({
  mfaCode: z.string().length(6, 'MFA 验证码为 6 位数字'),
});

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, '需要提供 Refresh Token'),
});

export class AdminAuthController {
  /**
   * POST /api/v1/admin/auth/login
   * Admin login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(adminLoginSchema, req, res)) {
      return;
    }

    const result = await adminAuthService.login(req.body, getClientIP(req));

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '登录成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/auth/logout
   * Admin logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.admin?.id;
    const token = req.headers.authorization?.split(' ')[1];

    if (adminId) {
      await adminAuthService.logout(adminId, token);
    }

    const response: ApiResponse = {
      success: true,
      message: '登出成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/auth/refresh
   * Refresh access token
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(refreshTokenSchema, req, res)) {
      return;
    }

    const result = await adminAuthService.refreshToken(req.body.refresh_token);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/auth/me
   * Get current admin info
   */
  me = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.admin?.id;

    if (!adminId) {
      throw errors.unauthorized('未授权');
    }

    const result = await adminAuthService.getAdminInfo(adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/auth/password
   * Change admin password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(changePasswordSchema, req, res)) {
      return;
    }

    const adminId = req.admin?.id;

    if (!adminId) {
      throw errors.unauthorized('未授权');
    }

    await adminAuthService.changePassword(adminId, req.body.currentPassword, req.body.newPassword);

    const response: ApiResponse = {
      success: true,
      message: '密码修改成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/auth/reset-password
   * Reset admin password (super admin only)
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(resetPasswordSchema, req, res)) {
      return;
    }

    const adminId = req.admin?.id;

    if (!adminId) {
      throw errors.unauthorized('未授权');
    }

    await adminAuthService.resetPassword(adminId, req.body.adminId, req.body.newPassword);

    const response: ApiResponse = {
      success: true,
      message: '密码重置成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/auth/mfa/enable
   * Enable MFA for admin
   */
  enableMfa = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(enableMfaSchema, req, res)) {
      return;
    }

    const adminId = req.admin?.id;

    if (!adminId) {
      throw errors.unauthorized('未授权');
    }

    // First, generate MFA secret if not exists
    const mfaSecret = await adminAuthService.generateMfaSecret(adminId);

    // Then verify the code and enable (extract secret from the response object)
    const result = await adminAuthService.enableMfa(adminId, mfaSecret.secret, req.body.mfaCode);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'MFA 已启用',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/auth/mfa/generate
   * Generate MFA secret and QR code
   */
  generateMfa = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.admin?.id;

    if (!adminId) {
      throw errors.unauthorized('未授权');
    }

    const result = await adminAuthService.generateMfaSecret(adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/auth/mfa/verify
   * Verify MFA code
   */
  verifyMfa = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(verifyMfaSchema, req, res)) {
      return;
    }

    const adminId = req.admin?.id;

    if (!adminId) {
      throw errors.unauthorized('未授权');
    }

    const result = await adminAuthService.verifyMfa(adminId, req.body.mfaCode);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/auth/mfa/disable
   * Disable MFA for admin
   */
  disableMfa = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(verifyMfaSchema, req, res)) {
      return;
    }

    const adminId = req.admin?.id;

    if (!adminId) {
      throw errors.unauthorized('未授权');
    }

    await adminAuthService.disableMfa(adminId, req.body.mfaCode);

    const response: ApiResponse = {
      success: true,
      message: 'MFA 已禁用',
    };

    res.status(200).json(response);
  });
}

export const adminAuthController = new AdminAuthController();
