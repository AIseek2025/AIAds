import { Request, Response } from 'express';
import { advertiserService } from '../services/advertisers.service';
import { asyncHandler, errors } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import { createAdvertiserSchema, updateAdvertiserSchema, rechargeSchema } from '../utils/validator';
import { ApiResponse } from '../types';

export class AdvertiserController {
  /**
   * POST /api/v1/advertisers
   * Create advertiser profile
   */
  createAdvertiser = asyncHandler(async (req: Request, res: Response) => {
    validateBody(createAdvertiserSchema)(req, res, () => {});

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const advertiser = await advertiserService.createAdvertiser(userId, req.body);

    const response: ApiResponse<typeof advertiser> = {
      success: true,
      data: advertiser,
      message: '广告主信息创建成功，请等待审核',
    };

    res.status(201).json(response);
  });

  /**
   * GET /api/v1/advertisers/me
   * Get current advertiser profile
   */
  getAdvertiser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const advertiser = await advertiserService.getAdvertiserByUserId(userId);

    if (!advertiser) {
      throw errors.notFound('广告主资料不存在，请先创建');
    }

    const response: ApiResponse<typeof advertiser> = {
      success: true,
      data: advertiser,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/advertisers/me
   * Update advertiser profile
   */
  updateAdvertiser = asyncHandler(async (req: Request, res: Response) => {
    validateBody(updateAdvertiserSchema)(req, res, () => {});

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const advertiser = await advertiserService.updateAdvertiser(userId, req.body);

    const response: ApiResponse<typeof advertiser> = {
      success: true,
      data: advertiser,
      message: '广告主信息更新成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/advertisers/me/recharge
   * Recharge advertiser account
   */
  recharge = asyncHandler(async (req: Request, res: Response) => {
    validateBody(rechargeSchema)(req, res, () => {});

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const transaction = await advertiserService.recharge(userId, req.body);

    const response: ApiResponse<typeof transaction> = {
      success: true,
      data: transaction,
      message: '充值申请已提交',
    };

    res.status(201).json(response);
  });

  /**
   * GET /api/v1/advertisers/me/balance
   * Get advertiser balance
   */
  getBalance = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const balance = await advertiserService.getBalance(userId);

    const response: ApiResponse<typeof balance> = {
      success: true,
      data: balance,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/advertisers/me/transactions
   * Get transaction history
   */
  getTransactions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const { page = 1, page_size = 20, type } = req.query;

    const result = await advertiserService.getTransactions(
      userId,
      Number(page),
      Number(page_size),
      type as string
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
}

export const advertiserController = new AdvertiserController();
