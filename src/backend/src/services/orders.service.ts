import { Prisma, type Order, type OrderStatus } from '@prisma/client';
import prisma from '../config/database';
import { cacheService as redisAdvertiserCache } from '../config/redis';
import { logger } from '../utils/logger';
import { errors, ApiError } from '../middleware/errorHandler';
import { cacheService } from './cache.service';
import { OrderResponse, CreateOrderRequest, OrderCpmBreakdown } from '../types';
import {
  applyCpmBudgetCap,
  billableImpressionsFromOrderViews,
  buildCpmBreakdown,
  grossSpendFromCpm,
  prismaDecimalsFromCpmSettlement,
  splitGrossWithPlatformFee,
} from './cpm-metrics.service';
import {
  freezeBudgetOnOrderCreate,
  genTransactionNo,
  releaseFrozenBudgetTx,
  type OrderTx,
} from './order-budget.service';
import { notificationService } from './notifications.service';
import { kolFrequencyService } from './kol-frequency.service';

type OrderWithListKol = Prisma.OrderGetPayload<{
  include: {
    kol: {
      select: {
        platformUsername: true;
        platformDisplayName: true;
        platformAvatarUrl: true;
        platform: true;
      };
    };
    campaign: {
      select: {
        title: true;
        targetPlatforms: true;
      };
    };
  };
}>;

/** 列表含 kol / campaign 片段；详情在 getOrderById 中一并加载 */
type OrderForResponse = Order & {
  kol?: OrderWithListKol['kol'];
  campaign?: OrderWithListKol['campaign'];
};

export class OrderService {
  /**
   * Create order
   */
  async createOrder(advertiserId: string, data: CreateOrderRequest): Promise<OrderResponse> {
    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: data.campaign_id },
    });

    if (!campaign) {
      throw errors.notFound('活动不存在');
    }

    if (campaign.advertiserId !== advertiserId) {
      throw errors.forbidden('没有权限操作此活动');
    }

    // Get KOL
    const kol = await prisma.kol.findUnique({
      where: { id: data.kol_id },
    });

    if (!kol) {
      throw errors.notFound('KOL 不存在');
    }

    // Check campaign status
    if (!['active', 'pending_review'].includes(campaign.status)) {
      throw new ApiError('活动状态不允许创建订单', 400, 'INVALID_CAMPAIGN_STATUS');
    }

    // Generate order number
    const orderNo = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const platformFeeRate = 0.1;
    const pricingModel = data.pricing_model ?? 'fixed';

    let price: Prisma.Decimal;
    let platformFee: Prisma.Decimal;
    let kolEarning: Prisma.Decimal;
    let cpmRate: Prisma.Decimal | null = null;
    let cpmBudgetCap: Prisma.Decimal | null = null;

    if (pricingModel === 'cpm') {
      cpmRate = new Prisma.Decimal(data.cpm_rate!);
      cpmBudgetCap = new Prisma.Decimal(data.offered_price!);
      price = new Prisma.Decimal(0);
      platformFee = new Prisma.Decimal(0);
      kolEarning = new Prisma.Decimal(0);
    } else {
      const p = data.offered_price!;
      price = new Prisma.Decimal(p);
      platformFee = new Prisma.Decimal(p * platformFeeRate);
      kolEarning = new Prisma.Decimal(p - p * platformFeeRate);
    }

    const freezeAmount = new Prisma.Decimal(data.offered_price!);

    const order = await prisma.$transaction(async (tx: OrderTx) => {
      const o = await tx.order.create({
        data: {
          campaignId: data.campaign_id,
          kolId: data.kol_id,
          advertiserId,
          orderNo,
          pricingModel,
          cpmRate,
          cpmBudgetCap,
          frozenAmount: freezeAmount,
          price,
          platformFee,
          kolEarning,
          contentDescription: data.requirements,
          status: 'pending',
          deadline: campaign.deadline,
        },
      });

      await freezeBudgetOnOrderCreate(tx, {
        advertiserId,
        orderId: o.id,
        orderNo,
        freezeAmount,
      });

      await tx.campaign.update({
        where: { id: data.campaign_id },
        data: {
          totalKols: { increment: 1 },
        },
      });

      return o;
    });

    logger.info('Order created', {
      orderId: order.id,
      campaignId: data.campaign_id,
      kolId: data.kol_id,
    });

    void this.invalidateAdvertiserProfileCache(advertiserId);

    const [kolUser, campaignBrief] = await Promise.all([
      prisma.kol.findUnique({ where: { id: data.kol_id }, select: { userId: true } }),
      prisma.campaign.findUnique({ where: { id: data.campaign_id }, select: { title: true } }),
    ]);
    if (kolUser?.userId) {
      notificationService.notifyOrderPendingForKol(
        kolUser.userId,
        order.id,
        campaignBrief?.title ?? '活动',
        order.orderNo
      );
    }

    return this.formatOrderResponse(order as OrderForResponse);
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, userId?: string, userRole?: string): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        kol: {
          select: {
            platformUsername: true,
            platformDisplayName: true,
            platformAvatarUrl: true,
            platform: true,
          },
        },
        campaign: {
          select: {
            title: true,
            targetPlatforms: true,
          },
        },
      },
    });

    if (!order) {
      throw errors.notFound('订单不存在');
    }

    if (userId && userRole !== 'admin' && userRole !== 'super_admin') {
      const adv = await prisma.advertiser.findUnique({
        where: { userId },
        select: { id: true },
      });
      const isAdvertiser = adv != null && order.advertiserId === adv.id;
      const kol = await prisma.kol.findUnique({
        where: { id: order.kolId },
        select: { userId: true },
      });
      const isKolOwner = kol?.userId === userId;
      if (!isAdvertiser && !isKolOwner) {
        throw errors.forbidden('没有权限查看此订单');
      }
    }

    return this.formatOrderResponse(order as OrderForResponse);
  }

  /**
   * CPM 口径明细（广告主 / KOL 数据看板）
   */
  async getOrderCpmMetrics(orderId: string, userId: string, userRole?: string): Promise<OrderCpmBreakdown> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw errors.notFound('订单不存在');
    }
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      const adv = await prisma.advertiser.findUnique({
        where: { userId },
        select: { id: true },
      });
      const isAdvertiser = adv != null && order.advertiserId === adv.id;
      const kol = await prisma.kol.findUnique({
        where: { id: order.kolId },
        select: { userId: true },
      });
      const isKolOwner = kol?.userId === userId;
      if (!isAdvertiser && !isKolOwner) {
        throw errors.forbidden('没有权限查看此订单');
      }
    }
    return buildCpmBreakdown(order);
  }

  /**
   * Get orders list with filters
   * P1 Performance: Optimized with selective fields and caching
   */
  async getOrders(
    userId: string,
    role: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      status?: string;
      campaign_id?: string;
    }
  ): Promise<{ items: OrderResponse[]; total: number }> {
    const where: Prisma.OrderWhereInput = {};

    // Filter by user role
    let targetId = '';
    if (role === 'advertiser') {
      const advertiser = await prisma.advertiser.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (advertiser) {
        where.advertiserId = advertiser.id;
        targetId = advertiser.id;
      }
    } else if (role === 'kol') {
      const kol = await prisma.kol.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (kol) {
        where.kolId = kol.id;
        targetId = kol.id;
      }
    }

    if (filters?.status) {
      const raw = filters.status.trim();
      if (raw.includes(',')) {
        const parts = raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean) as OrderStatus[];
        where.status = { in: parts };
      } else {
        where.status = raw as OrderStatus;
      }
    }

    if (filters?.campaign_id) {
      where.campaignId = filters.campaign_id;
    }

    // P1 Performance: Cache key for order list
    const cacheKey = `order:list:v2:${targetId}:${filters?.status || 'all'}:${page}:${pageSize}`;

    // Try cache first (2 min TTL for order lists)
    if (!filters?.campaign_id) {
      const cached = await cacheService.get<{ items: OrderResponse[]; total: number }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          kol: {
            select: {
              platformUsername: true,
              platformDisplayName: true,
              platformAvatarUrl: true,
              platform: true,
            },
          },
          campaign: {
            select: {
              title: true,
              targetPlatforms: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    const result = {
      items: orders.map((o) => this.formatOrderResponse(o)),
      total,
    };

    // Cache non-filtered searches for 2 minutes
    if (!filters?.campaign_id) {
      await cacheService.set(cacheKey, result, 120);
    }

    return result;
  }

  /**
   * Accept order (KOL action)
   */
  async acceptOrder(orderId: string, userId: string): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw errors.notFound('订单不存在');
    }

    if (order.status !== 'pending') {
      throw new ApiError('只能接受待确认的订单', 400, 'INVALID_STATUS');
    }

    // Verify user is the KOL
    const kol = await prisma.kol.findUnique({
      where: { id: order.kolId },
    });

    if (!kol || kol.userId !== userId) {
      throw errors.forbidden('没有权限操作此订单');
    }

    await kolFrequencyService.assertCanAcceptOrder(order.kolId);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });

    // Update campaign selected_kols count
    await prisma.campaign.update({
      where: { id: order.campaignId },
      data: {
        selectedKols: { increment: 1 },
      },
    });

    logger.info('Order accepted', { orderId });

    const advNotify = await prisma.advertiser.findUnique({
      where: { id: order.advertiserId },
      select: { userId: true },
    });
    if (advNotify?.userId) {
      notificationService.notifyOrderAcceptedForAdvertiser(advNotify.userId, orderId, order.orderNo);
    }

    return this.formatOrderResponse(updated);
  }

  /**
   * Reject order (KOL action)
   */
  async rejectOrder(orderId: string, userId: string, reason?: string): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw errors.notFound('订单不存在');
    }

    if (order.status !== 'pending') {
      throw new ApiError('只能拒绝待确认的订单', 400, 'INVALID_STATUS');
    }

    // Verify user is the KOL
    const kol = await prisma.kol.findUnique({
      where: { id: order.kolId },
    });

    if (!kol || kol.userId !== userId) {
      throw errors.forbidden('没有权限操作此订单');
    }

    const updated = await prisma.$transaction(async (tx: OrderTx) => {
      if (order.frozenAmount.toNumber() > 0) {
        await releaseFrozenBudgetTx(tx, order);
      }

      const o = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'rejected',
          reviewNotes: reason,
          frozenAmount: new Prisma.Decimal(0),
        },
      });

      await tx.campaign.update({
        where: { id: order.campaignId },
        data: {
          totalKols: { decrement: 1 },
        },
      });

      return o;
    });

    logger.info('Order rejected', { orderId, reason });

    const advUser = await prisma.advertiser.findUnique({
      where: { id: order.advertiserId },
      select: { userId: true },
    });
    if (advUser?.userId) {
      notificationService.notifyOrderRejectedForAdvertiser(advUser.userId, orderId, order.orderNo, reason);
    }

    void this.invalidateAdvertiserProfileCache(order.advertiserId);

    return this.formatOrderResponse(updated);
  }

  /**
   * Complete order
   */
  async completeOrder(orderId: string, userId: string, rating?: number, review?: string): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw errors.notFound('订单不存在');
    }

    const advertiser = await prisma.advertiser.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!advertiser || order.advertiserId !== advertiser.id) {
      throw errors.forbidden('没有权限操作此订单');
    }

    if (!['submitted', 'approved', 'published'].includes(order.status)) {
      throw new ApiError('订单未完成，无法确认', 400, 'INVALID_STATUS');
    }

    const platformFeeRate = 0.1;
    let settledGrossDecimal: Prisma.Decimal = order.price;
    const updateData: Prisma.OrderUpdateInput = {
      status: 'completed',
      completedAt: new Date(),
      frozenAmount: new Prisma.Decimal(0),
    };

    if (rating !== undefined) {
      updateData.advertiserRating = rating;
    }
    if (review !== undefined) {
      updateData.advertiserReview = review;
    }

    if (order.pricingModel === 'cpm' && order.cpmRate != null) {
      const billable = billableImpressionsFromOrderViews(order.views);
      let gross = grossSpendFromCpm(billable, order.cpmRate.toNumber());
      gross = applyCpmBudgetCap(gross, order.cpmBudgetCap);
      const split = splitGrossWithPlatformFee(gross, platformFeeRate);
      const settled = prismaDecimalsFromCpmSettlement(split.gross, split.platformFee, split.kolEarning);
      updateData.price = settled.price;
      updateData.platformFee = settled.platformFee;
      updateData.kolEarning = settled.kolEarning;
      settledGrossDecimal = settled.price;
    }

    const updated = await prisma.$transaction(async (tx: OrderTx) => {
      const F = order.frozenAmount.toNumber();
      const A = settledGrossDecimal.toNumber();

      if (F > 0) {
        const adv = await tx.advertiser.findUnique({
          where: { id: order.advertiserId },
        });
        if (!adv) {
          throw errors.notFound('广告主不存在');
        }
        const W = adv.walletBalance.toNumber();
        if (W + F < A - 1e-9) {
          throw new ApiError('可用余额不足，无法按结算金额完成订单', 400, 'INSUFFICIENT_BALANCE');
        }

        const deltaWallet = new Prisma.Decimal(F - A);
        await tx.advertiser.update({
          where: { id: order.advertiserId },
          data: {
            walletBalance: { increment: deltaWallet },
            frozenBalance: { decrement: order.frozenAmount },
            totalSpent: { increment: settledGrossDecimal },
          },
        });

        await tx.transaction.create({
          data: {
            advertiserId: order.advertiserId,
            orderId: order.id,
            transactionNo: genTransactionNo(),
            type: 'order_payment',
            amount: settledGrossDecimal,
            status: 'completed',
            description: `订单结算扣款 - ${order.orderNo}`,
            completedAt: new Date(),
          },
        });
      }

      await tx.campaign.update({
        where: { id: order.campaignId },
        data: {
          spentAmount: { increment: settledGrossDecimal },
        },
      });

      const o = await tx.order.update({
        where: { id: orderId },
        data: updateData,
      });

      await this.updateKolStats(order.kolId, rating, tx);
      await this.createKolPaymentTransaction(o, tx);

      return o;
    });

    logger.info('Order completed', { orderId, rating });

    void this.invalidateAdvertiserProfileCache(order.advertiserId);

    const kolNotify = await prisma.kol.findUnique({
      where: { id: order.kolId },
      select: { userId: true },
    });
    if (kolNotify?.userId) {
      notificationService.notifyOrderCompletedForKol(
        kolNotify.userId,
        orderId,
        order.orderNo,
        updated.kolEarning.toNumber()
      );
    }

    return this.formatOrderResponse(updated);
  }

  /**
   * Submit order work (KOL action)
   */
  async submitOrder(orderId: string, userId: string, draftUrls: string[]): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw errors.notFound('订单不存在');
    }

    if (order.status !== 'accepted' && order.status !== 'in_progress') {
      throw new ApiError('订单状态不允许提交', 400, 'INVALID_STATUS');
    }

    // Verify user is the KOL
    const kol = await prisma.kol.findUnique({
      where: { id: order.kolId },
    });

    if (!kol || kol.userId !== userId) {
      throw errors.forbidden('没有权限操作此订单');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
        draftUrls,
      },
    });

    logger.info('Order work submitted', { orderId });

    const advUser = await prisma.advertiser.findUnique({
      where: { id: order.advertiserId },
      select: { userId: true },
    });
    if (advUser?.userId) {
      notificationService.notifyOrderSubmittedForAdvertiser(advUser.userId, orderId, order.orderNo);
    }

    return this.formatOrderResponse(updated);
  }

  /**
   * Update order status (admin or advertiser)
   */
  async updateOrderStatus(orderId: string, status: string, reviewNotes?: string): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw errors.notFound('订单不存在');
    }

    const updateData: Prisma.OrderUpdateInput = {
      status: status as OrderStatus,
    };

    if (reviewNotes) {
      updateData.reviewNotes = reviewNotes;
    }

    if (status === 'approved') {
      updateData.approvedAt = new Date();
    } else if (status === 'published') {
      updateData.publishedAt = new Date();
    } else if (status === 'in_progress') {
      // Reset revision count when sending back for revisions
      updateData.revisionCount = { increment: 1 };
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    logger.info('Order status updated', { orderId, status });

    return this.formatOrderResponse(updated);
  }

  /**
   * Update KOL stats after order completion
   */
  private async updateKolStats(kolId: string, rating?: number, tx?: OrderTx): Promise<void> {
    const db = tx ?? prisma;
    const kol = await db.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) {
      return;
    }

    const updateData: Prisma.KolUpdateInput = {
      completedOrders: { increment: 1 },
    };

    if (rating !== undefined) {
      const newTotalRating = kol.avgRating.toNumber() * kol.completedOrders + rating;
      const newCompletedOrders = kol.completedOrders + 1;
      updateData.avgRating = newTotalRating / newCompletedOrders;
    }

    await db.kol.update({
      where: { id: kolId },
      data: updateData,
    });
  }

  /**
   * Create payment transaction for KOL
   */
  private async createKolPaymentTransaction(order: Order, tx?: OrderTx): Promise<void> {
    const db = tx ?? prisma;
    const transactionNo = genTransactionNo();

    await db.transaction.create({
      data: {
        orderId: order.id,
        kolId: order.kolId,
        transactionNo,
        type: 'order_income',
        amount: order.kolEarning,
        status: 'completed',
        description: `订单收入 - ${order.orderNo}`,
        completedAt: new Date(),
      },
    });

    await db.kol.update({
      where: { id: order.kolId },
      data: {
        availableBalance: { increment: order.kolEarning },
        totalEarnings: { increment: order.kolEarning },
      },
    });
  }

  /** GET /advertisers/me 缓存含 orders_frozen_total，订单冻结变化时需失效 */
  private async invalidateAdvertiserProfileCache(advertiserId: string): Promise<void> {
    try {
      const row = await prisma.advertiser.findUnique({
        where: { id: advertiserId },
        select: { userId: true },
      });
      if (row?.userId) {
        await redisAdvertiserCache.delete(`advertiser:user:${row.userId}`);
      }
    } catch (e) {
      logger.warn('invalidateAdvertiserProfileCache failed', { advertiserId, err: e });
    }
  }

  /**
   * Format order response
   */
  private formatOrderResponse(order: OrderForResponse): OrderResponse {
    const pricing_model = order.pricingModel === 'cpm' ? 'cpm' : 'fixed';
    const campaignTitle = order.campaign?.title;
    const platformFromCampaign = order.campaign?.targetPlatforms?.[0];
    const row: OrderResponse = {
      id: order.id,
      campaign_id: order.campaignId,
      kol_id: order.kolId,
      advertiser_id: order.advertiserId,
      order_no: order.orderNo,
      pricing_model,
      cpm_rate: order.cpmRate != null ? order.cpmRate.toNumber() : null,
      cpm_budget_cap: order.cpmBudgetCap != null ? order.cpmBudgetCap.toNumber() : null,
      frozen_amount: order.frozenAmount != null ? order.frozenAmount.toNumber() : 0,
      price: order.price.toNumber(),
      platform_fee: order.platformFee.toNumber(),
      kol_earning: order.kolEarning.toNumber(),
      content_type: order.contentType,
      content_count: order.contentCount,
      content_description: order.contentDescription ?? undefined,
      draft_urls: order.draftUrls || [],
      published_urls: order.publishedUrls || [],
      accepted_at: order.acceptedAt?.toISOString(),
      deadline: order.deadline?.toISOString(),
      submitted_at: order.submittedAt?.toISOString(),
      approved_at: order.approvedAt?.toISOString(),
      published_at: order.publishedAt?.toISOString(),
      completed_at: order.completedAt?.toISOString(),
      status: order.status,
      review_notes: order.reviewNotes ?? undefined,
      revision_count: order.revisionCount,
      advertiser_rating: order.advertiserRating ?? undefined,
      advertiser_review: order.advertiserReview ?? undefined,
      kol_rating: order.kolRating ?? undefined,
      kol_review: order.kolReview ?? undefined,
      views: order.views,
      likes: order.likes,
      comments: order.comments,
      shares: order.shares,
      created_at: order.createdAt.toISOString(),
      updated_at: order.updatedAt.toISOString(),
    };
    if (campaignTitle !== undefined) {
      row.campaign_title = campaignTitle;
    }
    if (platformFromCampaign) {
      row.platform = platformFromCampaign;
    } else if (order.kol?.platform) {
      row.platform = String(order.kol.platform);
    }
    if (pricing_model === 'cpm') {
      row.cpm_breakdown = buildCpmBreakdown(order);
    }
    if (order.kol) {
      row.kol = {
        platform_username: order.kol.platformUsername,
        platform_display_name: order.kol.platformDisplayName,
        platform_avatar_url: order.kol.platformAvatarUrl,
        platform: String(order.kol.platform),
      };
    }
    return row;
  }
}

export const orderService = new OrderService();
