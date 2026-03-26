import { Request, Response } from 'express';
import { kolService } from '../services/kols.service';
import { earningsService } from '../services/earnings.service';
import { asyncHandler, errors } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import {
  createKolSchema,
  updateKolSchema,
  bindKolAccountSchema,
  syncKolDataSchema,
  withdrawSchema,
} from '../utils/validator';
import { ApiResponse } from '../types';

export class KolsController {
  /**
   * POST /api/v1/kols/profile
   * Create KOL profile
   */
  createProfile = asyncHandler(async (req: Request, res: Response) => {
    validateBody(createKolSchema)(req, res, () => {});

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.createKol(userId, req.body);

    const response: ApiResponse<typeof kol> = {
      success: true,
      data: kol,
      message: 'KOL 资料创建成功，请等待审核',
    };

    res.status(201).json(response);
  });

  /**
   * GET /api/v1/kols/me
   * Get current KOL profile
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);

    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const response: ApiResponse<typeof kol> = {
      success: true,
      data: kol,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/kols/me
   * Update KOL profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    validateBody(updateKolSchema)(req, res, () => {});

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.updateKol(userId, req.body);

    const response: ApiResponse<typeof kol> = {
      success: true,
      data: kol,
      message: 'KOL 信息更新成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/kols/connect/:platform
   * Bind social account
   */
  bindAccount = asyncHandler(async (req: Request, res: Response) => {
    validateBody(bindKolAccountSchema)(req, res, () => {});

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    // Override platform from URL parameter
    const { platform } = req.params;
    const validPlatforms = ['tiktok', 'youtube', 'instagram', 'xiaohongshu', 'weibo'];
    if (!validPlatforms.includes(platform.toString())) {
      throw errors.badRequest('不支持的平台');
    }

    const account = await kolService.bindAccount(kol.id, {
      ...req.body,
      platform: platform.toString() as any,
    });

    const response: ApiResponse<typeof account> = {
      success: true,
      data: account,
      message: '账号绑定成功',
    };

    res.status(201).json(response);
  });

  /**
   * GET /api/v1/kols/accounts
   * Get bound accounts
   */
  getAccounts = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const accounts = await kolService.getAccounts(kol.id);

    const response: ApiResponse<typeof accounts> = {
      success: true,
      data: accounts,
    };

    res.status(200).json(response);
  });

  /**
   * DELETE /api/v1/kols/accounts/:id
   * Unbind account
   */
  unbindAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const { id } = req.params;
    await kolService.unbindAccount(kol.id, id.toString());

    const response: ApiResponse = {
      success: true,
      message: '账号解绑成功',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/kols/sync
   * Sync KOL data
   */
  syncData = asyncHandler(async (req: Request, res: Response) => {
    validateBody(syncKolDataSchema)(req, res, () => {});

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const result = await kolService.syncData(kol.id, req.body.account_ids);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: `数据同步完成，成功${result.synced}个，失败${result.failed}个`,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/kols/earnings
   * Get earnings summary
   */
  getEarnings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const earnings = await earningsService.getEarnings(kol.id);

    const response: ApiResponse<typeof earnings> = {
      success: true,
      data: earnings,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/kols/balance
   * Get available balance
   */
  getBalance = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const balance = await earningsService.getBalance(kol.id);

    const response: ApiResponse<typeof balance> = {
      success: true,
      data: balance,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/kols/withdraw
   * Request withdrawal
   */
  withdraw = asyncHandler(async (req: Request, res: Response) => {
    validateBody(withdrawSchema)(req, res, () => {});

    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const withdrawal = await earningsService.requestWithdrawal(kol.id, req.body);

    const response: ApiResponse<typeof withdrawal> = {
      success: true,
      data: withdrawal,
      message: '提现申请已提交，请等待审核',
    };

    res.status(201).json(response);
  });

  /**
   * GET /api/v1/kols/withdrawals
   * Get withdrawal history
   */
  getWithdrawals = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const { page = 1, page_size = 20, status } = req.query;

    const result = await earningsService.getWithdrawalHistory(
      kol.id,
      Number(page),
      Number(page_size),
      status ? { status: status as string } : undefined
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

export const kolsController = new KolsController();
