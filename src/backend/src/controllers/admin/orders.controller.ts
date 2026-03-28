import { Request, Response } from 'express';
import { adminOrderService } from '../../services/admin/orders.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAdmin } from '../../middleware/adminAuth';
import { parseBodyOrRespond } from '../../middleware/validation';
import { ApiResponse } from '../../types';
import { z } from 'zod';

// Validation schemas
const updateOrderStatusSchema = z.object({
  status: z.enum(
    [
      'pending',
      'accepted',
      'rejected',
      'in_progress',
      'submitted',
      'approved',
      'revision',
      'published',
      'completed',
      'cancelled',
      'disputed',
    ] as const,
    {
      message: '无效的状态值',
    }
  ),
  reason: z.string().optional(),
});

const disputeOrderSchema = z
  .object({
    resolution: z.enum(['refund_full', 'refund_partial', 'no_refund', 'escalate'] as const, {
      message: '无效的解决方案',
    }),
    refund_amount: z.number().optional(),
    ruling: z.string().min(1, '裁决说明不能为空'),
    notify_parties: z.boolean().default(true),
  })
  .refine((d) => d.resolution !== 'refund_partial' || (d.refund_amount !== undefined && d.refund_amount > 0), {
    message: '部分退款须填写大于 0 的 refund_amount',
    path: ['refund_amount'],
  });

const updateOrderMetricsSchema = z
  .object({
    views: z.number().int().min(0).optional(),
    likes: z.number().int().min(0).optional(),
    comments: z.number().int().min(0).optional(),
    shares: z.number().int().min(0).optional(),
  })
  .refine((d) => d.views !== undefined || d.likes !== undefined || d.comments !== undefined || d.shares !== undefined, {
    message: '至少提供一个指标字段',
  });

const batchOrderMetricsSchema = z.object({
  items: z
    .array(
      z
        .object({
          order_id: z.string().min(1),
          views: z.number().int().min(0).optional(),
          likes: z.number().int().min(0).optional(),
          comments: z.number().int().min(0).optional(),
          shares: z.number().int().min(0).optional(),
        })
        .refine(
          (d) => d.views !== undefined || d.likes !== undefined || d.comments !== undefined || d.shares !== undefined,
          { message: '每项至少提供一个指标字段' }
        )
    )
    .min(1)
    .max(200),
});

const exportOrdersSchema = z.object({
  keyword: z.string().optional(),
  status: z.string().optional(),
  campaign_id: z.string().optional(),
  advertiser_id: z.string().optional(),
  kol_id: z.string().optional(),
  platform: z.string().optional(),
  amount_min: z.number().optional(),
  amount_max: z.number().optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  format: z.enum(['csv', 'xlsx', 'pdf'] as const).default('csv'),
});

export class AdminOrdersController {
  /**
   * GET /api/v1/admin/orders
   * Get order list with pagination and filters
   */
  getOrderList = asyncHandler(async (req: Request, res: Response) => {
    const {
      page,
      page_size,
      keyword,
      status,
      campaign_id,
      advertiser_id,
      kol_id,
      platform,
      amount_min,
      amount_max,
      created_after,
      created_before,
      sort,
      order,
    } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: page_size ? parseInt(page_size as string, 10) : 20,
      keyword: keyword as string,
      status: status as string,
      campaignId: campaign_id as string,
      advertiserId: advertiser_id as string,
      kolId: kol_id as string,
      platform: platform as string,
      amountMin: amount_min ? parseFloat(amount_min as string) : undefined,
      amountMax: amount_max ? parseFloat(amount_max as string) : undefined,
      createdAfter: created_after as string,
      createdBefore: created_before as string,
      sort: (sort as string) || 'created_at',
      order: (order as 'asc' | 'desc') || 'desc',
    };

    const adminId = requireAdmin(req).id;
    const result = await adminOrderService.getOrderList(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/orders/:id
   * Get order details by ID
   */
  getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = requireAdmin(req).id;

    const result = await adminOrderService.getOrderById(id.toString(), adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/orders/:id/metrics
   */
  updateOrderMetrics = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(updateOrderMetricsSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminOrderService.updateOrderMetrics(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '订单指标已更新',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/orders/metrics/batch
   */
  batchUpdateOrderMetrics = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(batchOrderMetricsSchema, req, res)) {
      return;
    }

    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminOrderService.batchUpdateOrderMetrics(req.body.items, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: `已处理 ${result.processed} 笔，失败 ${result.errors.length} 笔`,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/orders/:id/status
   * Update order status
   */
  updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(updateOrderStatusSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminOrderService.updateOrderStatus(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '订单状态已更新',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/orders/disputes
   * Get dispute orders
   */
  getDisputeOrders = asyncHandler(async (req: Request, res: Response) => {
    const { page, page_size, status, sort, order } = req.query;

    const filters = {
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: page_size ? parseInt(page_size as string, 10) : 20,
      status: status as string,
      sort: (sort as string) || 'created_at',
      order: (order as 'asc' | 'desc') || 'desc',
    };

    const adminId = requireAdmin(req).id;
    const result = await adminOrderService.getDisputeOrders(filters, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/admin/orders/:id/dispute
   * Handle order dispute
   */
  handleDispute = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(disputeOrderSchema, req, res)) {
      return;
    }

    const { id } = req.params;
    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminOrderService.handleDispute(id.toString(), req.body, adminId, adminEmail);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '订单纠纷已处理',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/admin/orders/export
   * Export orders
   */
  exportOrders = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(exportOrdersSchema, req, res)) {
      return;
    }

    const { id: adminId, email: adminEmail } = requireAdmin(req);

    const result = await adminOrderService.exportOrders(req.body, adminId, adminEmail);

    // Set download headers based on format
    const format = req.body.format || 'csv';
    const contentType =
      format === 'csv'
        ? 'text/csv'
        : format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="orders_${new Date().toISOString().split('T')[0]}.${format}"`
    );

    const response: ApiResponse<string> = {
      success: true,
      data: result.fileContent,
    };

    res.status(200).send(response.data);
  });
}

export const adminOrdersController = new AdminOrdersController();
