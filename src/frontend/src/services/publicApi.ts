import api from './api';
import type { ApiResponse } from '../types';

export interface PublicUiConfig {
  budget_risk_threshold: number;
  low_balance_alert_cny: number;
  kol_accept_frequency: {
    enabled: boolean;
    rolling_days: number;
    max_accepts: number;
  };
}

export const publicUiConfigQueryKey = ['public', 'ui-config'] as const;

export const publicApi = {
  async getUiConfig(): Promise<PublicUiConfig> {
    const { data } = await api.get<ApiResponse<PublicUiConfig>>('/public/ui-config');
    return data.data!;
  },
};
