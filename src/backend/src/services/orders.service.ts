import prisma from '../config/database';
import { logger } from '../utils/logger';
import { errors, ApiError } from '../middleware/errorHandler';
import { cacheService } from './cache.service';
import { OrderResponse, CreateOrderRequest } from '../types';

export class OrderService {
  /**
   * Create order
   */
  async createOrder(
    advertiserId: string,
    data: CreateOrderRequest
  ): Promise<OrderResponse> {
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

    // Calculate platform fee (10% by default)
    const platformFeeRate = 0.1;
    const price = data.offered_price;
    const platformFee = price * platformFeeRate;
    const kolEarning = price - platformFee;

    // Create order
    const order = await prisma.order.create({
      data: {
        campaignId: data.campaign_id,
        kolId: data.kol_id,
        advertiserId,
        orderNo,
        price,
        platformFee,
        kolEarning,
        contentDescription: data.requirements,
        status: 'pending',
        deadline: campaign.deadline,
      },
    });

    // Update campaign total_kols count
    await prisma.campaign.update({
      where: { id: data.campaign_id },
      data: {
        totalKols: { increment: 1 },
      },
    });

    logger.info('Order created', { 
      orderId: order.id, 
      campaignId: data.campaign_id,
      kolId: data.kol_id,
    });

    return this.formatOrderResponse(order);
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, userId?: string, userRole?: string): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw errors.notFound('订单不存在');
    }

    // Check permission (only advertiser or KOL can view)
    if (userId && userRole !== 'admin' && userRole !== 'super_admin') {
      if (order.advertiserId !== userId && order.kolId !== userId) {
        // Check if user is the KOL's owner
        const kol = await prisma.kol.findUnique({
          where: { id: order.kolId },
          select: { userId: true },
        });
        
        if (kol?.userId !== userId) {
          throw errors.forbidden('没有权限查看此订单');
        }
      }
    }

    return this.formatOrderResponse(order);
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
    const where: any = {};

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
      where.status = filters.status;
    }

    if (filters?.campaign_id) {
      where.campaignId = filters.campaign_id;
    }

    // P1 Performance: Cache key for order list
    const cacheKey = `order:list:${targetId}:${filters?.status || 'all'}:${page}:${pageSize}`;
    
    // Try cache first (2 min TTL for order lists)
    if (!filters?.campaign_id) {
      const cached = await cacheService.get<{ items: OrderResponse[]; total: number }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // P1 Performance: Use selective field selection
    const selectFields = {
      id: true,
      orderNo: true,
      campaignId: true,
      kolId: true,
      advertiserId: true,
      price: true,
      platformFee: true,
      kolEarning: true,
      status: true,
      contentType: true,
      contentCount: true,
      submittedAt: true,
      approvedAt: true,
      publishedAt: true,
      completedAt: true,
      deadline: true,
      views: true,
      likes: true,
      comments: true,
      shares: true,
      createdAt: true,
      updatedAt: true,
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: selectFields,
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

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'rejected',
        reviewNotes: reason,
      },
    });

    // Update campaign count
    await prisma.campaign.update({
      where: { id: order.campaignId },
      data: {
        totalKols: { decrement: 1 },
      },
    });

    logger.info('Order rejected', { orderId, reason });

    return this.formatOrderResponse(updated);
  }

  /**
   * Complete order
   */
  async completeOrder(
    orderId: string,
    userId: string,
    rating?: number,
    review?: string
  ): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw errors.notFound('订单不存在');
    }

    // Only advertiser can complete the order
    if (order.advertiserId !== userId) {
      throw errors.forbidden('没有权限操作此订单');
    }

    if (!['submitted', 'approved', 'published'].includes(order.status)) {
      throw new ApiError('订单未完成，无法确认', 400, 'INVALID_STATUS');
    }

    const updateData: any = {
      status: 'completed',
      completedAt: new Date(),
    };

    if (rating !== undefined) {
      updateData.advertiserRating = rating;
    }
    if (review !== undefined) {
      updateData.advertiserReview = review;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Update KOL stats
    await this.updateKolStats(order.kolId, rating);

    // Create transaction for KOL earning
    await this.createKolPaymentTransaction(order);

    logger.info('Order completed', { orderId, rating });

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

    return this.formatOrderResponse(updated);
  }

  /**
   * Update order status (admin or advertiser)
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    reviewNotes?: string
  ): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw errors.notFound('订单不存在');
    }

    const updateData: any = {
      status,
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
  private async updateKolStats(kolId: string, rating?: number): Promise<void> {
    const kol = await prisma.kol.findUnique({
      where: { id: kolId },
    });

    if (!kol) return;

    const updateData: any = {
      completedOrders: { increment: 1 },
    };

    // Update average rating
    if (rating !== undefined) {
      const newTotalRating = kol.avgRating.toNumber() * kol.completedOrders + rating;
      const newCompletedOrders = kol.completedOrders + 1;
      updateData.avgRating = newTotalRating / newCompletedOrders;
    }

    await prisma.kol.update({
      where: { id: kolId },
      data: updateData,
    });
  }

  /**
   * Create payment transaction for KOL
   */
  private async createKolPaymentTransaction(order: any): Promise<void> {
    const transactionNo = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await prisma.transaction.create({
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

    // Update KOL balance
    await prisma.kol.update({
      where: { id: order.kolId },
      data: {
        availableBalance: { increment: order.kolEarning },
        totalEarnings: { increment: order.kolEarning },
      },
    });
  }

  /**
   * Format order response
   */
  private formatOrderResponse(order: any): OrderResponse {
    return {
      id: order.id,
      campaign_id: order.campaignId,
      kol_id: order.kolId,
      advertiser_id: order.advertiserId,
      order_no: order.orderNo,
      price: order.price.toNumber(),
      platform_fee: order.platformFee.toNumber(),
      kol_earning: order.kolEarning.toNumber(),
      content_type: order.contentType,
      content_count: order.contentCount,
      content_description: order.contentDescription,
      draft_urls: order.draftUrls || [],
      published_urls: order.publishedUrls || [],
      accepted_at: order.acceptedAt?.toISOString(),
      deadline: order.deadline?.toISOString(),
      submitted_at: order.submittedAt?.toISOString(),
      approved_at: order.approvedAt?.toISOString(),
      published_at: order.publishedAt?.toISOString(),
      completed_at: order.completedAt?.toISOString(),
      status: order.status,
      review_notes: order.reviewNotes,
      revision_count: order.revisionCount,
      advertiser_rating: order.advertiserRating,
      advertiser_review: order.advertiserReview,
      kol_rating: order.kolRating,
      kol_review: order.kolReview,
      views: order.views,
      likes: order.likes,
      comments: order.comments,
      shares: order.shares,
      created_at: order.createdAt.toISOString(),
      updated_at: order.updatedAt.toISOString(),
    };
  }
}

export const orderService = new OrderService();
