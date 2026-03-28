import { Request, Response } from 'express';
import { kolService } from '../services/kols.service';
import { aiMatchingService } from '../services/ai-matching.service';
import { earningsService } from '../services/earnings.service';
import { kolFrequencyService } from '../services/kol-frequency.service';
import { asyncHandler, errors } from '../middleware/errorHandler';
import { parseBodyOrRespond } from '../middleware/validation';
import {
  createKolSchema,
  updateKolSchema,
  bindKolAccountSchema,
  syncKolDataSchema,
  withdrawSchema,
} from '../utils/validator';
import { ApiResponse, type BindKolAccountRequest } from '../types';

export class KolsController {
  /**
   * POST /api/v1/kols/profile
   * Create KOL profile
   */
  createProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(createKolSchema, req, res)) {
      return;
    }

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
   * GET /api/v1/kols/me/stats
   * KOL 仪表盘聚合（订单、流水、曝光）
   */
  getMyStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const stats = await kolService.getKolStats(kol.id);

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/kols/me/frequency
   * 滚动窗口内接单次数与剩余额度（与 acceptOrder 校验一致）
   */
  getMyAcceptFrequency = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const snapshot = await kolFrequencyService.getSnapshotForKol(kol.id);

    const response: ApiResponse<typeof snapshot> = {
      success: true,
      data: snapshot,
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/v1/kols/me
   * Update KOL profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!parseBodyOrRespond(updateKolSchema, req, res)) {
      return;
    }

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
    if (!parseBodyOrRespond(bindKolAccountSchema, req, res)) {
      return;
    }

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
      platform: platform.toString() as BindKolAccountRequest['platform'],
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
    if (!parseBodyOrRespond(syncKolDataSchema, req, res)) {
      return;
    }

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
   * GET /api/v1/kols/earnings/history
   * Paginated transaction history (order_income, withdrawal, etc.)
   */
  getEarningsHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('KOL 资料不存在，请先创建');
    }

    const { page = 1, page_size = 20, status, type } = req.query;

    const result = await earningsService.getEarningsHistory(kol.id, Number(page), Number(page_size), {
      status: status ? String(status) : undefined,
      type: type ? String(type) : undefined,
    });

    const ps = Number(page_size);
    const totalPages = Math.ceil(result.total / ps);

    const response: ApiResponse = {
      success: true,
      data: {
        items: result.items,
        pagination: {
          page: Number(page),
          page_size: ps,
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
    if (!parseBodyOrRespond(withdrawSchema, req, res)) {
      return;
    }

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

  /**
   * GET /api/v1/kols
   * 发现页：筛选 KOL 列表（广告主 / KOL 可访问）
   */
  searchKols = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }
    if (role !== 'advertiser' && role !== 'kol') {
      throw errors.forbidden('仅广告主或 KOL 可浏览 KOL 库');
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const page_size = Math.min(100, Math.max(1, Number(req.query.page_size) || 20));

    const filters = {
      platform: req.query.platform as string | undefined,
      min_followers: req.query.min_followers !== undefined ? Number(req.query.min_followers) : undefined,
      max_followers: req.query.max_followers !== undefined ? Number(req.query.max_followers) : undefined,
      categories: req.query.categories as string | undefined,
      regions: req.query.regions as string | undefined,
      min_engagement_rate:
        req.query.min_engagement_rate !== undefined ? Number(req.query.min_engagement_rate) : undefined,
      keyword: req.query.keyword as string | undefined,
    };

    const result = await kolService.searchKols(page, page_size, filters);
    const totalPages = Math.ceil(result.total / page_size);

    const response: ApiResponse = {
      success: true,
      data: {
        items: result.items,
        pagination: {
          page,
          page_size,
          total: result.total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
      },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/kols/recommend?campaignId=&limit=
   * 基于活动配置的规则匹配评分（可解释，非向量模型）
   */
  recommendKols = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }
    if (req.user?.role !== 'advertiser') {
      throw errors.forbidden('仅广告主可获取推荐');
    }

    const campaignId = req.query.campaignId as string | undefined;
    const limitRaw = req.query.limit !== undefined ? Number(req.query.limit) : 20;
    const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));

    if (!campaignId?.trim()) {
      throw errors.badRequest('缺少 campaignId');
    }

    const recommendations = await aiMatchingService.recommendKols(campaignId, userId, limit);

    const response: ApiResponse = {
      success: true,
      data: {
        recommendations,
        total: recommendations.length,
      },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/kols/:id
   * 发现页：查看单个 KOL 公开摘要
   */
  getKolDiscovery = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }
    if (role !== 'advertiser' && role !== 'kol') {
      throw errors.forbidden('仅广告主或 KOL 可查看');
    }

    const id = String(req.params.id);
    const kol = await kolService.getKolForAdvertiserDiscovery(id);

    const response: ApiResponse<typeof kol> = {
      success: true,
      data: kol,
    };

    res.status(200).json(response);
  });
}

export const kolsController = new KolsController();
