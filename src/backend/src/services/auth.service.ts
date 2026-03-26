import prisma from '../config/database';
import { logger } from '../utils/logger';
import { hashPassword, verifyPassword, generateTokens, verifyToken, generateVerificationCode, TokenPair } from '../utils/crypto';
import { ApiError } from '../middleware/errorHandler';
import { RegisterRequest, LoginRequest, AuthResponse, UserResponse, TokenResponse } from '../types';
import { cacheService } from '../config/redis';
import { isAccountLocked, recordLoginFailure, resetLoginFailures } from './accountLock.service';
import { rotateRefreshToken, storeRefreshToken, validateRefreshToken } from './tokenRotation.service';
import { isMFARequired } from './mfa.service';

// Helper function to convert TokenPair to TokenResponse
function toTokenResponse(tokens: TokenPair): TokenResponse {
  return {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_in: tokens.expiresIn,
  };
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ApiError('邮箱已被注册', 409, 'EMAIL_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        nickname: data.nickname,
        role: data.role || 'advertiser',
        status: 'pending',
      },
      select: {
        id: true,
        email: true,
        phone: true,
        nickname: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    logger.info('User registered', { userId: user.id, email: user.email });

    // Generate tokens
    const tokens = generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: this.formatUserResponse(user),
      tokens: toTokenResponse(tokens),
    };
  }

  /**
   * Login user
   */
  async login(data: LoginRequest, ipAddress?: string): Promise<AuthResponse & { requiresMFA?: boolean }> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new ApiError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    // Check if user is deleted
    if (user.status === 'deleted') {
      throw new ApiError('用户已被删除', 401, 'USER_DELETED');
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      throw new ApiError('用户已被暂停', 403, 'USER_SUSPENDED');
    }

    // M02: Check if account is locked
    const locked = await isAccountLocked(user.id);
    if (locked) {
      logger.warn('Login attempt on locked account', { userId: user.id, email: user.email });
      throw new ApiError('账户已锁定，请 15 分钟后再试', 403, 'ACCOUNT_LOCKED');
    }

    // Verify password
    const isValidPassword = await verifyPassword(data.password, user.passwordHash);

    if (!isValidPassword) {
      // M02: Record failed login attempt
      await recordLoginFailure(user.id);
      
      // Also increment failed login attempts in database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: { increment: 1 },
        },
      });

      throw new ApiError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    // M02: Reset login failures on successful login
    await resetLoginFailures(user.id);

    // Reset failed login attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // M07: Check if MFA is required
    const requiresMFA = await isMFARequired(user.id);
    if (requiresMFA) {
      logger.info('MFA required for login', { userId: user.id });
      // Return partial response indicating MFA is needed
      return {
        user: this.formatUserResponse(user),
        tokens: { access_token: '', refresh_token: '', expires_in: 0 },
        requiresMFA: true,
      } as AuthResponse & { requiresMFA: boolean };
    }

    logger.info('User logged in', { userId: user.id, email: user.email });

    // Generate tokens
    const tokens = generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // M03: Store refresh token for rotation tracking
    await storeRefreshToken(tokens.refreshToken, user.id);

    return {
      user: this.formatUserResponse(user),
      tokens: toTokenResponse(tokens),
      requiresMFA: false,
    } as AuthResponse & { requiresMFA: boolean };
  }

  /**
   * Refresh access token with token rotation (M03)
   */
  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    try {
      // M03: Validate refresh token before JWT verification
      await validateRefreshToken(refreshToken);
      
      // Verify JWT refresh token
      const payload = verifyToken(refreshToken, 'refresh');

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      });

      if (!user) {
        throw new ApiError('用户不存在', 401, 'USER_NOT_FOUND');
      }

      if (user.status === 'deleted' || user.status === 'suspended') {
        throw new ApiError('用户状态异常', 401, 'USER_INVALID');
      }

      // Generate new tokens
      const tokens = generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      // M03: Rotate refresh token
      const newRefreshToken = await rotateRefreshToken(refreshToken, user.id);
      
      logger.info('Token refreshed with rotation', { userId: user.id });

      return {
        access_token: tokens.accessToken,
        refresh_token: newRefreshToken,
        expires_in: tokens.expiresIn,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('reuse detected')) {
        throw new ApiError('Refresh Token 已使用，请重新登录', 401, 'TOKEN_REUSE_DETECTED');
      }
      throw new ApiError('Refresh Token 无效', 401, 'TOKEN_INVALID');
    }
  }

  /**
   * Logout user (add token to blacklist)
   */
  async logout(userId: string, token?: string): Promise<void> {
    if (token) {
      // Extract token ID and add to blacklist
      try {
        const decoded = verifyToken(token, 'access');
        const jti = decoded.jti;

        // Calculate remaining time for token
        const expiresIn = decoded.exp ? decoded.exp * 1000 - Date.now() : 3600000;

        // Add to blacklist in Redis
        if (expiresIn > 0) {
          await cacheService.set(`blacklist:${jti}`, '1', Math.ceil(expiresIn / 1000));
        }

        logger.info('User logged out', { userId, jti });
      } catch (error) {
        logger.warn('Error adding token to blacklist', { error });
      }
    }
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(type: 'email' | 'phone', target: string, purpose: string): Promise<void> {
    // Generate verification code
    const code = generateVerificationCode();
    const codeHash = Buffer.from(code).toString('base64');

    // Store in Redis with 5 minute expiry
    const key = `verification:${type}:${target}:${purpose}`;
    await cacheService.set(key, codeHash, 300);

    logger.info('Verification code sent', { type, target, purpose, code: '******' });

    // In a real implementation, send email/SMS here
    // Note: Never log the actual verification code in production
    logger.debug('Verification code generated (DEV only)', { code: '******' });
  }

  /**
   * Verify verification code
   */
  async verifyCode(type: 'email' | 'phone', target: string, code: string, purpose: string): Promise<boolean> {
    const key = `verification:${type}:${target}:${purpose}`;
    const storedCodeHash = await cacheService.get<string>(key);

    if (!storedCodeHash) {
      throw new ApiError('验证码已过期', 400, 'CODE_EXPIRED');
    }

    const storedCode = Buffer.from(storedCodeHash, 'base64').toString();
    if (storedCode !== code) {
      throw new ApiError('验证码不正确', 400, 'CODE_INVALID');
    }

    // Delete used code
    await cacheService.delete(key);

    return true;
  }

  /**
   * Verify email
   */
  async verifyEmail(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    logger.info('Email verified', { userId });
  }

  /**
   * Reset password
   */
  async resetPassword(email: string, verificationCode: string, newPassword: string): Promise<void> {
    // Verify code
    await this.verifyCode('email', email, verificationCode, 'reset_password');

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ApiError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
      },
    });

    logger.info('Password reset', { userId: user.id });
  }

  /**
   * Format user response
   */
  private formatUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      avatar_url: user.avatarUrl,
      real_name: user.realName,
      role: user.role,
      status: user.status,
      email_verified: user.emailVerified,
      phone_verified: user.phoneVerified || false,
      language: user.language || 'zh-CN',
      timezone: user.timezone || 'Asia/Shanghai',
      currency: user.currency || 'CNY',
      last_login_at: user.lastLoginAt?.toISOString(),
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };
  }
}

export const authService = new AuthService();
