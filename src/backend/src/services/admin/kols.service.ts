import { KolPlatform, KolStatus, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { sumFrozenAmountForKol, sumFrozenAmountForKols } from '../order-frozen.util';
import { logger } from '../../utils/logger';
import { ApiError } from '../../middleware/errorHandler';
import { logAdminAction } from './audit.service';
import type { PaginationResponse } from '../../types';

function mergeKolMetadata(
  current: Prisma.JsonValue,
  patch: Record<string, Prisma.InputJsonValue>
): Prisma.InputJsonValue {
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, Prisma.InputJsonValue>) }
      : {};
  return { ...base, ...patch };
}

type KolWithUser = Prisma.KolGetPayload<{
  include: {
    user: { select: { email: true; nickname: true } };
  };
}>;

// KOL list filters
export interface KolListFilters {
  page?: number;
  limit?: number;
  status?: string;
  platform?: string;
  category?: string;
  minFollowers?: number;
  maxFollowers?: number;
  verified?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Approve KOL request
export interface ApproveKolRequest {
  note?: string;
  setVerified?: boolean;
}

// Reject KOL request
export interface RejectKolRequest {
  reason: string;
  note?: string;
}

// KOL response type
export interface KolResponse {
  id: string;
  userId: string;
  platform: string;
  platformId: string;
  platformUsername: string;
  platformDisplayName?: string;
  platformAvatarUrl?: string;
  bio?: string;
  category?: string;
  subcategory?: string;
  country?: string;
  followers: number;
  following: number;
  totalVideos: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  status: string;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  basePrice?: number;
  currency: string;
  totalEarnings: number;
  availableBalance: number;
  /** 该 KOL 全部合作订单 frozen_amount 合计（与 KOL 端 /kols/balance 的 orders_frozen_total 同源） */
  ordersFrozenTotal: number;
  totalOrders: number;
  completedOrders: number;
  tags: string[];
  user?: {
    email: string;
    nickname?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  statsHistory?: Array<{
    date: Date;
    followers: number;
    engagementRate: number;
  }>;
}

export type ApproveKolResult = {
  id: string;
  status: string;
  verified: boolean;
  verifiedAt: Date | null;
  verifiedBy: string;
};

export type RejectKolResult = {
  id: string;
  status: string;
  rejectedAt: Date;
  rejectedBy: string;
  rejectionReason: string;
};

export type RateKolResult = {
  id: string;
  rating: string;
  ratedAt: Date;
  ratedBy: string;
};

export type BlacklistKolResult = {
  id: string;
  status: string;
  blacklistedAt: Date;
  blacklistedBy: string;
  blacklistReason: string;
};

export type RemoveFromBlacklistResult = {
  id: string;
  status: string;
  removedFromBlacklistAt: Date;
  removedBy: string;
};

export type SuspendKolResult = {
  id: string;
  status: string;
  suspendedAt: Date;
  suspendedBy: string;
  suspensionReason: string;
  suspendedUntil: Date | null;
};

export type UnsuspendKolResult = {
  id: string;
  status: string;
  unsuspendedAt: Date;
  unsuspendedBy: string;
};

export type SyncKolDataResult = {
  id: string;
  syncedAt: Date;
  syncedBy: string;
};

export class AdminKolsService {
  /**
   * Get pending KOLs for review
   */
  async getPendingKols(
    filters: { page?: number; limit?: number; platform?: string },
    adminId: string
  ): Promise<PaginationResponse<KolResponse>> {
    const { page = 1, limit = 20, platform } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.KolWhereInput = {
      status: KolStatus.pending,
    };

    if (platform) {
      where.platform = platform as KolPlatform;
    }

    const [total, kols] = await Promise.all([
      prisma.kol.count({ where }),
      prisma.kol.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              nickname: true,
            },
          },
        },
      }),
    ]);

    const frozenByKol = await sumFrozenAmountForKols(kols.map((k) => k.id));

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'kol',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/kols/pending',
      status: 'success',
    });

    return {
      items: kols.map((kol) => this.formatKolResponse(kol, frozenByKol.get(kol.id) ?? 0)),
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
   * Get KOL list with filters
   */
  async getKolList(filters: KolListFilters, _adminId: string): Promise<PaginationResponse<KolResponse>> {
    const {
      page = 1,
      limit = 20,
      status,
      platform,
      category,
      minFollowers,
      maxFollowers,
      verified,
      sort = 'createdAt',
      order = 'desc',
    } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.KolWhereInput = {};

    if (status) {
      where.status = status as KolStatus;
    }

    if (platform) {
      where.platform = platform as KolPlatform;
    }

    if (category) {
      where.category = category;
    }

    if (minFollowers !== undefined || maxFollowers !== undefined) {
      const followers: Prisma.IntFilter = {};
      if (minFollowers !== undefined) {
        followers.gte = minFollowers;
      }
      if (maxFollowers !== undefined) {
        followers.lte = maxFollowers;
      }
      where.followers = followers;
    }

    if (verified !== undefined) {
      where.verified = verified;
    }

    const [total, kols] = await Promise.all([
      prisma.kol.count({ where }),
      prisma.kol.findMany({
        where,
        skip,
        take,
        orderBy: { [sort]: order },
        include: {
          user: {
            select: {
              email: true,
              nickname: true,
            },
          },
        },
      }),
    ]);

    const frozenByKol = await sumFrozenAmountForKols(kols.map((k) => k.id));

    return {
      items: kols.map((kol) => this.formatKolResponse(kol, frozenByKol.get(kol.id) ?? 0)),
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
   * Get KOL by ID
   */
  async getKolById(kolId: string, adminId: string): Promise<KolResponse> {
    const [kol, ordersFrozenTotal] = await Promise.all([
      prisma.kol.findUnique({
        where: { id: kolId },
        include: {
          user: {
            select: {
              email: true,
              nickname: true,
            },
          },
          statsHistory: {
            orderBy: { snapshotDate: 'desc' },
            take: 10,
          },
        },
      }),
      sumFrozenAmountForKol(kolId),
    ]);

    if (!kol) {
      throw new ApiError('KOL 不存在', 404, 'KOL_NOT_FOUND');
    }

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'kol',
      resourceId: kolId,
      resourceName: kol.platformUsername,
      requestMethod: 'GET',
      requestPath: `/api/v1/admin/kols/${kolId}`,
      status: 'success',
    });

    return {
      ...this.formatKolResponse(kol, ordersFrozenTotal),
      statsHistory: kol.statsHistory.map((s) => ({
        date: s.snapshotDate,
        followers: s.followers,
        engagementRate: s.engagementRate ? Number(s.engagementRate) : 0,
      })),
    };
  }

  /**
   * Approve KOL
   */
  async approveKol(
    kolId: string,
    data: ApproveKolRequest,
    adminId: string,
    adminEmail: string
  ): Promise<ApproveKolResult> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw new ApiError('KOL 不存在', 404, 'KOL_NOT_FOUND');
    }

    if (kol.status === 'active' && kol.verified) {
      throw new ApiError('KOL 已审核通过', 400, 'KOL_ALREADY_APPROVED');
    }

    // Update KOL status
    const updatedKol = await prisma.kol.update({
      where: { id: kolId },
      data: {
        status: 'active',
        verified: data.setVerified !== false,
        verifiedAt: new Date(),
        verifiedBy: adminId,
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'approve',
      resourceType: 'kol',
      resourceId: kolId,
      resourceName: kol.platformUsername,
      requestMethod: 'POST',
      requestPath: `/api/v1/admin/kols/${kolId}/approve`,
      requestBody: data,
      newValues: { status: 'active', verified: data.setVerified !== false },
      status: 'success',
    });

    logger.info('KOL approved', { kolId, adminId });

    return {
      id: updatedKol.id,
      status: updatedKol.status,
      verified: updatedKol.verified,
      verifiedAt: updatedKol.verifiedAt,
      verifiedBy: adminId,
    };
  }

  /**
   * Reject KOL
   */
  async rejectKol(
    kolId: string,
    data: RejectKolRequest,
    adminId: string,
    adminEmail: string
  ): Promise<RejectKolResult> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw new ApiError('KOL 不存在', 404, 'KOL_NOT_FOUND');
    }

    if (kol.status === 'rejected') {
      throw new ApiError('KOL 已被拒绝', 400, 'KOL_ALREADY_REJECTED');
    }

    // Update KOL status
    const updatedKol = await prisma.kol.update({
      where: { id: kolId },
      data: {
        status: 'rejected',
        metadata: mergeKolMetadata(kol.metadata, {
          rejectedAt: new Date().toISOString(),
          rejectedBy: adminId,
          rejectionReason: data.reason,
          rejectionNote: data.note ?? '',
        }),
      },
    });

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'reject',
      resourceType: 'kol',
      resourceId: kolId,
      resourceName: kol.platformUsername,
      requestMethod: 'POST',
      requestPath: `/api/v1/admin/kols/${kolId}/reject`,
      requestBody: data,
      newValues: { status: 'rejected', rejectionReason: data.reason },
      status: 'success',
    });

    logger.info('KOL rejected', { kolId, adminId, reason: data.reason });

    return {
      id: updatedKol.id,
      status: updatedKol.status,
      rejectedAt: new Date(),
      rejectedBy: adminId,
      rejectionReason: data.reason,
    };
  }

  /**
   * Format KOL response
   */
  private formatKolResponse(kol: KolWithUser, ordersFrozenTotal = 0): KolResponse {
    return {
      id: kol.id,
      userId: kol.userId,
      platform: kol.platform,
      platformId: kol.platformId,
      platformUsername: kol.platformUsername,
      platformDisplayName: kol.platformDisplayName ?? undefined,
      platformAvatarUrl: kol.platformAvatarUrl ?? undefined,
      bio: kol.bio ?? undefined,
      category: kol.category ?? undefined,
      subcategory: kol.subcategory ?? undefined,
      country: kol.country ?? undefined,
      followers: kol.followers,
      following: kol.following,
      totalVideos: kol.totalVideos,
      avgViews: kol.avgViews,
      avgLikes: kol.avgLikes,
      avgComments: kol.avgComments,
      engagementRate: Number(kol.engagementRate),
      status: kol.status,
      verified: kol.verified,
      verifiedAt: kol.verifiedAt ?? undefined,
      verifiedBy: kol.verifiedBy ?? undefined,
      basePrice: kol.basePrice ? Number(kol.basePrice) : undefined,
      currency: kol.currency,
      totalEarnings: Number(kol.totalEarnings),
      availableBalance: Number(kol.availableBalance),
      ordersFrozenTotal,
      totalOrders: kol.totalOrders,
      completedOrders: kol.completedOrders,
      tags: kol.tags,
      user: kol.user
        ? {
            email: kol.user.email,
            nickname: kol.user.nickname ?? undefined,
          }
        : undefined,
      createdAt: kol.createdAt,
      updatedAt: kol.updatedAt,
    };
  }

  /**
   * Verify KOL (alias for approve)
   */
  async verifyKol(
    kolId: string,
    data: ApproveKolRequest,
    adminId: string,
    adminEmail: string
  ): Promise<ApproveKolResult> {
    return this.approveKol(kolId, data, adminId, adminEmail);
  }

  /**
   * Rate KOL
   */
  async rateKol(
    kolId: string,
    data: { rating: string; note?: string },
    adminId: string,
    adminEmail: string
  ): Promise<RateKolResult> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw new ApiError('KOL 不存在', 404, 'KOL_NOT_FOUND');
    }

    const updatedKol = await prisma.kol.update({
      where: { id: kolId },
      data: {
        metadata: mergeKolMetadata(kol.metadata, {
          rating: data.rating,
          ratingUpdatedAt: new Date().toISOString(),
          ratedBy: adminId,
          ratingNote: data.note ?? '',
        }),
      },
    });

    await logAdminAction({
      adminId,
      adminEmail,
      action: 'rate',
      resourceType: 'kol',
      resourceId: kolId,
      resourceName: kol.platformUsername,
      requestMethod: 'POST',
      requestPath: `/api/v1/admin/kols/${kolId}/rate`,
      requestBody: data,
      newValues: { rating: data.rating },
      status: 'success',
    });

    logger.info('KOL rated', { kolId, adminId, rating: data.rating });

    return {
      id: updatedKol.id,
      rating: data.rating,
      ratedAt: new Date(),
      ratedBy: adminId,
    };
  }

  /**
   * Blacklist KOL
   */
  async blacklistKol(
    kolId: string,
    data: { reason: string; note?: string },
    adminId: string,
    adminEmail: string
  ): Promise<BlacklistKolResult> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw new ApiError('KOL 不存在', 404, 'KOL_NOT_FOUND');
    }

    const updatedKol = await prisma.kol.update({
      where: { id: kolId },
      data: {
        status: 'banned',
        metadata: mergeKolMetadata(kol.metadata, {
          blacklistedAt: new Date().toISOString(),
          blacklistedBy: adminId,
          blacklistReason: data.reason,
          blacklistNote: data.note ?? '',
        }),
      },
    });

    await logAdminAction({
      adminId,
      adminEmail,
      action: 'blacklist',
      resourceType: 'kol',
      resourceId: kolId,
      resourceName: kol.platformUsername,
      requestMethod: 'POST',
      requestPath: `/api/v1/admin/kols/${kolId}/blacklist`,
      requestBody: data,
      newValues: { status: 'banned', blacklistReason: data.reason },
      status: 'success',
    });

    logger.info('KOL blacklisted', { kolId, adminId, reason: data.reason });

    return {
      id: updatedKol.id,
      status: updatedKol.status,
      blacklistedAt: new Date(),
      blacklistedBy: adminId,
      blacklistReason: data.reason,
    };
  }

  /**
   * Remove KOL from blacklist
   */
  async removeFromBlacklist(kolId: string, adminId: string, adminEmail: string): Promise<RemoveFromBlacklistResult> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw new ApiError('KOL 不存在', 404, 'KOL_NOT_FOUND');
    }

    if (kol.status !== 'banned') {
      throw new ApiError('KOL 不在黑名单中', 400, 'KOL_NOT_BLACKLISTED');
    }

    const updatedKol = await prisma.kol.update({
      where: { id: kolId },
      data: {
        status: 'active',
        metadata: mergeKolMetadata(kol.metadata, {
          removedFromBlacklistAt: new Date().toISOString(),
          removedBy: adminId,
        }),
      },
    });

    await logAdminAction({
      adminId,
      adminEmail,
      action: 'remove_from_blacklist',
      resourceType: 'kol',
      resourceId: kolId,
      resourceName: kol.platformUsername,
      requestMethod: 'POST',
      requestPath: `/api/v1/admin/kols/${kolId}/remove-from-blacklist`,
      newValues: { status: 'active' },
      status: 'success',
    });

    logger.info('KOL removed from blacklist', { kolId, adminId });

    return {
      id: updatedKol.id,
      status: updatedKol.status,
      removedFromBlacklistAt: new Date(),
      removedBy: adminId,
    };
  }

  /**
   * Suspend KOL
   */
  async suspendKol(
    kolId: string,
    data: { reason: string; duration_days?: number },
    adminId: string,
    adminEmail: string
  ): Promise<SuspendKolResult> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw new ApiError('KOL 不存在', 404, 'KOL_NOT_FOUND');
    }

    const suspendedUntil = data.duration_days ? new Date(Date.now() + data.duration_days * 24 * 60 * 60 * 1000) : null;

    const updatedKol = await prisma.kol.update({
      where: { id: kolId },
      data: {
        status: 'suspended',
        metadata: mergeKolMetadata(kol.metadata, {
          suspendedAt: new Date().toISOString(),
          suspendedBy: adminId,
          suspensionReason: data.reason,
          suspendedUntil: suspendedUntil?.toISOString() ?? '',
        }),
      },
    });

    await logAdminAction({
      adminId,
      adminEmail,
      action: 'suspend',
      resourceType: 'kol',
      resourceId: kolId,
      resourceName: kol.platformUsername,
      requestMethod: 'POST',
      requestPath: `/api/v1/admin/kols/${kolId}/suspend`,
      requestBody: data,
      newValues: { status: 'suspended', suspensionReason: data.reason },
      status: 'success',
    });

    logger.info('KOL suspended', { kolId, adminId, reason: data.reason });

    return {
      id: updatedKol.id,
      status: updatedKol.status,
      suspendedAt: new Date(),
      suspendedBy: adminId,
      suspensionReason: data.reason,
      suspendedUntil,
    };
  }

  /**
   * Unsuspend KOL
   */
  async unsuspendKol(kolId: string, adminId: string, adminEmail: string): Promise<UnsuspendKolResult> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw new ApiError('KOL 不存在', 404, 'KOL_NOT_FOUND');
    }

    if (kol.status !== 'suspended') {
      throw new ApiError('KOL 未暂停', 400, 'KOL_NOT_SUSPENDED');
    }

    const updatedKol = await prisma.kol.update({
      where: { id: kolId },
      data: {
        status: 'active',
        metadata: mergeKolMetadata(kol.metadata, {
          unsuspendedAt: new Date().toISOString(),
          unsuspendedBy: adminId,
        }),
      },
    });

    await logAdminAction({
      adminId,
      adminEmail,
      action: 'unsuspend',
      resourceType: 'kol',
      resourceId: kolId,
      resourceName: kol.platformUsername,
      requestMethod: 'POST',
      requestPath: `/api/v1/admin/kols/${kolId}/unsuspend`,
      newValues: { status: 'active' },
      status: 'success',
    });

    logger.info('KOL unsuspended', { kolId, adminId });

    return {
      id: updatedKol.id,
      status: updatedKol.status,
      unsuspendedAt: new Date(),
      unsuspendedBy: adminId,
    };
  }

  /**
   * Sync KOL data
   */
  async syncKolData(kolId: string, adminId: string): Promise<SyncKolDataResult> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      throw new ApiError('KOL 不存在', 404, 'KOL_NOT_FOUND');
    }

    // Simulate data sync - in production, this would call platform APIs
    const updatedKol = await prisma.kol.update({
      where: { id: kolId },
      data: {
        metadata: mergeKolMetadata(kol.metadata, {
          lastSyncedAt: new Date().toISOString(),
          syncedBy: adminId,
        }),
      },
    });

    logger.info('KOL data synced', { kolId, adminId });

    return {
      id: updatedKol.id,
      syncedAt: new Date(),
      syncedBy: adminId,
    };
  }
}

export const adminKolsService = new AdminKolsService();
