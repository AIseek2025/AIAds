import { Request, Response } from 'express';
import { tasksService } from '../services/tasks.service';
import { kolService } from '../services/kols.service';
import { orderService } from '../services/orders.service';
import { asyncHandler, errors } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import { applyTaskSchema, submitOrderSchema, reviseOrderSchema } from '../utils/validator';
import { ApiResponse } from '../types';

export class TasksController {
  /**
   * GET /api/v1/tasks
   * Get available tasks for KOL
   */
  getTasks = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const { page = 1, page_size = 20, platform, min_budget, max_budget, status } = req.query;

    const filters: any = {};
    if (platform) filters.platform = platform as string;
    if (min_budget) filters.min_budget = Number(min_budget);
    if (max_budget) filters.max_budget = Number(max_budget);
    if (status) filters.status = status as string;

    const result = await tasksService.getAvailableTasks(
      kol.id,
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
   * GET /api/v1/tasks/:id
   * Get task details
   */
  getTask = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const { id } = req.params;

    const task = await tasksService.getTaskById(id as string, kol.id);

    const response: ApiResponse<typeof task> = {
      success: true,
      data: task,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/tasks/:id/apply
   * Apply for a task
   */
  applyForTask = asyncHandler(async (req: Request, res: Response) => {
    validateBody(applyTaskSchema)(req, res, () => {});

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const { id } = req.params;

    const order = await tasksService.applyForTask(kol.id, id as string, req.body);

    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
      message: '任务申请已提交，请等待广告主确认',
    };

    res.status(201).json(response);
  });

  /**
   * GET /api/v1/kols/orders
   * Get KOL orders list
   */
  getOrders = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const { page = 1, page_size = 20, status, campaign_id } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (campaign_id) filters.campaign_id = campaign_id as string;

    const result = await orderService.getOrders(
      userId,
      'kol',
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
   * GET /api/v1/kols/orders/:id
   * Get order details
   */
  getOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { id } = req.params;

    const order = await orderService.getOrderById(id as string, userId, 'kol');

    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/kols/orders/:id/accept
   * Accept order
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
   * PUT /api/v1/kols/orders/:id/reject
   * Reject order
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
   * PUT /api/v1/kols/orders/:id/submit
   * Submit order work
   */
  submitOrder = asyncHandler(async (req: Request, res: Response) => {
    validateBody(submitOrderSchema)(req, res, () => {});

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { id } = req.params;

    const order = await orderService.submitOrder(id as string, userId, req.body.draft_urls);

    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
      message: '作品已提交，请等待广告主审核',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/kols/orders/:id/revise
   * Revise order work
   */
  reviseOrder = asyncHandler(async (req: Request, res: Response) => {
    validateBody(reviseOrderSchema)(req, res, () => {});

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { id } = req.params;

    // Use submitOrder since revision is essentially a resubmission
    const order = await orderService.submitOrder(id as string, userId, req.body.draft_urls);

    const response: ApiResponse<typeof order> = {
      success: true,
      data: order,
      message: '修改作品已提交，请等待广告主审核',
    };

    res.status(200).json(response);
  });
}

export const tasksController = new TasksController();
