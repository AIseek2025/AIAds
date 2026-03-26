import { OrderStatus, Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { ApiError } from '../../middleware/errorHandler';
import { logAdminAction } from './audit.service';
import { PaginationResponse } from '../../types';
import { decimalToNumber } from '../../utils/decimal';

// Types and interfaces
export interface OrderListFilters {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
  campaignId?: string;
  advertiserId?: string;
  kolId?: string;
  platform?: string;
  amountMin?: number;
  amountMax?: number;
  createdAfter?: string;
  createdBefore?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface OrderListItem {
  id: string;
  order_no: string;
  campaign_id: string;
  campaign_name: string;
  advertiser_id: string;
  advertiser_name: string;
  kol_id: string;
  kol_name: string;
  kol_platform: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OrderDetail {
  id: string;
  order_no: string;
  campaign_id: string;
  campaign_name: string;
  advertiser_id: string;
  advertiser_name: string;
  kol_id: string;
  kol_name: string;
  kol_platform: string;
  kol_display_name: string | null;
  kol_avatar_url: string | null;
  title: string;
  description: string | null;
  deliverables: any;
  amount: number;
  platform_fee: number;
  kol_earnings: number;
  status: string;
  accepted_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  dispute: any | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateOrderStatusRequest {
  status: string;
  reason?: string;
}

export interface DisputeOrderRequest {
  resolution: 'refund_full' | 'refund_partial' | 'no_refund' | 'escalate';
  refund_amount?: number;
  ruling: string;
  notify_parties: boolean;
}

export interface DisputeOrder {
  id: string;
  order_id: string;
  order_no: string;
  campaign_name: string;
  advertiser_name: string;
  kol_name: string;
  raised_by: string;
  reason: string;
  evidence_urls: string | string[] | null;
  status: string;
  assigned_to: string | null;
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  ruling: string | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface ExportOrdersRequest {
  keyword?: string;
  status?: string;
  campaign_id?: string;
  advertiser_id?: string;
  kol_id?: string;
  platform?: string;
  amount_min?: number;
  amount_max?: number;
  created_after?: string;
  created_before?: string;
  format: 'csv' | 'xlsx' | 'pdf';
}

export interface ExportResult {
  fileContent: string;
  fileName: string;
  total: number;
}

function parseEvidenceUrls(raw: string | null): string | string[] | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? (p as string[]) : raw;
  } catch {
    return raw;
  }
}

export class AdminOrderService {
  /**
   * Get order list with pagination and filters
   */
  async getOrderList(
    filters: OrderListFilters,
    adminId: string
  ): Promise<PaginationResponse<OrderListItem>> {
    const {
      page,
      pageSize,
      keyword,
      status,
      campaignId,
      advertiserId,
      kolId,
      platform: _platform,
      amountMin,
      amountMax,
      createdAfter,
      createdBefore,
      sort,
      order,
    } = filters;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where: any = {};

    if (keyword) {
      where.OR = [
        { orderNo: { contains: keyword, mode: 'insensitive' } },
        { contentDescription: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (campaignId) {
      where.campaignId = campaignId;
    }

    if (advertiserId) {
      where.advertiserId = advertiserId;
    }

    if (kolId) {
      where.kolId = kolId;
    }

    if (amountMin !== undefined || amountMax !== undefined) {
      where.price = {};
      if (amountMin !== undefined) {
        where.price.gte = amountMin;
      }
      if (amountMax !== undefined) {
        where.price.lte = amountMax;
      }
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
    const total = await prisma.order.count({ where });

    // Get items
    const items = await prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { [sort ?? 'createdAt']: order ?? 'desc' } as Record<string, 'asc' | 'desc'>,
      include: {
        campaign: {
          select: {
            title: true,
          },
        },
        advertiser: {
          select: {
            companyName: true,
          },
        },
        kol: {
          select: {
            platform: true,
            platformUsername: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'list',
      resourceType: 'orders',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/orders',
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'order.list',
      filters,
      total,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        order_no: item.orderNo,
        campaign_id: item.campaignId,
        campaign_name: item.campaign.title,
        advertiser_id: item.advertiserId,
        advertiser_name: item.advertiser.companyName,
        kol_id: item.kolId,
        kol_name: item.kol.platformUsername,
        kol_platform: item.kol.platform,
        amount: decimalToNumber(item.price),
        status: item.status,
        created_at: item.createdAt.toISOString(),
        updated_at: item.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Get order details by ID
   */
  async getOrderById(orderId: string, adminId: string): Promise<OrderDetail> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        campaign: {
          select: {
            title: true,
          },
        },
        advertiser: {
          select: {
            companyName: true,
          },
        },
        kol: {
          select: {
            platform: true,
            platformUsername: true,
            platformDisplayName: true,
            platformAvatarUrl: true,
          },
        },
        dispute: true,
      },
    });

    if (!order) {
      throw new ApiError('订单不存在', 404, 'NOT_FOUND');
    }

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'view',
      resourceType: 'orders',
      resourceId: orderId,
      resourceName: order.orderNo,
      requestMethod: 'GET',
      requestPath: `/api/v1/admin/orders/${orderId}`,
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'order.view',
      targetId: orderId,
    });

    return {
      id: order.id,
      order_no: order.orderNo,
      campaign_id: order.campaignId,
      campaign_name: order.campaign.title,
      advertiser_id: order.advertiserId,
      advertiser_name: order.advertiser.companyName,
      kol_id: order.kolId,
      kol_name: order.kol.platformUsername,
      kol_platform: order.kol.platform,
      kol_display_name: order.kol.platformDisplayName,
      kol_avatar_url: order.kol.platformAvatarUrl,
      title: order.contentDescription ?? order.orderNo,
      description: order.contentDescription,
      deliverables: order.draftUrls,
      amount: decimalToNumber(order.price),
      platform_fee: decimalToNumber(order.platformFee),
      kol_earnings: decimalToNumber(order.kolEarning),
      status: order.status,
      accepted_at: order.acceptedAt?.toISOString() || null,
      submitted_at: order.submittedAt?.toISOString() || null,
      reviewed_at: order.approvedAt?.toISOString() || null,
      published_at: order.publishedAt?.toISOString() || null,
      completed_at: order.completedAt?.toISOString() || null,
      cancelled_at: null,
      cancellation_reason: null,
      cancelled_by: null,
      dispute: order.dispute,
      created_at: order.createdAt.toISOString(),
      updated_at: order.updatedAt.toISOString(),
    };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    request: UpdateOrderStatusRequest,
    adminId: string,
    adminEmail: string
  ): Promise<any> {
    const { status, reason } = request;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new ApiError('订单不存在', 404, 'NOT_FOUND');
    }

    const updateData: any = {
      status: status as OrderStatus,
    };

    // Set status-specific timestamps (Prisma OrderStatus enum)
    switch (status) {
      case OrderStatus.completed:
        updateData.completedAt = new Date();
        break;
      case OrderStatus.cancelled:
        break;
      case OrderStatus.accepted:
        updateData.acceptedAt = new Date();
        break;
      case OrderStatus.submitted:
        updateData.submittedAt = new Date();
        break;
      case OrderStatus.approved:
        updateData.approvedAt = new Date();
        break;
      default:
        break;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Update campaign stats if order is completed
    if (status === OrderStatus.completed && order.status !== OrderStatus.completed) {
      await prisma.campaign.update({
        where: { id: order.campaignId },
        data: {
          publishedVideos: { increment: 1 },
        },
      });
    }

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'update_status',
      resourceType: 'orders',
      resourceId: orderId,
      resourceName: order.orderNo,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/orders/${orderId}/status`,
      requestBody: JSON.stringify(request),
      oldValues: JSON.stringify({ status: order.status }),
      newValues: JSON.stringify({ status }),
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'order.update_status',
      targetId: orderId,
      changes: { status, reason },
    });

    return {
      id: orderId,
      status: updatedOrder.status,
      updated_at: updatedOrder.updatedAt.toISOString(),
    };
  }

  /**
   * Get dispute orders
   */
  async getDisputeOrders(
    filters: { page: number; pageSize: number; status?: string; sort?: string; order?: 'asc' | 'desc' },
    adminId: string
  ): Promise<PaginationResponse<DisputeOrder>> {
    const { page, pageSize, status, sort, order } = filters;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.orderDispute.count({ where });

    // Get items
    const items = await prisma.orderDispute.findMany({
      where,
      skip,
      take,
      orderBy: { [sort ?? 'createdAt']: order ?? 'desc' } as Record<string, 'asc' | 'desc'>,
      include: {
        order: {
          include: {
            campaign: {
              select: {
                title: true,
              },
            },
            advertiser: {
              select: {
                companyName: true,
              },
            },
            kol: {
              select: {
                platformUsername: true,
              },
            },
          },
        },
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'list',
      resourceType: 'order_disputes',
      requestMethod: 'GET',
      requestPath: '/api/v1/admin/orders/disputes',
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'order.disputes',
      filters,
      total,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        order_id: item.orderId,
        order_no: item.order.orderNo,
        campaign_name: item.order.campaign.title,
        advertiser_name: item.order.advertiser.companyName,
        kol_name: item.order.kol.platformUsername,
        raised_by: item.raisedBy,
        reason: item.reason,
        evidence_urls: parseEvidenceUrls(item.evidenceUrls),
        status: item.status,
        assigned_to: item.assignedTo,
        resolution: item.resolution,
        resolved_at: item.resolvedAt?.toISOString() || null,
        resolved_by: item.resolvedBy,
        ruling: item.ruling,
        refund_amount: item.refundAmount != null ? decimalToNumber(item.refundAmount) : null,
        created_at: item.createdAt.toISOString(),
        updated_at: item.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  /**
   * Handle order dispute
   */
  async handleDispute(
    orderId: string,
    request: DisputeOrderRequest,
    adminId: string,
    adminEmail: string
  ): Promise<any> {
    const { resolution, refund_amount, ruling } = request;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        dispute: true,
      },
    });

    if (!order) {
      throw new ApiError('订单不存在', 404, 'NOT_FOUND');
    }

    if (!order.dispute) {
      throw new ApiError('该订单没有纠纷', 404, 'NOT_FOUND');
    }

    const updateData: any = {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: adminId,
      ruling,
    };

    // Handle refund based on resolution
    if (resolution === 'refund_full' || resolution === 'refund_partial') {
      const refundAmount =
        resolution === 'refund_full'
          ? decimalToNumber(order.price)
          : refund_amount ?? 0;
      updateData.refundAmount = new Prisma.Decimal(refundAmount);

      // Create refund transaction
      const transactionNo = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await prisma.transaction.create({
        data: {
          transactionNo,
          advertiserId: order.advertiserId,
          type: TransactionType.refund,
          amount: new Prisma.Decimal(refundAmount),
          currency: 'CNY',
          orderId: order.id,
          balanceBefore: new Prisma.Decimal(0),
          balanceAfter: new Prisma.Decimal(0),
          description: `订单纠纷退款：${order.orderNo}`,
          status: TransactionStatus.completed,
          completedAt: new Date(),
        },
      });
    }

    const updatedDispute = await prisma.orderDispute.update({
      where: { id: order.dispute.id },
      data: updateData,
    });

    // Update order status if needed
    if (resolution === 'refund_full') {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.cancelled,
        },
      });
    }

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'handle_dispute',
      resourceType: 'order_disputes',
      resourceId: order.dispute.id,
      resourceName: order.orderNo,
      requestMethod: 'PUT',
      requestPath: `/api/v1/admin/orders/${orderId}/dispute`,
      requestBody: JSON.stringify(request),
      newValues: JSON.stringify(updateData),
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'order.handle_dispute',
      targetId: orderId,
      changes: { resolution, refund_amount, ruling },
    });

    return {
      id: order.dispute.id,
      order_id: orderId,
      status: updatedDispute.status,
      resolved_at: updatedDispute.resolvedAt?.toISOString(),
      resolved_by: adminId,
      ruling: updatedDispute.ruling,
      refund_amount: updatedDispute.refundAmount,
    };
  }

  /**
   * Export orders
   */
  async exportOrders(
    request: ExportOrdersRequest,
    adminId: string,
    adminEmail: string
  ): Promise<ExportResult> {
    const { format, ...filters } = request;

    // Build where clause (similar to getOrderList)
    const where: any = {};

    if (filters.keyword) {
      where.OR = [
        { orderNo: { contains: filters.keyword, mode: 'insensitive' } },
        { title: { contains: filters.keyword, mode: 'insensitive' } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.campaign_id) {
      where.campaignId = filters.campaign_id;
    }

    if (filters.advertiser_id) {
      where.advertiserId = filters.advertiser_id;
    }

    if (filters.kol_id) {
      where.kolId = filters.kol_id;
    }

    if (filters.amount_min !== undefined || filters.amount_max !== undefined) {
      where.amount = {};
      if (filters.amount_min !== undefined) {
        where.amount.gte = filters.amount_min;
      }
      if (filters.amount_max !== undefined) {
        where.amount.lte = filters.amount_max;
      }
    }

    if (filters.created_after || filters.created_before) {
      where.createdAt = {};
      if (filters.created_after) {
        where.createdAt.gte = new Date(filters.created_after);
      }
      if (filters.created_before) {
        where.createdAt.lte = new Date(filters.created_before);
      }
    }

    // Get all matching orders
    const orders = await prisma.order.findMany({
      where,
      include: {
        campaign: { select: { title: true } },
        advertiser: { select: { companyName: true } },
        kol: { select: { platformUsername: true, platform: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV content
    let fileContent = '';
    const fileName = `orders_${new Date().toISOString().split('T')[0]}.${format}`;

    if (format === 'csv') {
      // CSV header
      const headers = ['订单号', '活动名称', '广告主', 'KOL', '平台', '金额', '状态', '创建时间'];
      fileContent = headers.join(',') + '\n';

      // CSV rows
      orders.forEach((order) => {
        const row = [
          order.orderNo,
          order.campaign.title,
          order.advertiser.companyName,
          order.kol.platformUsername,
          order.kol.platform,
          decimalToNumber(order.price).toString(),
          order.status,
          order.createdAt.toISOString(),
        ];
        fileContent += row.join(',') + '\n';
      });
    } else if (format === 'xlsx' || format === 'pdf') {
      // For xlsx and pdf, return a simple placeholder
      // In production, use libraries like exceljs or pdfkit
      fileContent = `Export format ${format} not fully implemented. Total orders: ${orders.length}`;
    }

    // Log admin action
    await logAdminAction({
      adminId,
      adminEmail,
      action: 'export',
      resourceType: 'orders',
      requestMethod: 'POST',
      requestPath: '/api/v1/admin/orders/export',
      requestBody: JSON.stringify(request),
      status: 'success',
    });

    logger.info('Admin action', {
      adminId,
      action: 'order.export',
      filters,
      total: orders.length,
      format,
    });

    return {
      fileContent,
      fileName,
      total: orders.length,
    };
  }
}

export const adminOrderService = new AdminOrderService();
