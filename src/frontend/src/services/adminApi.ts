import axios, { AxiosHeaders, AxiosInstance } from 'axios';
import { ensureCsrfToken } from './csrf';
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
  FinanceOverview,
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
  CampaignBudgetRisksResponse,
  // Order types
  OrderListItem,
  OrderDetail,
  OrderListParams,
  OrderDispute,
  // Advanced settings types
  SensitiveWord,
  SystemMonitor,
  BackupRecord,
  InviteCodeRow,
} from '../types';
import { redirectToAdminLogin } from '../utils/redirectOnUnauthorized';

// Admin API base URL from environment
const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:8080/api/v1/admin';

// Create axios instance for admin API
const adminApi: AxiosInstance = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor：CSRF + Admin JWT
adminApi.interceptors.request.use(
  async (config) => {
    const method = (config.method || 'get').toLowerCase();
    const url = config.url || '';
    if (['post', 'put', 'patch', 'delete'].includes(method) && !url.includes('csrf-token')) {
      const csrf = await ensureCsrfToken();
      const headers = AxiosHeaders.from(config.headers ?? {});
      headers.set('X-CSRF-Token', csrf);
      config.headers = headers;
    }
    const token = localStorage.getItem('adminAccessToken');
    if (token) {
      const headers = AxiosHeaders.from(config.headers ?? {});
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
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

        const response = await adminApi.post('/auth/refresh', {
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
        redirectToAdminLogin();
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
   * 修改登录密码（与后端 PUT /auth/password、camelCase 体一致）
   */
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await adminApi.put('/auth/password', {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
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
   * 财务概览（平台费+佣金周期收入、待提现/待充值等）
   */
  /**
   * 充值流水（deposit = recharge）
   */
  getDeposits: async (params: TransactionListParams): Promise<ListResponse<Transaction>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<Transaction>>>('/finance/deposits', { params });
    return response.data.data!;
  },

  /**
   * 管理员确认线下充值入账
   */
  confirmRecharge: async (data: { transaction_id: string; note?: string }): Promise<{ id: string; status: string }> => {
    const response = await adminApi.post<ApiResponse<{ id: string; status: string }>>('/finance/recharge/confirm', {
      transactionId: data.transaction_id,
      note: data.note,
    });
    return response.data.data!;
  },

  /**
   * 导出财务报表 CSV（GET blob）
   */
  exportFinanceReport: async (params: {
    type: 'transactions' | 'withdrawals' | 'deposits' | 'all';
    start_date: string;
    end_date: string;
    format?: 'csv' | 'xlsx';
  }): Promise<Blob> => {
    const response = await adminApi.get('/finance/export', {
      params: {
        type: params.type,
        startDate: params.start_date,
        endDate: params.end_date,
        format: params.format ?? 'csv',
      },
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  getOverview: async (params?: { period?: string }): Promise<FinanceOverview> => {
    const response = await adminApi.get<
      ApiResponse<{
        period: string;
        total_completed_volume: number;
        pending_withdrawals: number;
        monthly_revenue: number;
        pending_recharges: number;
        pending_invoices: number;
      }>
    >('/finance/overview', { params });
    const raw = response.data.data!;
    return {
      period: raw.period,
      totalCompletedVolume: raw.total_completed_volume,
      pendingWithdrawals: raw.pending_withdrawals,
      monthlyRevenue: raw.monthly_revenue,
      pendingRecharges: raw.pending_recharges,
      pendingInvoices: raw.pending_invoices,
    };
  },

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
};

// ==================== Platform stats (CSV export) ====================

export const adminStatsAPI = {
  /**
   * GET /stats/export — 需 analytics:export；响应为 CSV 原始字节
   */
  exportStatsReport: async (params: {
    type: 'users' | 'campaigns' | 'revenue' | 'kols' | 'all';
    period: 'day' | 'week' | 'month' | 'quarter' | 'year';
    format?: 'csv' | 'xlsx' | 'pdf';
  }): Promise<Blob> => {
    const response = await adminApi.get('/stats/export', {
      params: {
        type: params.type,
        period: params.period,
        format: params.format ?? 'csv',
      },
      responseType: 'blob',
    });
    return response.data as Blob;
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

  /** 只读：KOL 接单滚动窗口策略（环境变量） */
  getKolFrequencyPolicy: async (): Promise<{
    enabled: boolean;
    rolling_days: number;
    max_accepts: number;
    env_keys: string[];
  }> => {
    const response = await adminApi.get<
      ApiResponse<{
        enabled: boolean;
        rolling_days: number;
        max_accepts: number;
        env_keys: string[];
      }>
    >('/dashboard/kol-frequency-policy');
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
   * GET /settings/audit-logs/export — 需超级管理员；响应为 CSV 原始字节
   */
  exportAuditLogsReport: async (params?: {
    admin_id?: string;
    action?: string;
    resource_type?: string;
    status?: string;
    created_after?: string;
    created_before?: string;
    format?: 'csv';
  }): Promise<Blob> => {
    const response = await adminApi.get('/settings/audit-logs/export', {
      params: { ...params, format: params?.format ?? 'csv' },
      responseType: 'blob',
    });
    return response.data as Blob;
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

// ==================== Invite codes (growth) ====================

export const adminInviteCodesAPI = {
  list: async (params?: { page?: number; page_size?: number }): Promise<ListResponse<InviteCodeRow>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<InviteCodeRow>>>('/invite-codes', { params });
    return response.data.data!;
  },

  create: async (data: {
    role_target: 'advertiser' | 'kol';
    max_uses?: number;
    expires_at?: string | null;
    note?: string | null;
  }): Promise<InviteCodeRow> => {
    const response = await adminApi.post<ApiResponse<InviteCodeRow>>('/invite-codes', data);
    return response.data.data!;
  },

  setActive: async (id: string, active: boolean): Promise<InviteCodeRow> => {
    const response = await adminApi.patch<ApiResponse<InviteCodeRow>>(`/invite-codes/${id}`, { active });
    return response.data.data!;
  },
};

// ==================== Advertiser Management APIs ====================

function mapAdvertiserListRow(row: Record<string, unknown>): AdvertiserListItem {
  const wallet = Number(row.wallet_balance ?? row.walletBalance ?? 0);
  return {
    id: String(row.id ?? ''),
    userId: String(row.user_id ?? row.userId ?? ''),
    companyName: String(row.company_name ?? row.companyName ?? ''),
    contactPerson: (row.contact_person ?? row.contactPerson) as string | undefined,
    contactName: (row.contact_person ?? row.contactName) as string | undefined,
    contactEmail: String(row.contact_email ?? row.contactEmail ?? ''),
    industry: row.industry != null ? String(row.industry) : undefined,
    verificationStatus: row.verification_status as AdvertiserListItem['verificationStatus'],
    walletBalance: wallet,
    balance: wallet,
    frozenBalance: Number(row.frozen_balance ?? row.frozenBalance ?? 0),
    ordersFrozenTotal: Number(row.orders_frozen_total ?? row.ordersFrozenTotal ?? 0),
    activeCampaigns: Number(row.active_campaigns ?? row.activeCampaigns ?? 0),
    createdAt: String(row.created_at ?? row.createdAt ?? ''),
  };
}

function mapAdvertiserDetail(raw: Record<string, unknown>): AdvertiserDetail {
  const st = (raw.statistics ?? {}) as Record<string, unknown>;
  const base = mapAdvertiserListRow(raw);
  return {
    ...base,
    companyNameEn: (raw.company_name_en ?? raw.companyNameEn) as string | undefined,
    businessLicense: String(raw.business_license ?? raw.businessLicense ?? ''),
    businessLicenseUrl: String(raw.business_license_url ?? raw.businessLicenseUrl ?? ''),
    legalRepresentative: String(raw.legal_representative ?? raw.legalRepresentative ?? ''),
    companySize: (raw.company_size ?? raw.companySize) as string | undefined,
    website: (raw.website ?? raw.website) as string | undefined,
    contactPhone: String(raw.contact_phone ?? raw.contactPhone ?? ''),
    contactAddress: (raw.contact_address ?? raw.contactAddress) as string | undefined,
    verifiedAt: (raw.verified_at ?? raw.verifiedAt) as string | undefined,
    verifiedBy: (raw.verified_by ?? raw.verifiedBy) as string | undefined,
    totalRecharged: Number(raw.total_recharged ?? raw.totalRecharged ?? 0),
    totalSpent: Number(raw.total_spent ?? raw.totalSpent ?? 0),
    ordersFrozenTotal: Number(raw.orders_frozen_total ?? raw.ordersFrozenTotal ?? 0),
    statistics: {
      totalCampaigns: Number(st.total_campaigns ?? st.totalCampaigns ?? 0),
      activeCampaigns: Number(st.active_campaigns ?? st.activeCampaigns ?? 0),
      totalOrders: Number(st.total_orders ?? st.totalOrders ?? 0),
      completedOrders: Number(st.completed_orders ?? st.completedOrders ?? 0),
    },
  };
}

async function fetchAdvertiserNormalized(id: string): Promise<AdvertiserDetail> {
  const response = await adminApi.get<ApiResponse<Record<string, unknown>>>(`/advertisers/${id}`);
  return mapAdvertiserDetail(response.data.data!);
}

export const adminAdvertiserAPI = {
  /**
   * Get advertiser list
   */
  getAdvertisers: async (params: AdvertiserListParams): Promise<ListResponse<AdvertiserListItem>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<Record<string, unknown>>>>('/advertisers', { params });
    const d = response.data.data!;
    return {
      items: d.items.map((row) => mapAdvertiserListRow(row as Record<string, unknown>)),
      pagination: d.pagination,
    };
  },

  /**
   * Get advertiser detail
   */
  getAdvertiser: fetchAdvertiserNormalized,

  /**
   * Verify advertiser（成功后拉取详情）
   */
  verifyAdvertiser: async (
    id: string,
    data: { action: 'approve' | 'reject'; note?: string; rejection_reason?: string }
  ): Promise<AdvertiserDetail> => {
    await adminApi.put(`/advertisers/${id}/verify`, data);
    return fetchAdvertiserNormalized(id);
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
    await adminApi.put(`/advertisers/${advertiserId}/freeze`, data);
    return fetchAdvertiserNormalized(advertiserId);
  },

  /**
   * Unfreeze account
   */
  unfreezeAccount: async (advertiserId: string, data: { reason: string; unfreeze_amount?: number }): Promise<AdvertiserDetail> => {
    await adminApi.put(`/advertisers/${advertiserId}/unfreeze`, data);
    return fetchAdvertiserNormalized(advertiserId);
  },
};

// ==================== Campaign Management APIs ====================

function mapCampaignListRow(row: Record<string, unknown>): CampaignListItem {
  return {
    id: String(row.id ?? ''),
    advertiserId: String(row.advertiser_id ?? row.advertiserId ?? ''),
    advertiserName: String(row.advertiser_name ?? row.advertiserName ?? ''),
    title: String(row.title ?? ''),
    description: row.description != null ? String(row.description) : undefined,
    budget: Number(row.budget ?? 0),
    spentAmount: Number(row.spent_amount ?? row.spentAmount ?? 0),
    ordersFrozenTotal: Number(row.orders_frozen_total ?? row.ordersFrozenTotal ?? 0),
    status: row.status as CampaignListItem['status'],
    objective: row.objective as CampaignListItem['objective'],
    startDate: String(row.start_date ?? row.startDate ?? ''),
    endDate: String(row.end_date ?? row.endDate ?? ''),
    totalOrders: Number(row.total_orders ?? row.totalOrders ?? 0),
    completedOrders: Number(row.completed_orders ?? row.completedOrders ?? 0),
    totalImpressions: Number(row.total_impressions ?? row.totalImpressions ?? 0),
    totalClicks: Number(row.total_clicks ?? row.totalClicks ?? 0),
    performanceScore: row.performance_score as CampaignListItem['performanceScore'],
    createdAt: String(row.created_at ?? row.createdAt ?? ''),
  };
}

function mapCampaignDetail(raw: Record<string, unknown>): CampaignDetail {
  const ta = (raw.target_audience ?? raw.targetAudience) as Record<string, unknown> | undefined;
  const st = (raw.statistics ?? {}) as Record<string, unknown>;
  const pm = String(raw.pricing_model ?? raw.pricingModel ?? 'cpm');
  const pricingModel =
    pm === 'cpm' || pm === 'cpc' || pm === 'cpa' ? pm : ('cpm' as const);

  return {
    ...mapCampaignListRow(raw),
    budgetType: raw.budget_type === 'dynamic' ? 'dynamic' : 'fixed',
    pricingModel,
    targetAudience: {
      ageRange: String(ta?.ageRange ?? ''),
      gender: Array.isArray(ta?.gender) ? (ta.gender as string[]) : [],
      locations: Array.isArray(ta?.locations) ? (ta.locations as string[]) : [],
      interests: Array.isArray(ta?.interests) ? (ta.interests as string[]) : [],
    },
    targetPlatforms: Array.isArray(raw.target_platforms ?? raw.targetPlatforms)
      ? ((raw.target_platforms ?? raw.targetPlatforms) as string[])
      : [],
    minFollowers: Number(raw.min_followers ?? raw.minFollowers ?? 0),
    maxFollowers: Number(raw.max_followers ?? raw.maxFollowers ?? 0),
    minEngagementRate: Number(raw.min_engagement_rate ?? raw.minEngagementRate ?? 0),
    requiredCategories: Array.isArray(raw.required_categories ?? raw.requiredCategories)
      ? ((raw.required_categories ?? raw.requiredCategories) as string[])
      : [],
    targetCountries: Array.isArray(raw.target_countries ?? raw.targetCountries)
      ? ((raw.target_countries ?? raw.targetCountries) as string[])
      : [],
    reviewedBy: (raw.reviewed_by ?? raw.reviewedBy) as string | undefined,
    reviewedAt: (raw.reviewed_at ?? raw.reviewedAt) as string | undefined,
    reviewNotes: (raw.review_notes ?? raw.reviewNotes) as string | undefined,
    statistics: {
      totalKols: Number(st.total_kols ?? st.totalKols ?? 0),
      appliedKols: Number(st.applied_kols ?? st.appliedKols ?? 0),
      selectedKols: Number(st.selected_kols ?? st.selectedKols ?? 0),
      publishedVideos: Number(st.published_videos ?? st.publishedVideos ?? 0),
      totalImpressions: Number(st.total_impressions ?? st.totalImpressions ?? 0),
      totalClicks: Number(st.total_clicks ?? st.totalClicks ?? 0),
      totalLikes: Number(st.total_likes ?? st.totalLikes ?? 0),
      totalComments: Number(st.total_comments ?? st.totalComments ?? 0),
      totalShares: Number(st.total_shares ?? st.totalShares ?? 0),
      estimatedReach: Number(st.estimated_reach ?? st.estimatedReach ?? 0),
      actualReach: Number(st.actual_reach ?? st.actualReach ?? 0),
    },
  };
}

function mapCampaignStatsFromApi(raw: Record<string, unknown>): CampaignStats {
  const ov = (raw.overview as Record<string, unknown>) ?? {};
  const tr = (raw.trends as Record<string, unknown>) ?? {};
  const kols = (raw.kol_performance ?? raw.kolPerformance) as unknown[] | undefined;
  return {
    campaignId: String(raw.campaign_id ?? raw.campaignId ?? ''),
    overview: {
      totalImpressions: Number(ov.total_impressions ?? ov.totalImpressions ?? 0),
      totalClicks: Number(ov.total_clicks ?? ov.totalClicks ?? 0),
      ctr: Number(ov.ctr ?? 0),
      totalEngagements: Number(ov.total_engagements ?? ov.totalEngagements ?? 0),
      engagementRate: Number(ov.engagement_rate ?? ov.engagementRate ?? 0),
      totalConversions: Number(ov.total_conversions ?? ov.totalConversions ?? 0),
      conversionRate: Number(ov.conversion_rate ?? ov.conversionRate ?? 0),
      totalCost: Number(ov.total_cost ?? ov.totalCost ?? 0),
      totalRevenue: Number(ov.total_revenue ?? ov.totalRevenue ?? 0),
      roi: Number(ov.roi ?? 0),
    },
    trends: {
      impressions: (tr.impressions as CampaignStats['trends']['impressions']) ?? [],
      clicks: (tr.clicks as CampaignStats['trends']['clicks']) ?? [],
    },
    kolPerformance: (kols ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        kolId: String(r.kol_id ?? r.kolId ?? ''),
        kolName: String(r.kol_name ?? r.kolName ?? ''),
        impressions: Number(r.impressions ?? 0),
        clicks: Number(r.clicks ?? 0),
        engagements: Number(r.engagements ?? 0),
        conversions: Number(r.conversions ?? 0),
        performanceScore: Number(r.performance_score ?? r.performanceScore ?? 0),
      };
    }),
  };
}

function mapAnomalyFromApi(raw: Record<string, unknown>): CampaignAnomaly {
  return {
    id: String(raw.id ?? ''),
    campaignId: String(raw.campaign_id ?? raw.campaignId ?? ''),
    kolId: raw.kol_id != null ? String(raw.kol_id) : raw.kolId != null ? String(raw.kolId) : undefined,
    orderId: raw.order_id != null ? String(raw.order_id) : raw.orderId != null ? String(raw.orderId) : undefined,
    anomalyType: (raw.anomaly_type ?? raw.anomalyType) as CampaignAnomaly['anomalyType'],
    description: String(raw.description ?? ''),
    severity: raw.severity as CampaignAnomaly['severity'],
    expectedValue: Number(raw.expected_value ?? raw.expectedValue ?? 0),
    actualValue: Number(raw.actual_value ?? raw.actualValue ?? 0),
    deviationRate: Number(raw.deviation_rate ?? raw.deviationRate ?? 0),
    detectedAt: String(raw.detected_at ?? raw.detectedAt ?? ''),
    detectionMethod: (raw.detection_method ?? raw.detectionMethod) as CampaignAnomaly['detectionMethod'],
    status: raw.status as CampaignAnomaly['status'],
    handledBy: raw.handled_by != null ? String(raw.handled_by) : raw.handledBy != null ? String(raw.handledBy) : undefined,
    handledAt: raw.handled_at != null ? String(raw.handled_at) : raw.handledAt != null ? String(raw.handledAt) : undefined,
  };
}

async function fetchCampaignNormalized(id: string): Promise<CampaignDetail> {
  const response = await adminApi.get<ApiResponse<Record<string, unknown>>>(`/campaigns/${id}`);
  return mapCampaignDetail(response.data.data!);
}

export const adminCampaignAPI = {
  /**
   * Get campaign list
   */
  getCampaigns: async (params: CampaignListParams): Promise<ListResponse<CampaignListItem>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<Record<string, unknown>>>>('/campaigns', { params });
    const d = response.data.data!;
    return {
      items: d.items.map((row) => mapCampaignListRow(row as Record<string, unknown>)),
      pagination: d.pagination,
    };
  },

  /**
   * Get campaign detail
   */
  getCampaign: fetchCampaignNormalized,

  /**
   * Verify campaign（后端仅返回摘要，成功后拉取详情）
   */
  verifyCampaign: async (
    id: string,
    data: { action: 'approve' | 'reject'; note?: string; rejection_reason?: string }
  ): Promise<CampaignDetail> => {
    await adminApi.put(`/campaigns/${id}/verify`, data);
    return fetchCampaignNormalized(id);
  },

  /**
   * Update campaign status
   */
  updateCampaignStatus: async (id: string, data: { status: string; reason?: string }): Promise<CampaignDetail> => {
    await adminApi.put(`/campaigns/${id}/status`, data);
    return fetchCampaignNormalized(id);
  },

  /**
   * Get campaign stats
   */
  getCampaignStats: async (id: string): Promise<CampaignStats> => {
    const response = await adminApi.get<ApiResponse<Record<string, unknown>>>(`/campaigns/${id}/stats`);
    return mapCampaignStatsFromApi(response.data.data!);
  },

  /**
   * Get abnormal campaigns
   */
  getAbnormalCampaigns: async (params?: {
    page?: number;
    page_size?: number;
    severity?: string;
    status?: string;
    /** 对应后端 `anomaly_type` 筛选 */
    type?: string;
  }): Promise<ListResponse<CampaignAnomaly>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<Record<string, unknown>>>>('/campaigns/abnormal', { params });
    const d = response.data.data!;
    return {
      items: d.items.map((row) => mapAnomalyFromApi(row as Record<string, unknown>)),
      pagination: d.pagination,
    };
  },

  /**
   * 预算占用率 ≥ 阈值的活动（默认 0.85）
   */
  getBudgetRiskCampaigns: async (params?: { threshold?: number }): Promise<CampaignBudgetRisksResponse> => {
    const response = await adminApi.get<ApiResponse<Record<string, unknown>>>('/campaigns/budget-risks', { params });
    const d = response.data.data!;
    const rawItems = (d.items as Array<Record<string, unknown>>) ?? [];
    return {
      threshold: Number(d.threshold ?? 0.85),
      items: rawItems.map((row) => ({
        id: row.id as string,
        title: (row.title as string) ?? '',
        budget: Number(row.budget ?? 0),
        spentAmount: Number(row.spent_amount ?? row.spentAmount ?? 0),
        utilization: Number(row.utilization ?? 0),
        status: String(row.status ?? ''),
      })),
    };
  },
};

// ==================== Order Management APIs ====================

export const adminOrderAPI = {
  /**
   * Get order list
   */
  getOrders: async (params: OrderListParams): Promise<ListResponse<OrderListItem>> => {
    const response = await adminApi.get<ApiResponse<ListResponse<Record<string, unknown>>>>('/orders', {
      params,
    });
    const d = response.data.data!;
    return {
      ...d,
      items: d.items.map((row) => ({
        id: row.id as string,
        orderNo: (row.order_no ?? row.orderNo) as string,
        campaignId: (row.campaign_id ?? row.campaignId) as string | undefined,
        campaignName: (row.campaign_name ?? row.campaignName) as string,
        advertiserId: (row.advertiser_id ?? row.advertiserId) as string | undefined,
        advertiserName: (row.advertiser_name ?? row.advertiserName) as string | undefined,
        kolId: (row.kol_id ?? row.kolId) as string | undefined,
        kolName: (row.kol_name ?? row.kolName) as string,
        kolPlatform: (row.kol_platform ?? row.kolPlatform) as string | undefined,
        amount: Number(row.amount ?? 0),
        pricingModel: (row.pricing_model ?? row.pricingModel) as string | undefined,
        cpmRate: (row.cpm_rate ?? row.cpmRate) as number | null | undefined,
        frozenAmount: Number(row.frozen_amount ?? row.frozenAmount ?? 0),
        status: row.status as OrderListItem['status'],
        createdAt: (row.created_at ?? row.createdAt) as string,
        updatedAt: (row.updated_at ?? row.updatedAt) as string | undefined,
      })),
    };
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
   * 更新订单曝光/互动（管理端回填）
   */
  updateOrderMetrics: async (
    id: string,
    data: { views?: number; likes?: number; comments?: number; shares?: number }
  ): Promise<{ id: string; views: number; likes: number; comments: number; shares: number; updated_at: string }> => {
    const response = await adminApi.put<
      ApiResponse<{ id: string; views: number; likes: number; comments: number; shares: number; updated_at: string }>
    >(`/orders/${id}/metrics`, data);
    return response.data.data!;
  },

  /**
   * 批量更新订单指标（Cron/拉数 worker）
   */
  batchUpdateOrderMetrics: async (items: Array<{
    order_id: string;
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  }>): Promise<{ processed: number; errors: Array<{ order_id: string; message: string }> }> => {
    const response = await adminApi.put<
      ApiResponse<{ processed: number; errors: Array<{ order_id: string; message: string }> }>
    >('/orders/metrics/batch', { items });
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
   * Resolve order dispute（与后端 disputeOrderSchema 一致）
   */
  resolveOrderDispute: async (
    orderId: string,
    data: {
      resolution: 'refund_full' | 'refund_partial' | 'no_refund' | 'escalate';
      refund_amount?: number;
      ruling: string;
      notify_parties?: boolean;
    }
  ): Promise<{
    id: string;
    order_id: string;
    status: string;
    resolved_at: string | null;
    resolved_by: string | null;
    ruling: string | null;
    refund_amount: number | null;
  }> => {
    const response = await adminApi.put<
      ApiResponse<{
        id: string;
        order_id: string;
        status: string;
        resolved_at: string | null;
        resolved_by: string | null;
        ruling: string | null;
        refund_amount: number | null;
      }>
    >(`/orders/${orderId}/dispute`, data);
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
