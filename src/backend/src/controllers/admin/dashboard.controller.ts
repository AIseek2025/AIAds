import { Request, Response } from 'express';
import { adminDashboardService } from '../../services/admin/dashboard.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { ApiResponse } from '../../types';

export class AdminDashboardController {
  /**
   * GET /api/v1/admin/dashboard/stats
   * Get platform statistics
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const { period = 'today' } = req.query;
    const adminId = req.admin?.id!;

    const result = await adminDashboardService.getStats(period as string, adminId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/admin/dashboard/analytics
   * Get analytics data for charts
   */
  getAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { metric = 'all', period = 'month' } = req.query;
    const adminId = req.admin?.id!;

    const result = await adminDashboardService.getAnalytics(
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
   * GET /api/v1/admin/dashboard/kol-rankings
   * Get KOL rankings
   */
  getKolRankings = asyncHandler(async (req: Request, res: Response) => {
    const { metric = 'earnings', limit = '10', platform } = req.query;
    const adminId = req.admin?.id!;

    const result = await adminDashboardService.getKolRankings(
      metric as string,
      parseInt(limit as string, 10),
      platform as string,
      adminId
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  });
}

export const adminDashboardController = new AdminDashboardController();
