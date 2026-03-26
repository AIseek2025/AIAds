import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { verifyPassword, hashPassword, generateAdminTokens, verifyToken } from '../../utils/crypto';
import { ApiError } from '../../middleware/errorHandler';
import { cacheService } from '../../config/redis';
import { logAdminAction } from './audit.service';
import * as crypto from 'crypto';

// Admin login request type
export interface AdminLoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

// Admin auth response type
export interface AdminAuthResponse {
  admin: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

// Admin info response type
export interface AdminInfoResponse {
  admin: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string;
    status: string;
    lastLoginAt?: Date;
    lastLoginIp?: string;
  };
  role: {
    id: string;
    name: string;
    description?: string;
  };
  permissions: string[];
}

// MFA response type
export interface MfaResponse {
  secret: string;
  qrCodeUrl: string;
}

export class AdminAuthService {
  /**
   * Admin login
   */
  async login(data: AdminLoginRequest, ipAddress?: string): Promise<AdminAuthResponse> {
    // Find admin by email
    const admin = await prisma.admin.findUnique({
      where: { email: data.email },
      include: {
        adminRole: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });

    if (!admin) {
      throw new ApiError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    // Check admin status
    if (admin.status !== 'active') {
      throw new ApiError('管理员账号已被禁用', 403, 'ADMIN_INACTIVE');
    }

    // Verify password
    const isValidPassword = await verifyPassword(data.password, admin.passwordHash);

    if (!isValidPassword) {
      throw new ApiError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    // Check MFA if enabled
    if (admin.mfaEnabled) {
      if (!data.mfaCode) {
        throw new ApiError('需要 MFA 验证码', 403, 'MFA_REQUIRED');
      }

      // Verify MFA code
      const isValidMfa = this.verifyTotpCode(admin.mfaSecret!, data.mfaCode);
      if (!isValidMfa) {
        throw new ApiError('MFA 验证码不正确', 401, 'MFA_INVALID');
      }
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'login',
      resourceType: 'admin',
      requestMethod: 'POST',
      requestPath: '/api/v1/admin/auth/login',
      ipAddress,
      status: 'success',
    });

    logger.info('Admin logged in', { adminId: admin.id, email: admin.email });

    // Generate tokens
    const tokens = generateAdminTokens({
      sub: admin.id,
      email: admin.email,
      role: admin.adminRole.name,
      permissions: admin.adminRole.permissions as string[],
    });

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.adminRole.name,
        avatarUrl: admin.avatarUrl ?? undefined,
      },
      tokens: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
      },
    };
  }

  /**
   * Get current admin info
   */
  async getAdminInfo(adminId: string): Promise<AdminInfoResponse> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        adminRole: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
          },
        },
      },
    });

    if (!admin) {
      throw new ApiError('管理员不存在', 404, 'ADMIN_NOT_FOUND');
    }

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.adminRole.name,
        avatarUrl: admin.avatarUrl ?? undefined,
        status: admin.status,
        lastLoginAt: admin.lastLoginAt ?? undefined,
        lastLoginIp: admin.lastLoginIp ?? undefined,
      },
      role: {
        id: admin.adminRole.id,
        name: admin.adminRole.name,
        description: admin.adminRole.description ?? undefined,
      },
      permissions: admin.adminRole.permissions as string[],
    };
  }

  /**
   * Admin logout (add token to blacklist)
   */
  async logout(adminId: string, token?: string): Promise<void> {
    if (token) {
      try {
        const decoded = verifyToken(token, 'admin_access') as any;
        const jti = decoded.jti;

        // Calculate remaining time for token
        const expiresIn = decoded.exp ? decoded.exp * 1000 - Date.now() : 28800000;

        // Add to blacklist in Redis
        if (expiresIn > 0) {
          await cacheService.set(`admin_blacklist:${jti}`, '1', Math.ceil(expiresIn / 1000));
        }

        logger.info('Admin logged out', { adminId, jti });
      } catch (error) {
        logger.warn('Error adding admin token to blacklist', { error });
      }
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const decoded = verifyToken(refreshToken, 'admin_refresh') as any;

      // Check if token is blacklisted
      const isBlacklisted = await cacheService.get(`admin_blacklist:${decoded.jti}`);
      if (isBlacklisted) {
        throw new ApiError('Refresh Token 已失效', 401, 'TOKEN_INVALID');
      }

      // Find admin
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.sub },
        include: {
          adminRole: {
            select: {
              name: true,
              permissions: true,
            },
          },
        },
      });

      if (!admin || admin.status !== 'active') {
        throw new ApiError('管理员不存在或已被禁用', 401, 'ADMIN_INACTIVE');
      }

      // Generate new tokens
      const tokens = generateAdminTokens({
        sub: admin.id,
        email: admin.email,
        role: admin.adminRole.name,
        permissions: admin.adminRole.permissions as string[],
      });

      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
      };
    } catch (error) {
      throw new ApiError('Refresh Token 无效', 401, 'TOKEN_INVALID');
    }
  }

  /**
   * Change admin password
   */
  async changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<void> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new ApiError('管理员不存在', 404, 'ADMIN_NOT_FOUND');
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, admin.passwordHash);
    if (!isValidPassword) {
      throw new ApiError('当前密码不正确', 400, 'INVALID_PASSWORD');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail: admin.email,
      action: 'update',
      resourceType: 'admin_password',
      requestMethod: 'PUT',
      requestPath: '/api/v1/admin/auth/password',
      status: 'success',
    });

    logger.info('Admin password changed', { adminId });
  }

  /**
   * Reset admin password (super admin only)
   */
  async resetPassword(requestingAdminId: string, targetAdminId: string, newPassword: string): Promise<void> {
    const targetAdmin = await prisma.admin.findUnique({
      where: { id: targetAdminId },
    });

    if (!targetAdmin) {
      throw new ApiError('管理员不存在', 404, 'ADMIN_NOT_FOUND');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.admin.update({
      where: { id: targetAdminId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId: requestingAdminId,
      action: 'reset_password',
      resourceType: 'admin',
      resourceId: targetAdminId,
      resourceName: targetAdmin.email,
      requestMethod: 'POST',
      requestPath: '/api/v1/admin/auth/reset-password',
      status: 'success',
    });

    logger.info('Admin password reset', { targetAdminId, byAdminId: requestingAdminId });
  }

  /**
   * Generate MFA secret
   */
  async generateMfaSecret(adminId: string): Promise<MfaResponse> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new ApiError('管理员不存在', 404, 'ADMIN_NOT_FOUND');
    }

    // Generate secret
    const secret = crypto.randomBytes(32).toString('base64');
    const issuer = 'AIAds Admin';
    const algorithm = 'SHA1';
    const digits = 6;
    const period = 30;

    // Generate QR code URL
    const qrCodeUrl = `otpauth://totp/${issuer}:${admin.email}?secret=${secret}&issuer=${issuer}&algorithm=${algorithm}&digits=${digits}&period=${period}`;

    return {
      secret,
      qrCodeUrl,
    };
  }

  /**
   * Enable MFA
   */
  async enableMfa(adminId: string, secret: string, mfaCode: string): Promise<void> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new ApiError('管理员不存在', 404, 'ADMIN_NOT_FOUND');
    }

    // Verify code
    const isValid = this.verifyTotpCode(secret, mfaCode);
    if (!isValid) {
      throw new ApiError('MFA 验证码不正确', 400, 'MFA_INVALID');
    }

    // Enable MFA
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail: admin.email,
      action: 'enable_mfa',
      resourceType: 'admin',
      requestMethod: 'POST',
      requestPath: '/api/v1/admin/auth/mfa/enable',
      status: 'success',
    });

    logger.info('MFA enabled', { adminId });
  }

  /**
   * Verify MFA code
   */
  async verifyMfa(adminId: string, mfaCode: string): Promise<{ valid: boolean }> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new ApiError('管理员不存在', 404, 'ADMIN_NOT_FOUND');
    }

    if (!admin.mfaSecret) {
      throw new ApiError('MFA 未启用', 400, 'MFA_NOT_ENABLED');
    }

    const isValid = this.verifyTotpCode(admin.mfaSecret, mfaCode);

    return { valid: isValid };
  }

  /**
   * Disable MFA
   */
  async disableMfa(adminId: string, mfaCode: string): Promise<void> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new ApiError('管理员不存在', 404, 'ADMIN_NOT_FOUND');
    }

    if (!admin.mfaSecret) {
      throw new ApiError('MFA 未启用', 400, 'MFA_NOT_ENABLED');
    }

    // Verify code
    const isValid = this.verifyTotpCode(admin.mfaSecret, mfaCode);
    if (!isValid) {
      throw new ApiError('MFA 验证码不正确', 400, 'MFA_INVALID');
    }

    // Disable MFA
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail: admin.email,
      action: 'disable_mfa',
      resourceType: 'admin',
      requestMethod: 'POST',
      requestPath: '/api/v1/admin/auth/mfa/disable',
      status: 'success',
    });

    logger.info('MFA disabled', { adminId });
  }

  /**
   * Verify TOTP code
   */
  private verifyTotpCode(secret: string, code: string): boolean {
    try {
      // Generate current time-based code
      const timeStep = 30; // 30 seconds
      const epoch = Math.floor(Date.now() / 1000);
      const counterValue = Math.floor(epoch / timeStep);

      // Convert secret from base64
      const key = Buffer.from(secret, 'base64');

      // Create HMAC
      const buffer = Buffer.alloc(8);
      let counter = counterValue;
      for (let i = 0; i < 8; i++) {
        buffer[7 - i] = counter & 0xff;
        counter >>= 8;
      }

      const hmac = crypto.createHmac('sha1', key);
      hmac.update(buffer);
      const digest = hmac.digest();

      // Generate code
      const offset = digest[digest.length - 1] & 0x0f;
      const binary =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);

      const generatedCode = (binary % 1000000).toString().padStart(6, '0');

      return generatedCode === code;
    } catch (error) {
      logger.error('MFA verification error', { error });
      return false;
    }
  }
}

export const adminAuthService = new AdminAuthService();
