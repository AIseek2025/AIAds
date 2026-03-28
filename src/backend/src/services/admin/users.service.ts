import { Prisma, UserRole, UserStatus } from '@prisma/client';
import type { PaginationResponse } from '../../types';
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

/** 合并用户 metadata（Json），避免 `as any` */
function mergeUserMetadata(existing: Prisma.JsonValue, patch: Record<string, unknown>): Prisma.InputJsonValue {
  const base =
    existing !== null && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...patch } as Prisma.InputJsonValue;
}

/** 与列表/详情查询 include 兼容的格式化入参（嵌套字段可多可少） */
type UserForFormat = {
  id: string;
  email: string;
  phone: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  realName: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
  advertiser: {
    id: string;
    companyName: string;
    walletBalance: Prisma.Decimal;
    totalSpent: Prisma.Decimal;
  } | null;
  kol: {
    id: string;
    platform: string;
    platformUsername: string;
    followers: number;
    status: string;
  } | null;
};

/** 用户详情页「活动/审计」列表单行（针对该用户的 resource 审计） */
export type UserActivityLogItem = {
  id: string;
  adminEmail: string;
  adminName: string;
  action: string;
  requestMethod: string;
  requestPath: string;
  ipAddress: string | null;
  status: string;
  createdAt: Date;
};

export class AdminUsersService {
  /**
   * Get user list with pagination and filters
   */
  async getUserList(filters: UserListFilters, adminId: string): Promise<PaginationResponse<UserResponse>> {
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
    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role as UserRole;
    }

    if (status) {
      where.status = status as UserStatus;
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
      const createdAt: Prisma.DateTimeFilter = {};
      if (createdAfter) {
        createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        createdAt.lte = new Date(createdBefore);
      }
      where.createdAt = createdAt;
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { [sort]: order } as Prisma.UserOrderByWithRelationInput,
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
  async updateUser(
    userId: string,
    data: UpdateUserRequest,
    adminId: string,
    adminEmail: string
  ): Promise<{ id: string; email: string; updatedAt: Date }> {
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
  ): Promise<{ id: string; status: string; updatedAt: Date }> {
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
        status: status as UserStatus,
        metadata: mergeUserMetadata(user.metadata, {
          statusUpdatedAt: new Date().toISOString(),
          statusChangedBy: adminId,
          statusReason: reason,
          statusNote: note,
        }),
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
  async deleteUser(userId: string, adminId: string, adminEmail: string): Promise<{ id: string; deletedAt: Date }> {
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
  async getUserActivity(
    userId: string,
    filters: UserActivityFilters,
    _adminId: string
  ): Promise<PaginationResponse<UserActivityLogItem>> {
    const { page = 1, limit = 20, action, createdAfter, createdBefore } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    // 与该用户相关的审计记录（任意管理员对该 user 资源的操作），不按「当前查看者」过滤
    const where: Prisma.AdminAuditLogWhereInput = {
      resourceType: 'user',
      resourceId: userId,
    };

    if (action) {
      where.action = action;
    }

    if (createdAfter || createdBefore) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (createdAfter) {
        createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        createdAt.lte = new Date(createdBefore);
      }
      where.createdAt = createdAt;
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
  async banUser(
    userId: string,
    data: BanUserRequest,
    adminId: string,
    adminEmail: string
  ): Promise<{
    id: string;
    status: string;
    bannedAt: Date;
    bannedUntil: Date | null;
    banReason: string;
  }> {
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
    const bannedUntil = data.duration > 0 ? new Date(Date.now() + data.duration * 24 * 60 * 60 * 1000) : null;

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'suspended',
        metadata: mergeUserMetadata(user.metadata, {
          bannedAt: new Date().toISOString(),
          bannedUntil: bannedUntil?.toISOString(),
          banReason: data.reason,
          bannedBy: adminId,
          banNote: data.note,
        }),
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
  async unbanUser(
    userId: string,
    adminId: string,
    adminEmail: string,
    note?: string
  ): Promise<{ id: string; status: string; unbannedAt: Date }> {
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
        metadata: mergeUserMetadata(user.metadata, {
          unbannedAt: new Date().toISOString(),
          unbannedBy: adminId,
          unbanNote: note,
        }),
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
  async suspendUser(
    userId: string,
    data: SuspendUserRequest,
    adminId: string,
    adminEmail: string
  ): Promise<{
    id: string;
    status: string;
    suspendedAt: Date;
    suspendedUntil: Date;
    suspendReason: string;
  }> {
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
        metadata: mergeUserMetadata(user.metadata, {
          suspendedAt: new Date().toISOString(),
          suspendedUntil: suspendedUntil.toISOString(),
          suspendReason: data.reason,
          suspendedBy: adminId,
        }),
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
  ): Promise<{ id: string; passwordReset: boolean; emailSent: boolean }> {
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
  private formatUserResponse(user: UserForFormat): UserResponse {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone ?? undefined,
      nickname: user.nickname ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      realName: user.realName ?? undefined,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      lastLoginAt: user.lastLoginAt ?? undefined,
      lastLoginIp: user.lastLoginIp ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      advertiser: user.advertiser
        ? {
            id: user.advertiser.id,
            companyName: user.advertiser.companyName,
            walletBalance: Number(user.advertiser.walletBalance),
            totalSpent: Number(user.advertiser.totalSpent),
          }
        : null,
      kol: user.kol
        ? {
            id: user.kol.id,
            platform: user.kol.platform,
            platformUsername: user.kol.platformUsername,
            followers: user.kol.followers,
            status: user.kol.status,
          }
        : null,
    };
  }
}

export const adminUsersService = new AdminUsersService();
