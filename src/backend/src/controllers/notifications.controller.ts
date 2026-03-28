import { Request, Response } from 'express';
import { asyncHandler, errors } from '../middleware/errorHandler';
import { notificationService } from '../services/notifications.service';
import type { ApiResponse } from '../types';

export class NotificationsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 20));
    const unreadOnly = req.query.unread_only === '1' || req.query.unread_only === 'true';

    const { items, pagination } = await notificationService.listForUser(userId, page, pageSize, unreadOnly);
    const response: ApiResponse<{ items: typeof items; pagination: typeof pagination }> = {
      success: true,
      data: { items, pagination },
    };
    res.status(200).json(response);
  });

  unreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }
    const count = await notificationService.unreadCount(userId);
    const response: ApiResponse<{ unread_count: number }> = {
      success: true,
      data: { unread_count: count },
    };
    res.status(200).json(response);
  });

  markRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }
    const { id } = req.params;
    const row = await notificationService.markRead(userId, id as string);
    const response: ApiResponse<typeof row> = {
      success: true,
      data: row,
    };
    res.status(200).json(response);
  });

  markAllRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }
    const result = await notificationService.markAllRead(userId);
    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: '已全部标为已读',
    };
    res.status(200).json(response);
  });
}

export const notificationsController = new NotificationsController();
