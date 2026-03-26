import { Request, Response } from 'express';
import { orderService } from '../services/orders.service';
import { asyncHandler, errors } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import { createOrderSchema } from '../utils/validator';
import { ApiResponse } from '../types';

export class OrderController {
  /**
   * POST /api/v1/orders
   * Create order
   */
  createOrder = asyncHandler(async (req: Request, res: Response) => {
    validateBody(createOrderSchema)(req, res, () => {});

    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId || userRole !== 'advertiser') {
      throw errors.forbidden('只有广告主可以创建订单');
    }

    // Get advertiser ID
    const advertiser = await this.getAdvertiserIdByUserId(userId);

    const order = await orderService.createOrder(advertiser, req.body);

    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
      message: '订单创建成功',
    };

    res.status(201).json(response);
  });

  /**
   * GET /api/v1/orders
   * Get orders list
   */
  getOrders = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { page = 1, page_size = 20, status, campaign_id } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (campaign_id) filters.campaign_id = campaign_id as string;

    const result = await orderService.getOrders(
      userId,
      userRole || 'advertiser',
      Number(page),
      Number(page_size),
      filters
    );

    const totalPages = Math.ceil(result.total / Number(page_size));

    const response: ApiResponse = {
      success: true,
      data: {
        items: result.items,
        pagination: {
          page: Number(page),
          page_size: Number(page_size),
          total: result.total,
          total_pages: totalPages,
          has_next: Number(page) < totalPages,
          has_prev: Number(page) > 1,
        },
      },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/orders/:id
   * Get order by ID
   */
  getOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { id } = req.params;

    const order = await orderService.getOrderById(id as string, userId, userRole);

    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/orders/:id/accept
   * Accept order (KOL action)
   */
  acceptOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { id } = req.params;

    const order = await orderService.acceptOrder(id as string, userId);

    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
      message: '订单已接受',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/orders/:id/reject
   * Reject order (KOL action)
   */
  rejectOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { id } = req.params;
    const { reason } = req.body;

    const order = await orderService.rejectOrder(id as string, userId, reason);

    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
      message: '订单已拒绝',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/orders/:id/complete
   * Complete order (advertiser action)
   */
  completeOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { id } = req.params;
    const { rating, review } = req.body;

    const order = await orderService.completeOrder(id as string, userId, rating, review);

    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
      message: '订单已完成',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/orders/:id/submit
   * Submit order work (KOL action)
   */
  submitOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { id } = req.params;
    const { draft_urls } = req.body;

    if (!draft_urls || !Array.isArray(draft_urls)) {
      throw errors.badRequest('需要提供 draft_urls 数组');
    }

    const order = await orderService.submitOrder(id as string, userId, draft_urls);

    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
      message: '作品已提交',
    };

    res.status(200).json(response);
  });

  /**
   * Helper: Get advertiser ID by user ID
   */
  private async getAdvertiserIdByUserId(userId: string): Promise<string> {
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!advertiser) {
      throw errors.notFound('广告主资料不存在，请先创建');
    }

    return advertiser.id;
  }
}

// Need to import prisma for helper method
import prisma from '../config/database';

export const orderController = new OrderController();
