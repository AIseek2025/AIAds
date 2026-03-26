import { Request, Response } from 'express';
import { adminStatsService } from '../../services/admin/stats.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { ApiResponse } from '../../types';
import { z } from 'zod';

// Validation schemas
const statsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional().default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const exportStatsSchema = z.object({
  type: z.enum(['users', 'campaigns', 'revenue', 'kols', 'all']),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional().default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(['csv', 'xlsx', 'pdf']).optional().default('csv'),
});

export class AdminStatsController {
  /**
   * GET /api/v1/admin/stats/overview
   * Get platform statistics overview
   */
  getOverview = asyncHandler(async (req: Request, res: Response) => {
    const query = statsQuerySchema.parse(req.query);
    const adminId = req.admin?.id!;

    const result = await adminStatsService.getOverview(query, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/stats/users
   * Get user statistics
   */
  getUserStats = asyncHandler(async (req: Request, res: Response) => {
    const query = statsQuerySchema.parse(req.query);
    const adminId = req.admin?.id!;

    const result = await adminStatsService.getUserStats(query, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/stats/campaigns
   * Get campaign statistics
   */
  getCampaignStats = asyncHandler(async (req: Request, res: Response) => {
    const query = statsQuerySchema.parse(req.query);
    const adminId = req.admin?.id!;

    const result = await adminStatsService.getCampaignStats(query, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/stats/revenue
   * Get revenue statistics
   */
  getRevenueStats = asyncHandler(async (req: Request, res: Response) => {
    const query = statsQuerySchema.parse(req.query);
    const adminId = req.admin?.id!;

    const result = await adminStatsService.getRevenueStats(query, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/stats/kols
   * Get KOL statistics
   */
  getKolStats = asyncHandler(async (req: Request, res: Response) => {
    const query = statsQuerySchema.parse(req.query);
    const adminId = req.admin?.id!;

    const result = await adminStatsService.getKolStats(query, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/stats/orders
   * Get order statistics
   */
  getOrderStats = asyncHandler(async (req: Request, res: Response) => {
    const query = statsQuerySchema.parse(req.query);
    const adminId = req.admin?.id!;

    const result = await adminStatsService.getOrderStats(query, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/stats/content
   * Get content statistics
   */
  getContentStats = asyncHandler(async (req: Request, res: Response) => {
    const query = statsQuerySchema.parse(req.query);
    const adminId = req.admin?.id!;

    const result = await adminStatsService.getContentStats(query, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/stats/export
   * Export statistics data
   */
  exportStats = asyncHandler(async (req: Request, res: Response) => {
    const query = exportStatsSchema.parse(req.query);
    const adminId = req.admin?.id!;

    const result = await adminStatsService.exportStats(query, adminId);

    // Set download headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stats_${query.type}_${query.period || query.startDate}_${query.endDate}.csv"`
    );

    const response: ApiResponse<string> = {
      success: true,
      data: result.csvData,
    };

    res.status(200).send(response.data);
  });

  /**
   * GET /api/v1/admin/stats/trends
   * Get statistics trends
   */
  getTrends = asyncHandler(async (req: Request, res: Response) => {
    const { metric, period = 'month' } = req.query;

    const adminId = req.admin?.id!;

    const result = await adminStatsService.getTrends(
      metric as string,
      period as string,
      adminId
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/stats/comparison
   * Get statistics comparison (period over period)
   */
  getComparison = asyncHandler(async (req: Request, res: Response) => {
    const { metric, currentPeriod, previousPeriod } = req.query;

    const adminId = req.admin?.id!;

    const result = await adminStatsService.getComparison(
      metric as string,
      currentPeriod as string,
      previousPeriod as string,
      adminId
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });
}

export const adminStatsController = new AdminStatsController();
