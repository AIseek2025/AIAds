import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import { getBudgetRiskThreshold } from '../utils/budgetRiskThreshold';
import { getAdvertiserLowBalanceAlertCny } from '../utils/advertiserUiConfig';
import { getKolAcceptFrequencyConfig } from '../services/kol-frequency.service';

/**
 * 无需登录：前端展示用阈值（与业务接口语义一致，不含密钥）
 */
export class PublicController {
  getUiConfig = asyncHandler(async (_req: Request, res: Response) => {
    const freq = getKolAcceptFrequencyConfig();
    const body: ApiResponse<{
      budget_risk_threshold: number;
      low_balance_alert_cny: number;
      kol_accept_frequency: {
        enabled: boolean;
        rolling_days: number;
        max_accepts: number;
      };
    }> = {
      success: true,
      data: {
        budget_risk_threshold: getBudgetRiskThreshold(),
        low_balance_alert_cny: getAdvertiserLowBalanceAlertCny(),
        kol_accept_frequency: {
          enabled: freq.enabled,
          rolling_days: freq.rollingDays,
          max_accepts: freq.maxAccepts,
        },
      },
    };
    res.status(200).json(body);
  });
}

export const publicController = new PublicController();
