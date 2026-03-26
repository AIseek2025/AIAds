import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler, errors } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import { registerSchema, loginSchema, refreshTokenSchema, verificationCodeSchema, changePasswordSchema } from '../utils/validator';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { getClientIP } from '../utils/helpers';
import { maskEmail, maskPhone, maskRealName } from '../utils/mask';
import prisma from '../config/database';
import { ApiResponse } from '../types';

export class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register a new user
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    validateBody(registerSchema)(req, res, () => {});

    const result = await authService.register(req.body);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '注册成功',
    };

    res.status(201).json(response);
  });

  /**
   * POST /api/v1/auth/login
   * Login user
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    validateBody(loginSchema)(req, res, () => {});

    const result = await authService.login(req.body);

    // Update last login IP
    try {
      await prisma.user.update({
        where: { id: result.user.id },
        data: { lastLoginIp: getClientIP(req) },
      });
    } catch (error) {
      // Ignore errors
    }

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '登录成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    validateBody(refreshTokenSchema)(req, res, () => {});

    const result = await authService.refreshToken(req.body.refresh_token);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/auth/logout
   * Logout user
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const token = req.headers.authorization?.split(' ')[1];

    if (userId) {
      await authService.logout(userId, token);
    }

    const response: ApiResponse = {
      success: true,
      message: '登出成功',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/auth/me
   * Get current user info
   */
  me = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        nickname: true,
        avatarUrl: true,
        realName: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        language: true,
        timezone: true,
        currency: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw errors.notFound('用户不存在');
    }

    // Apply masking to sensitive data
    const response: ApiResponse = {
      success: true,
      data: {
        id: user.id,
        email: maskEmail(user.email),
        phone: user.phone ? maskPhone(user.phone) : null,
        nickname: user.nickname,
        avatar_url: user.avatarUrl,
        real_name: user.realName ? maskRealName(user.realName) : null,
        role: user.role,
        status: user.status,
        email_verified: user.emailVerified,
        phone_verified: user.phoneVerified,
        language: user.language,
        timezone: user.timezone,
        currency: user.currency,
        last_login_at: user.lastLoginAt?.toISOString(),
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      },
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/auth/verification-code
   * Send verification code
   */
  sendVerificationCode = asyncHandler(async (req: Request, res: Response) => {
    validateBody(verificationCodeSchema)(req, res, () => {});

    const { type, target, purpose } = req.body;

    await authService.sendVerificationCode(type, target, purpose || 'register');

    const response: ApiResponse = {
      success: true,
      message: '验证码已发送',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/auth/verify-code
   * Verify verification code
   */
  verifyCode = asyncHandler(async (req: Request, res: Response) => {
    validateBody(verificationCodeSchema)(req, res, () => {});

    const { type, target, code } = req.body;
    const purpose = req.body.purpose || 'verify';

    await authService.verifyCode(type, target, code, purpose);

    const response: ApiResponse = {
      success: true,
      message: '验证成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/auth/reset-password
   * Reset password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const schema = verificationCodeSchema.extend({
      new_password: registerSchema.shape.password,
    });

    validateBody(schema)(req, res, () => {});

    const { target, code, new_password } = req.body;

    await authService.resetPassword(target, code, new_password);

    const response: ApiResponse = {
      success: true,
      message: '密码重置成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/auth/change-password
   * Change password (requires auth)
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    validateBody(changePasswordSchema)(req, res, () => {});

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { current_password, new_password } = req.body;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw errors.notFound('用户不存在');
    }

    // Verify current password
    const isValid = await verifyPassword(current_password, user.passwordHash);
    if (!isValid) {
      throw errors.badRequest('当前密码不正确');
    }

    // Hash new password
    const newHash = await hashPassword(new_password);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    const response: ApiResponse = {
      success: true,
      message: '密码修改成功',
    };

    res.status(200).json(response);
  });
}

export const authController = new AuthController();
