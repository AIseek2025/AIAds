import api from './api';
import type {
  Kol,
  ApiResponse,
  ListResponse,
} from '../types';
import type { KolAccount, KolTask, KolEarnings, WithdrawalRecord, KolStats } from '../stores/kolStore';

// KOL Profile API endpoints
export const kolProfileAPI = {
  /**
   * Get current KOL profile
   */
  getProfile: async (): Promise<Kol> => {
    const response = await api.get<ApiResponse<Kol>>('/kols/me');
    return response.data.data!;
  },

  /**
   * Create KOL profile
   */
  createProfile: async (data: Partial<Kol>): Promise<Kol> => {
    const response = await api.post<ApiResponse<Kol>>('/kols', data);
    return response.data.data!;
  },

  /**
   * Update KOL profile
   */
  updateProfile: async (data: Partial<Kol>): Promise<Kol> => {
    const response = await api.patch<ApiResponse<Kol>>('/kols/me', data);
    return response.data.data!;
  },

  /**
   * Get KOL statistics
   */
  getStats: async (): Promise<KolStats> => {
    const response = await api.get<ApiResponse<KolStats>>('/kols/me/stats');
    return response.data.data!;
  },
};

// KOL Account API endpoints
export const kolAccountAPI = {
  /**
   * Get KOL accounts list
   */
  getAccounts: async (): Promise<KolAccount[]> => {
    const response = await api.get<ApiResponse<KolAccount[]>>('/kol-accounts');
    return response.data.data!;
  },

  /**
   * Get account by ID
   */
  getAccount: async (id: string): Promise<KolAccount> => {
    const response = await api.get<ApiResponse<KolAccount>>(`/kol-accounts/${id}`);
    return response.data.data!;
  },

  /**
   * Bind new account
   */
  bindAccount: async (data: {
    platform: string;
    platformUsername: string;
    authorizationCode?: string;
  }): Promise<KolAccount> => {
    const response = await api.post<ApiResponse<KolAccount>>('/kol-accounts/bind', data);
    return response.data.data!;
  },

  /**
   * Unbind account
   */
  unbindAccount: async (id: string): Promise<void> => {
    await api.delete(`/kol-accounts/${id}/unbind`);
  },

  /**
   * Sync account data
   */
  syncAccount: async (id: string): Promise<KolAccount> => {
    const response = await api.post<ApiResponse<KolAccount>>(`/kol-accounts/${id}/sync`);
    return response.data.data!;
  },

  /**
   * Sync all accounts
   */
  syncAllAccounts: async (): Promise<KolAccount[]> => {
    const response = await api.post<ApiResponse<KolAccount[]>>('/kol-accounts/sync-all');
    return response.data.data!;
  },
};

// Task Market API endpoints
export const taskMarketAPI = {
  /**
   * Get available tasks (task market)
   */
  getAvailableTasks: async (params?: {
    page?: number;
    page_size?: number;
    platform?: string;
    minBudget?: number;
    maxBudget?: number;
    category?: string;
    keyword?: string;
  }): Promise<ListResponse<KolTask>> => {
    const response = await api.get<ApiResponse<ListResponse<KolTask>>>(
      '/tasks/market',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get task by ID
   */
  getTask: async (id: string): Promise<KolTask> => {
    const response = await api.get<ApiResponse<KolTask>>(`/tasks/market/${id}`);
    return response.data.data!;
  },

  /**
   * Apply for task
   */
  applyTask: async (taskId: string, message?: string): Promise<KolTask> => {
    const response = await api.post<ApiResponse<KolTask>>(`/tasks/market/${taskId}/apply`, {
      message,
    });
    return response.data.data!;
  },
};

// My Tasks API endpoints
export const myTasksAPI = {
  /**
   * Get my tasks list
   */
  getTasks: async (params?: {
    page?: number;
    page_size?: number;
    status?: KolTask['status'];
    platform?: string;
  }): Promise<ListResponse<KolTask>> => {
    const response = await api.get<ApiResponse<ListResponse<KolTask>>>(
      '/tasks/my',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get task by ID
   */
  getTask: async (id: string): Promise<KolTask> => {
    const response = await api.get<ApiResponse<KolTask>>(`/tasks/my/${id}`);
    return response.data.data!;
  },

  /**
   * Accept task
   */
  acceptTask: async (taskId: string): Promise<KolTask> => {
    const response = await api.post<ApiResponse<KolTask>>(`/tasks/my/${taskId}/accept`);
    return response.data.data!;
  },

  /**
   * Reject task
   */
  rejectTask: async (taskId: string, reason?: string): Promise<void> => {
    await api.post(`/tasks/my/${taskId}/reject`, { reason });
  },

  /**
   * Submit work for task
   */
  submitWork: async (taskId: string, data: {
    contentUrl: string;
    contentDescription?: string;
  }): Promise<KolTask> => {
    const response = await api.post<ApiResponse<KolTask>>(`/tasks/my/${taskId}/submit`, data);
    return response.data.data!;
  },

  /**
   * Update submitted work
   */
  updateWork: async (taskId: string, data: {
    contentUrl: string;
    contentDescription?: string;
  }): Promise<KolTask> => {
    const response = await api.patch<ApiResponse<KolTask>>(`/tasks/my/${taskId}/submit`, data);
    return response.data.data!;
  },
};

// Earnings API endpoints
export const earningsAPI = {
  /**
   * Get earnings list
   */
  getEarnings: async (params?: {
    page?: number;
    page_size?: number;
    status?: KolEarnings['status'];
    type?: KolEarnings['type'];
  }): Promise<ListResponse<KolEarnings>> => {
    const response = await api.get<ApiResponse<ListResponse<KolEarnings>>>(
      '/earnings',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get available balance
   */
  getBalance: async (): Promise<{
    availableBalance: number;
    pendingBalance: number;
    totalEarnings: number;
  }> => {
    const response = await api.get<ApiResponse<{
      availableBalance: number;
      pendingBalance: number;
      totalEarnings: number;
    }>>('/earnings/balance');
    return response.data.data!;
  },

  /**
   * Request withdrawal
   */
  requestWithdrawal: async (data: {
    amount: number;
    paymentMethod: string;
    paymentAccount: string;
  }): Promise<WithdrawalRecord> => {
    const response = await api.post<ApiResponse<WithdrawalRecord>>('/earnings/withdraw', data);
    return response.data.data!;
  },

  /**
   * Get withdrawal records
   */
  getWithdrawals: async (params?: {
    page?: number;
    page_size?: number;
    status?: WithdrawalRecord['status'];
  }): Promise<ListResponse<WithdrawalRecord>> => {
    const response = await api.get<ApiResponse<ListResponse<WithdrawalRecord>>>(
      '/earnings/withdrawals',
      { params }
    );
    return response.data.data!;
  },
};

export default {
  kolProfile: kolProfileAPI,
  kolAccount: kolAccountAPI,
  taskMarket: taskMarketAPI,
  myTasks: myTasksAPI,
  earnings: earningsAPI,
};
