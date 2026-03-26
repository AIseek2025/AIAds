import axios, { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  ListResponse,
  AdminAuthResponse,
  AdminLoginData,
  Admin,
  AdminUser,
  UserListParams,
  KolApplication,
  KolDetail,
  KolListParams,
  ContentItem,
  ContentListParams,
  Transaction,
  Withdrawal,
  TransactionListParams,
  DashboardStats,
  AnalyticsData,
  DashboardKolRankings,
  SystemSettings,
  AuditLog,
  AuditLogListParams,
  AdminRoleDefinition,
  // Advertiser types
  AdvertiserListItem,
  AdvertiserDetail,
  AdvertiserListParams,
  RechargeRecord,
  ConsumptionRecord,
  BalanceAdjustment,
  // Campaign types
  CampaignListItem,
  CampaignDetail,
  CampaignListParams,
  CampaignStats,
  CampaignAnomaly,
  // Order types
  OrderListItem,
  OrderDetail,
  OrderListParams,
  OrderDispute,
  // Advanced settings types
  SensitiveWord,
  SystemMonitor,
  BackupRecord,
} from '../types';

// Admin API base URL from environment
const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:8080/api/v1/admin';

// Create axios instance for admin API
const adminApi: AxiosInstance = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - Add admin auth token
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminAccessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors and token refresh
adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${ADMIN_API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data.data;
        localStorage.setItem('adminAccessToken', access_token);
        localStorage.setItem('adminRefreshToken', refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return adminApi(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ==================== Auth APIs ====================

export const adminAuthAPI = {
  /**
   * Admin login
   */
  login: async (data: AdminLoginData): Promise<AdminAuthResponse> => {
    const response = await adminApi.post<ApiResponse<AdminAuthResponse>>('/auth/login', data);
    return response.data.data!;
  },

  /**
   * Refresh token
   */
  refreshToken: async (refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> => {
    const response = await adminApi.post<ApiResponse<{ access_token: string; refresh_token: string; expires_in: number }>>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data.data!;
  },

  /**
   * Get current admin info
   */
  getCurrentAdmin: async (): Promise<{ admin: Admin; role?: AdminRoleDefinition; permissions: string[] }> => {
    const response = await adminApi.get<ApiResponse<{ admin: Admin; role?: AdminRoleDefinition; permissions: string[] }>>('/auth/me');
    return response.data.data!;
  },

  /**
   * Admin logout
   */
  logout: async (): Promise<void> => {
    await adminApi.post('/auth/logout');
  },

  /**
   * Change password
   */
  changePassword: async (data: { current_password: string; new_password: string }): Promise<void> => {
    await adminApi.post('/auth/change-password', data);
  },
};

// ==================== User Management APIs ====================

export const adminUserAPI = {
  /**
   * Get user list
   */
  getUsers: async (params: UserListParams): Promise<ListResponse<AdminUser>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<AdminUser>>>('/users', { params });
    return response.data.data!;
  },

  /**
   * Get user detail
   */
  getUser: async (id: string): Promise<AdminUser> => {
    const response = await adminApi.get<ApiResponse<AdminUser>>(`/users/${id}`);
    return response.data.data!;
  },

  /**
   * Ban user
   */
  banUser: async (id: string, data: { reason: string; duration_days?: number | null; note?: string }): Promise<AdminUser> => {
    const response = await adminApi.post<ApiResponse<AdminUser>>(`/users/${id}/ban`, data);
    return response.data.data!;
  },

  /**
   * Unban user
   */
  unbanUser: async (id: string, data?: { note?: string }): Promise<AdminUser> => {
    const response = await adminApi.post<ApiResponse<AdminUser>>(`/users/${id}/unban`, data);
    return response.data.data!;
  },

  /**
   * Suspend user
   */
  suspendUser: async (id: string, data: { reason: string; duration_hours: number }): Promise<AdminUser> => {
    const response = await adminApi.post<ApiResponse<AdminUser>>(`/users/${id}/suspend`, data);
    return response.data.data!;
  },

  /**
   * Reset user password
   */
  resetUserPassword: async (id: string, data: { new_password: string; send_email?: boolean }): Promise<void> => {
    await adminApi.post(`/users/${id}/reset-password`, data);
  },
};

// ==================== KOL Review APIs ====================

export const adminKolAPI = {
  /**
   * Get pending KOL applications
   */
  getPendingKols: async (params?: { page?: number; page_size?: number; platform?: string }): Promise<ListResponse<KolApplication>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<KolApplication>>>('/kols/pending', { params });
    return response.data.data!;
  },

  /**
   * Get KOL list
   */
  getKols: async (params: KolListParams): Promise<ListResponse<KolApplication>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<KolApplication>>>('/kols', { params });
    return response.data.data!;
  },

  /**
   * Get KOL detail
   */
  getKol: async (id: string): Promise<KolDetail> => {
    const response = await adminApi.get<ApiResponse<KolDetail>>(`/kols/${id}`);
    return response.data.data!;
  },

  /**
   * Approve KOL
   */
  approveKol: async (id: string, data?: { note?: string; set_verified?: boolean }): Promise<KolDetail> => {
    const response = await adminApi.post<ApiResponse<KolDetail>>(`/kols/${id}/approve`, data);
    return response.data.data!;
  },

  /**
   * Reject KOL
   */
  rejectKol: async (id: string, data: { reason: string; note?: string }): Promise<KolDetail> => {
    const response = await adminApi.post<ApiResponse<KolDetail>>(`/kols/${id}/reject`, data);
    return response.data.data!;
  },

  /**
   * Suspend KOL
   */
  suspendKol: async (id: string, data: { reason: string; duration_days: number }): Promise<void> => {
    await adminApi.post(`/kols/${id}/suspend`, data);
  },
};

// ==================== Content Review APIs ====================

export const adminContentAPI = {
  /**
   * Get pending content
   */
  getPendingContent: async (params?: { page?: number; page_size?: number; content_type?: string; source_type?: string }): Promise<ListResponse<ContentItem>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<ContentItem>>>('/content/pending', { params });
    return response.data.data!;
  },

  /**
   * Get content list
   */
  getContent: async (params: ContentListParams): Promise<ListResponse<ContentItem>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<ContentItem>>>('/content', { params });
    return response.data.data!;
  },

  /**
   * Get content detail
   */
  getContentDetail: async (id: string): Promise<ContentItem> => {
    const response = await adminApi.get<ApiResponse<ContentItem>>(`/content/${id}`);
    return response.data.data!;
  },

  /**
   * Approve content
   */
  approveContent: async (id: string, data?: { note?: string }): Promise<void> => {
    await adminApi.post(`/content/${id}/approve`, data);
  },

  /**
   * Reject content
   */
  rejectContent: async (id: string, data: { reason: string; require_revision?: boolean; revision_note?: string }): Promise<void> => {
    await adminApi.post(`/content/${id}/reject`, data);
  },

  /**
   * Delete content
   */
  deleteContent: async (id: string, data: { reason: string; notify_user?: boolean; ban_user?: boolean }): Promise<void> => {
    await adminApi.delete(`/content/${id}`, { data });
  },
};

// ==================== Finance APIs ====================

export const adminFinanceAPI = {
  /**
   * Get transaction list
   */
  getTransactions: async (params: TransactionListParams): Promise<ListResponse<Transaction>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<Transaction>>>('/finance/transactions', { params });
    return response.data.data!;
  },

  /**
   * Get pending withdrawals
   */
  getPendingWithdrawals: async (params?: { page?: number; page_size?: number; min_amount?: number; max_amount?: number }): Promise<ListResponse<Withdrawal>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<Withdrawal>>>('/finance/withdrawals/pending', { params });
    return response.data.data!;
  },

  /**
   * Get withdrawal detail
   */
  getWithdrawal: async (id: string): Promise<Withdrawal> => {
    const response = await adminApi.get<ApiResponse<Withdrawal>>(`/finance/withdrawals/${id}`);
    return response.data.data!;
  },

  /**
   * Approve withdrawal
   */
  approveWithdrawal: async (id: string, data: { note?: string; mfa_code?: string }): Promise<void> => {
    await adminApi.post(`/finance/withdrawals/${id}/approve`, data);
  },

  /**
   * Reject withdrawal
   */
  rejectWithdrawal: async (id: string, data: { reason: string; note?: string }): Promise<void> => {
    await adminApi.post(`/finance/withdrawals/${id}/reject`, data);
  },

  /**
   * Export transactions
   */
  exportTransactions: async (data: {
    format?: 'csv' | 'xlsx';
    filters?: Partial<TransactionListParams>;
    fields?: string[];
  }): Promise<{ download_url: string; expires_at: string; record_count: number }> => {
    const response = await adminApi.post<ApiResponse<{ download_url: string; expires_at: string; record_count: number }>>('/finance/transactions/export', data);
    return response.data.data!;
  },
};

// ==================== Dashboard APIs ====================

export const adminDashboardAPI = {
  /**
   * Get dashboard statistics
   */
  getStats: async (params?: { period?: string; start_date?: string; end_date?: string }): Promise<DashboardStats> => {
    const response = await adminApi.get<ApiResponse<DashboardStats>>('/dashboard/stats', { params });
    return response.data.data!;
  },

  /**
   * Get analytics data
   */
  getAnalytics: async (params?: { metric?: string; period?: string; group_by?: string }): Promise<AnalyticsData> => {
    const response = await adminApi.get<ApiResponse<AnalyticsData>>('/dashboard/analytics', { params });
    return response.data.data!;
  },

  /**
   * Get KOL rankings
   */
  getKolRankings: async (params?: { metric?: string; limit?: number; platform?: string }): Promise<DashboardKolRankings> => {
    const response = await adminApi.get<ApiResponse<DashboardKolRankings>>('/dashboard/kol-rankings', { params });
    return response.data.data!;
  },
};

// ==================== Settings APIs ====================

export const adminSettingsAPI = {
  /**
   * Get system settings
   */
  getSettings: async (): Promise<SystemSettings> => {
    const response = await adminApi.get<ApiResponse<SystemSettings>>('/settings');
    return response.data.data!;
  },

  /**
   * Update system settings
   */
  updateSettings: async (data: Partial<SystemSettings>): Promise<void> => {
    await adminApi.patch('/settings', data);
  },

  /**
   * Get admin roles
   */
  getRoles: async (): Promise<AdminRoleDefinition[]> => {
    const response = await adminApi.get<ApiResponse<AdminRoleDefinition[]>>('/settings/roles');
    return response.data.data!;
  },

  /**
   * Create role
   */
  createRole: async (data: { name: string; description: string; permissions: string[] }): Promise<AdminRoleDefinition> => {
    const response = await adminApi.post<ApiResponse<AdminRoleDefinition>>('/settings/roles', data);
    return response.data.data!;
  },

  /**
   * Get audit logs
   */
  getAuditLogs: async (params: AuditLogListParams): Promise<ListResponse<AuditLog>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<AuditLog>>>('/settings/audit-logs', { params });
    return response.data.data!;
  },

  /**
   * Get admin list
   */
  getAdmins: async (): Promise<Admin[]> => {
    const response = await adminApi.get<ApiResponse<Admin[]>>('/settings/admins');
    return response.data.data!;
  },

  /**
   * Create admin
   */
  createAdmin: async (data: { email: string; name: string; password: string; role_id: string; mfa_enabled?: boolean }): Promise<Admin> => {
    const response = await adminApi.post<ApiResponse<Admin>>('/settings/admins', data);
    return response.data.data!;
  },

  /**
   * Get sensitive words
   */
  getSensitiveWords: async (params?: { page?: number; page_size?: number; category?: string; enabled?: boolean }): Promise<ListResponse<SensitiveWord>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<SensitiveWord>>>('/settings/sensitive-words', { params });
    return response.data.data!;
  },

  /**
   * Add sensitive word
   */
  addSensitiveWord: async (data: { word: string; category: string; severity: string; action: string }): Promise<SensitiveWord> => {
    const response = await adminApi.post<ApiResponse<SensitiveWord>>('/settings/sensitive-words', data);
    return response.data.data!;
  },

  /**
   * Delete sensitive word
   */
  deleteSensitiveWord: async (id: string): Promise<void> => {
    await adminApi.delete(`/settings/sensitive-words/${id}`);
  },

  /**
   * Get system monitor
   */
  getSystemMonitor: async (): Promise<SystemMonitor> => {
    const response = await adminApi.get<ApiResponse<SystemMonitor>>('/settings/monitor');
    return response.data.data!;
  },

  /**
   * Get backup records
   */
  getBackupRecords: async (params?: { page?: number; page_size?: number; type?: string; status?: string }): Promise<ListResponse<BackupRecord>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<BackupRecord>>>('/settings/backups', { params });
    return response.data.data!;
  },

  /**
   * Create backup
   */
  createBackup: async (data: { type: 'full' | 'incremental' | 'database' | 'files' }): Promise<BackupRecord> => {
    const response = await adminApi.post<ApiResponse<BackupRecord>>('/settings/backups', data);
    return response.data.data!;
  },
};

// ==================== Advertiser Management APIs ====================

export const adminAdvertiserAPI = {
  /**
   * Get advertiser list
   */
  getAdvertisers: async (params: AdvertiserListParams): Promise<ListResponse<AdvertiserListItem>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<AdvertiserListItem>>>('/advertisers', { params });
    return response.data.data!;
  },

  /**
   * Get advertiser detail
   */
  getAdvertiser: async (id: string): Promise<AdvertiserDetail> => {
    const response = await adminApi.get<ApiResponse<AdvertiserDetail>>(`/advertisers/${id}`);
    return response.data.data!;
  },

  /**
   * Verify advertiser
   */
  verifyAdvertiser: async (id: string, data: { action: 'approve' | 'reject'; note?: string; rejection_reason?: string }): Promise<AdvertiserDetail> => {
    const response = await adminApi.put<ApiResponse<AdvertiserDetail>>(`/advertisers/${id}/verify`, data);
    return response.data.data!;
  },

  /**
   * Get recharge records
   */
  getRechargeRecords: async (advertiserId: string, params?: { page?: number; page_size?: number; status?: string }): Promise<ListResponse<RechargeRecord>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<RechargeRecord>>>(`/advertisers/${advertiserId}/recharges`, { params });
    return response.data.data!;
  },

  /**
   * Get consumption records
   */
  getConsumptionRecords: async (advertiserId: string, params?: { page?: number; page_size?: number; type?: string }): Promise<ListResponse<ConsumptionRecord>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<ConsumptionRecord>>>(`/advertisers/${advertiserId}/consumptions`, { params });
    return response.data.data!;
  },

  /**
   * Adjust balance
   */
  adjustBalance: async (advertiserId: string, data: { amount: number; type: string; reason: string; notify_advertiser?: boolean }): Promise<BalanceAdjustment> => {
    const response = await adminApi.put<ApiResponse<BalanceAdjustment>>(`/advertisers/${advertiserId}/balance`, data);
    return response.data.data!;
  },

  /**
   * Freeze account
   */
  freezeAccount: async (advertiserId: string, data: { reason: string; freeze_amount?: number }): Promise<AdvertiserDetail> => {
    const response = await adminApi.put<ApiResponse<AdvertiserDetail>>(`/advertisers/${advertiserId}/freeze`, data);
    return response.data.data!;
  },

  /**
   * Unfreeze account
   */
  unfreezeAccount: async (advertiserId: string, data: { reason: string; unfreeze_amount?: number }): Promise<AdvertiserDetail> => {
    const response = await adminApi.put<ApiResponse<AdvertiserDetail>>(`/advertisers/${advertiserId}/unfreeze`, data);
    return response.data.data!;
  },
};

// ==================== Campaign Management APIs ====================

export const adminCampaignAPI = {
  /**
   * Get campaign list
   */
  getCampaigns: async (params: CampaignListParams): Promise<ListResponse<CampaignListItem>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<CampaignListItem>>>('/campaigns', { params });
    return response.data.data!;
  },

  /**
   * Get campaign detail
   */
  getCampaign: async (id: string): Promise<CampaignDetail> => {
    const response = await adminApi.get<ApiResponse<CampaignDetail>>(`/campaigns/${id}`);
    return response.data.data!;
  },

  /**
   * Verify campaign
   */
  verifyCampaign: async (id: string, data: { action: 'approve' | 'reject'; note?: string; rejection_reason?: string }): Promise<CampaignDetail> => {
    const response = await adminApi.put<ApiResponse<CampaignDetail>>(`/campaigns/${id}/verify`, data);
    return response.data.data!;
  },

  /**
   * Update campaign status
   */
  updateCampaignStatus: async (id: string, data: { status: string; reason?: string }): Promise<CampaignDetail> => {
    const response = await adminApi.put<ApiResponse<CampaignDetail>>(`/campaigns/${id}/status`, data);
    return response.data.data!;
  },

  /**
   * Get campaign stats
   */
  getCampaignStats: async (id: string): Promise<CampaignStats> => {
    const response = await adminApi.get<ApiResponse<CampaignStats>>(`/campaigns/${id}/stats`);
    return response.data.data!;
  },

  /**
   * Get abnormal campaigns
   */
  getAbnormalCampaigns: async (params?: { page?: number; page_size?: number; severity?: string; status?: string }): Promise<ListResponse<CampaignAnomaly>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<CampaignAnomaly>>>('/campaigns/abnormal', { params });
    return response.data.data!;
  },
};

// ==================== Order Management APIs ====================

export const adminOrderAPI = {
  /**
   * Get order list
   */
  getOrders: async (params: OrderListParams): Promise<ListResponse<OrderListItem>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<OrderListItem>>>('/orders', { params });
    return response.data.data!;
  },

  /**
   * Get order detail
   */
  getOrder: async (id: string): Promise<OrderDetail> => {
    const response = await adminApi.get<ApiResponse<OrderDetail>>(`/orders/${id}`);
    return response.data.data!;
  },

  /**
   * Update order status
   */
  updateOrderStatus: async (id: string, data: { status: string; reason?: string }): Promise<OrderDetail> => {
    const response = await adminApi.put<ApiResponse<OrderDetail>>(`/orders/${id}/status`, data);
    return response.data.data!;
  },

  /**
   * Get order disputes
   */
  getOrderDisputes: async (params?: { page?: number; page_size?: number; status?: string }): Promise<ListResponse<OrderDispute>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<OrderDispute>>>('/orders/disputes', { params });
    return response.data.data!;
  },

  /**
   * Resolve order dispute
   */
  resolveOrderDispute: async (orderId: string, data: { resolution: string; status: 'resolved' | 'escalated' }): Promise<OrderDetail> => {
    const response = await adminApi.put<ApiResponse<OrderDetail>>(`/orders/${orderId}/dispute`, data);
    return response.data.data!;
  },

  /**
   * Export orders
   */
  exportOrders: async (data: { format?: 'csv' | 'xlsx'; filters?: Partial<OrderListParams>; fields?: string[] }): Promise<{ download_url: string; expires_at: string; record_count: number }> => {
    const response = await adminApi.post<ApiResponse<{ download_url: string; expires_at: string; record_count: number }>>('/orders/export', data);
    return response.data.data!;
  },
};

export default adminApi;
