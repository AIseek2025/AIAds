import api from './api';
import type {
  Campaign,
  Advertiser,
  ApiResponse,
  ListResponse,
  Kol,
} from '../types';

// Advertiser API endpoints
export const advertiserAPI = {
  /**
   * Get current advertiser profile
   */
  getProfile: async (): Promise<Advertiser> => {
    const response = await api.get<ApiResponse<Advertiser>>('/advertisers/me');
    return response.data.data!;
  },

  /**
   * Create advertiser profile
   */
  createProfile: async (data: Partial<Advertiser>): Promise<Advertiser> => {
    const response = await api.post<ApiResponse<Advertiser>>(
      '/advertisers',
      data
    );
    return response.data.data!;
  },

  /**
   * Update advertiser profile
   */
  updateProfile: async (data: Partial<Advertiser>): Promise<Advertiser> => {
    const response = await api.patch<ApiResponse<Advertiser>>(
      '/advertisers/me',
      data
    );
    return response.data.data!;
  },

  /**
   * Get balance
   */
  getBalance: async (): Promise<{
    wallet_balance: number;
    frozen_balance: number;
    total_recharged: number;
    total_spent: number;
  }> => {
    const response = await api.get<ApiResponse<{
      wallet_balance: number;
      frozen_balance: number;
      total_recharged: number;
      total_spent: number;
    }>>('/advertisers/me/balance');
    return response.data.data!;
  },

  /**
   * Recharge
   */
  recharge: async (data: {
    amount: number;
    paymentMethod: string;
    paymentProof?: string;
  }): Promise<void> => {
    await api.post('/advertisers/me/recharge', data);
  },

  /**
   * Get transactions
   */
  getTransactions: async (params?: {
    page?: number;
    page_size?: number;
    type?: string;
  }): Promise<ListResponse<any>> => {
    const response = await api.get<ApiResponse<ListResponse<any>>>(
      '/advertisers/me/transactions',
      { params }
    );
    return response.data.data!;
  },
};

// Campaign API endpoints
export const campaignAPI = {
  /**
   * Get campaigns list
   */
  getCampaigns: async (params?: {
    page?: number;
    page_size?: number;
    status?: Campaign['status'];
    keyword?: string;
  }): Promise<ListResponse<Campaign>> => {
    const response = await api.get<ApiResponse<ListResponse<Campaign>>>(
      '/campaigns',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get campaign by ID
   */
  getCampaign: async (id: string): Promise<Campaign> => {
    const response = await api.get<ApiResponse<Campaign>>(`/campaigns/${id}`);
    return response.data.data!;
  },

  /**
   * Create campaign
   */
  createCampaign: async (data: Partial<Campaign>): Promise<Campaign> => {
    const response = await api.post<ApiResponse<Campaign>>(
      '/campaigns',
      data
    );
    return response.data.data!;
  },

  /**
   * Update campaign
   */
  updateCampaign: async (
    id: string,
    data: Partial<Campaign>
  ): Promise<Campaign> => {
    const response = await api.patch<ApiResponse<Campaign>>(
      `/campaigns/${id}`,
      data
    );
    return response.data.data!;
  },

  /**
   * Delete campaign
   */
  deleteCampaign: async (id: string): Promise<void> => {
    await api.delete(`/campaigns/${id}`);
  },

  /**
   * Submit campaign
   */
  submitCampaign: async (id: string): Promise<Campaign> => {
    const response = await api.post<ApiResponse<Campaign>>(
      `/campaigns/${id}/submit`
    );
    return response.data.data!;
  },

  /**
   * Get campaign statistics
   */
  getCampaignStats: async (id: string): Promise<{
    total_views: number;
    total_likes: number;
    total_comments: number;
    total_clicks: number;
    total_conversions: number;
    ctr: number;
    conversion_rate: number;
  }> => {
    const response = await api.get<ApiResponse<{
      total_views: number;
      total_likes: number;
      total_comments: number;
      total_clicks: number;
      total_conversions: number;
      ctr: number;
      conversion_rate: number;
    }>>(`/campaigns/${id}/stats`);
    return response.data.data!;
  },
};

// KOL API endpoints
export const kolAPI = {
  /**
   * Get KOLs list
   */
  getKols: async (params?: {
    page?: number;
    page_size?: number;
    platform?: string;
    min_followers?: number;
    max_followers?: number;
    category?: string;
    country?: string;
    min_engagement_rate?: number;
    keyword?: string;
  }): Promise<ListResponse<Kol>> => {
    const response = await api.get<ApiResponse<ListResponse<Kol>>>(
      '/kols',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get KOL by ID
   */
  getKol: async (id: string): Promise<Kol> => {
    const response = await api.get<ApiResponse<Kol>>(`/kols/${id}`);
    return response.data.data!;
  },

  /**
   * Get recommended KOLs
   */
  getRecommendedKols: async (campaignId: string, limit?: number): Promise<{
    recommendations: Array<{
      kol: Kol;
      match_score: number;
      match_reasons: string[];
      estimated_reach: number;
      estimated_engagement: number;
    }>;
    total: number;
  }> => {
    const response = await api.get<ApiResponse<{
      recommendations: Array<{
        kol: Kol;
        match_score: number;
        match_reasons: string[];
        estimated_reach: number;
        estimated_engagement: number;
      }>;
      total: number;
    }>>('/kols/recommend', { params: { campaignId, limit } });
    return response.data.data!;
  },

  /**
   * Contact KOL
   */
  contactKol: async (kolId: string, message: string): Promise<void> => {
    await api.post('/kols/contact', { kolId, message });
  },
};

export default {
  advertiser: advertiserAPI,
  campaign: campaignAPI,
  kol: kolAPI,
};
