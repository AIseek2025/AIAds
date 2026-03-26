import prisma from '../config/database';
import { logger } from '../utils/logger';
import { errors } from '../middleware/errorHandler';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { UpdateUserRequest, UserResponse } from '../types';

export class UserService {
  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserResponse> {
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

    return this.formatUserResponse(user);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { email },
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

    return this.formatUserResponse(user);
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: UpdateUserRequest): Promise<UserResponse> {
    const updateData: any = {};

    if (data.nickname !== undefined) {
      updateData.nickname = data.nickname;
    }
    if (data.avatar_url !== undefined) {
      updateData.avatarUrl = data.avatar_url;
    }
    if (data.language !== undefined) {
      updateData.language = data.language;
    }
    if (data.timezone !== undefined) {
      updateData.timezone = data.timezone;
    }
    if (data.currency !== undefined) {
      updateData.currency = data.currency;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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

    logger.info('User updated', { userId });

    return this.formatUserResponse(user);
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw errors.notFound('用户不存在');
    }

    // Soft delete
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
      },
    });

    logger.info('User deleted', { userId });
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw errors.notFound('用户不存在');
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw errors.badRequest('当前密码不正确');
    }

    // Hash new password
    const newHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        failedLoginAttempts: 0,
      },
    });

    logger.info('Password changed', { userId });
  }

  /**
   * Verify user email
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
   * Verify user phone
   */
  async verifyPhone(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
      },
    });

    logger.info('Phone verified', { userId });
  }

  /**
   * Suspend user
   */
  async suspendUser(userId: string, reason?: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw errors.notFound('用户不存在');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'suspended',
        lockedUntil: new Date(),
      },
    });

    logger.info('User suspended', { userId, reason });
  }

  /**
   * Activate user
   */
  async activateUser(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw errors.notFound('用户不存在');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'active',
        lockedUntil: null,
      },
    });

    logger.info('User activated', { userId });
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
      phone_verified: user.phoneVerified,
      language: user.language,
      timezone: user.timezone,
      currency: user.currency,
      last_login_at: user.lastLoginAt?.toISOString(),
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };
  }
}

export const userService = new UserService();
