import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { ApiError } from '../../middleware/errorHandler';
import { logAdminAction } from '../../services/admin/audit.service';
import { hashPassword } from '../../utils/crypto';

// User list filters
export interface UserListFilters {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  keyword?: string;
  emailVerified?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Update user request
export interface UpdateUserRequest {
  nickname?: string;
  realName?: string;
  avatarUrl?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  language?: string;
  timezone?: string;
}

// Ban user request
export interface BanUserRequest {
  reason: string;
  duration: number;
  note?: string;
}

// Suspend user request
export interface SuspendUserRequest {
  reason: string;
  durationHours: number;
}

// User activity filters
export interface UserActivityFilters {
  page?: number;
  limit?: number;
  action?: string;
  createdAfter?: string;
  createdBefore?: string;
}

// User response type
export interface UserResponse {
  id: string;
  email: string;
  phone?: string;
  nickname?: string;
  avatarUrl?: string;
  realName?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
  advertiser?: {
    id: string;
    companyName: string;
    walletBalance: number;
    totalSpent: number;
  } | null;
  kol?: {
    id: string;
    platform: string;
    platformUsername: string;
    followers: number;
    status: string;
  } | null;
}

export class AdminUsersService {
  /**
   * Get user list with pagination and filters
   */
  async getUserList(filters: UserListFilters, adminId: string) {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      keyword,
      emailVerified,
      createdAfter,
      createdBefore,
      sort = 'createdAt',
      order = 'desc',
    } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        { email: { contains: keyword } },
        { nickname: { contains: keyword } },
        { phone: { contains: keyword } },
        { realName: { contains: keyword } },
      ];
    }

    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified;
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) {
        where.createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        where.createdAt.lte = new Date(createdBefore);
      }
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { [sort]: order },
      include: {
        advertiser: {
          select: {
            id: true,
            companyName: true,
            walletBalance: true,
            totalSpent: true,
          },
        },
        kol: {
          select: {
            id: true,
            platform: true,
            platformUsername: true,
            followers: true,
            status: true,
          },
        },
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'user',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/users',
      status: 'success',
    });

    return {
      items: users.map((user) => this.formatUserResponse(user)),
      pagination: {
        page,
        page_size: limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string, adminId: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        advertiser: {
          select: {
            id: true,
            companyName: true,
            walletBalance: true,
            totalSpent: true,
            verificationStatus: true,
          },
        },
        kol: {
          select: {
            id: true,
            platform: true,
            platformUsername: true,
            followers: true,
            status: true,
            totalEarnings: true,
            availableBalance: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'user',
      resourceId: userId,
      resourceName: user.email,
      requestMethod: 'GET',
      requestPath: `/api/v1/admin/users/${userId}`,
      status: 'success',
    });

    return this.formatUserResponse(user);
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: UpdateUserRequest, adminId: string, adminEmail: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'update',
      resourceType: 'user',
      resourceId: userId,
      resourceName: user.email,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/users/${userId}`,
      requestBody: data,
      newValues: data,
      status: 'success',
    });

    logger.info('User updated', { userId, adminId });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * Update user status
   */
  async updateUserStatus(
    userId: string,
    status: string,
    reason?: string,
    note?: string,
    adminId?: string,
    adminEmail?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // Update user status (cast to UserStatus enum)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: status as any,
        metadata: {
          ...(user.metadata as any) || {},
          statusUpdatedAt: new Date().toISOString(),
          statusChangedBy: adminId,
          statusReason: reason,
          statusNote: note,
        },
      },
    });

    // Log admin action
    await logAdminAction({
      adminId: adminId || 'system',
      adminEmail: adminEmail || 'system',
      action: 'update_status',
      resourceType: 'user',
      resourceId: userId,
      resourceName: user.email,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/users/${userId}/status`,
      newValues: { status, reason },
      status: 'success',
    });

    logger.info('User status updated', { userId, status, adminId });

    return {
      id: updatedUser.id,
      status: updatedUser.status,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string, adminId: string, adminEmail: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // Soft delete user
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'delete',
      resourceType: 'user',
      resourceId: userId,
      resourceName: user.email,
      requestMethod: 'DELETE',
      requestPath: `/api/v1/admin/users/${userId}`,
      status: 'success',
    });

    logger.info('User deleted', { userId, adminId });

    return {
      id: userId,
      deletedAt: new Date(),
    };
  }

  /**
   * Get user activity log
   */
  async getUserActivity(userId: string, filters: UserActivityFilters, adminId: string) {
    const {
      page = 1,
      limit = 20,
      action,
      createdAfter,
      createdBefore,
    } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: any = {
      adminId,
      resourceType: 'user',
      resourceId: userId,
    };

    if (action) {
      where.action = action;
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) {
        where.createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        where.createdAt.lte = new Date(createdBefore);
      }
    }

    // Get total count
    const total = await prisma.adminAuditLog.count({ where });

    // Get logs
    const logs = await prisma.adminAuditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        adminEmail: true,
        adminName: true,
        action: true,
        requestMethod: true,
        requestPath: true,
        ipAddress: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      items: logs,
      pagination: {
        page,
        page_size: limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Ban user
   */
  async banUser(userId: string, data: BanUserRequest, adminId: string, adminEmail: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    if (user.status === 'banned') {
      throw new ApiError('用户已被封禁', 400, 'USER_ALREADY_BANNED');
    }

    // Calculate ban until date
    const bannedUntil = data.duration > 0
      ? new Date(Date.now() + data.duration * 24 * 60 * 60 * 1000)
      : null;

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'suspended',
        metadata: {
          bannedAt: new Date().toISOString(),
          bannedUntil: bannedUntil?.toISOString(),
          banReason: data.reason,
          bannedBy: adminId,
          banNote: data.note,
        },
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'ban',
      resourceType: 'user',
      resourceId: userId,
      resourceName: user.email,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/users/${userId}/ban`,
      requestBody: data,
      newValues: { status: 'suspended', banReason: data.reason },
      status: 'success',
    });

    logger.info('User banned', { userId, adminId, reason: data.reason });

    return {
      id: updatedUser.id,
      status: updatedUser.status,
      bannedAt: new Date(),
      bannedUntil,
      banReason: data.reason,
    };
  }

  /**
   * Unban user
   */
  async unbanUser(userId: string, adminId: string, adminEmail: string, note?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    if (user.status !== 'suspended') {
      throw new ApiError('用户未被封禁', 400, 'USER_NOT_BANNED');
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'active',
        metadata: {
          ...(user.metadata as any) || {},
          unbannedAt: new Date().toISOString(),
          unbannedBy: adminId,
          unbanNote: note,
        },
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'unban',
      resourceType: 'user',
      resourceId: userId,
      resourceName: user.email,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/users/${userId}/unban`,
      newValues: { status: 'active' },
      status: 'success',
    });

    logger.info('User unbanned', { userId, adminId });

    return {
      id: updatedUser.id,
      status: updatedUser.status,
      unbannedAt: new Date(),
    };
  }

  /**
   * Suspend user
   */
  async suspendUser(userId: string, data: SuspendUserRequest, adminId: string, adminEmail: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // Calculate suspend until date
    const suspendedUntil = new Date(Date.now() + data.durationHours * 60 * 60 * 1000);

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'suspended',
        metadata: {
          ...(user.metadata as any) || {},
          suspendedAt: new Date().toISOString(),
          suspendedUntil: suspendedUntil.toISOString(),
          suspendReason: data.reason,
          suspendedBy: adminId,
        },
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'suspend',
      resourceType: 'user',
      resourceId: userId,
      resourceName: user.email,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/users/${userId}/suspend`,
      requestBody: data,
      newValues: { status: 'suspended', suspendReason: data.reason },
      status: 'success',
    });

    logger.info('User suspended', { userId, adminId, reason: data.reason });

    return {
      id: updatedUser.id,
      status: updatedUser.status,
      suspendedAt: new Date(),
      suspendedUntil,
      suspendReason: data.reason,
    };
  }

  /**
   * Reset user password
   */
  async resetUserPassword(
    userId: string,
    newPassword: string,
    sendEmail: boolean = false,
    adminId: string,
    adminEmail: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'reset_password',
      resourceType: 'user',
      resourceId: userId,
      resourceName: user.email,
      requestMethod: 'POST',
      requestPath: `/api/v1/admin/users/${userId}/reset-password`,
      newValues: { passwordReset: true, sendEmail },
      status: 'success',
    });

    logger.info('User password reset', { userId, adminId, sendEmail });

    return {
      id: userId,
      passwordReset: true,
      emailSent: sendEmail, // In production, implement email sending
    };
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
      avatarUrl: user.avatarUrl,
      realName: user.realName,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      advertiser: user.advertiser ? {
        id: user.advertiser.id,
        companyName: user.advertiser.companyName,
        walletBalance: Number(user.advertiser.walletBalance),
        totalSpent: Number(user.advertiser.totalSpent),
      } : null,
      kol: user.kol ? {
        id: user.kol.id,
        platform: user.kol.platform,
        platformUsername: user.kol.platformUsername,
        followers: user.kol.followers,
        status: user.kol.status,
      } : null,
    };
  }
}

export const adminUsersService = new AdminUsersService();
