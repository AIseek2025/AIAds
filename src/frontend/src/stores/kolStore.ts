import { create } from 'zustand';
import type { Kol } from '../types';

export interface KolAccount {
  id: string;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'other';
  platformId: string;
  platformUsername: string;
  platformDisplayName: string;
  platformAvatarUrl?: string;
  followers: number;
  following: number;
  totalVideos: number;
  totalLikes: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  status: 'active' | 'pending' | 'disconnected';
  lastSyncAt?: string;
  createdAt: string;
}

export interface KolTask {
  id: string;
  campaignId: string;
  campaignTitle: string;
  campaignDescription?: string;
  platform: string;
  /** 列表与详情均可能展示为「预估/结算报酬」，与订单 kol_earning 对齐 */
  budget: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'pending_review' | 'completed' | 'rejected';
  deadline?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  contentUrl?: string;
  contentDescription?: string;
  createdAt: string;
  updatedAt: string;
  /** 以下为订单接口扩展字段（详情页优先展示） */
  orderNo?: string;
  pricingModel?: 'fixed' | 'cpm';
  orderPrice?: number;
  platformFee?: number;
  kolEarning?: number;
  frozenAmount?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  revisionCount?: number;
  draftUrls?: string[];
  publishedUrls?: string[];
  cpmBreakdown?: {
    billable_impressions: number;
    raw_views: number;
    cpm_rate: number | null;
    gross_spend: number;
    kol_earning: number;
  };
  /** 任务广场活动（Campaign / TaskResponse）扩展 */
  campaignStatusRaw?: string;
  objective?: string;
  contentType?: string;
  contentCount?: number;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  requiredCategories?: string[];
  targetCountries?: string[];
  contentRequirements?: string;
  contentGuidelines?: string;
  requiredHashtags?: string[];
  requiredMentions?: string[];
  startDate?: string;
  endDate?: string;
  totalKols?: number;
  appliedKols?: number;
  selectedKols?: number;
  publishedVideos?: number;
}

export interface KolEarnings {
  id: string;
  /** 关联订单 ID（来自流水 order_id） */
  taskId: string;
  amount: number;
  type: 'task_reward' | 'bonus' | 'refund' | 'withdrawal';
  status: 'pending' | 'settled' | 'withdrawn';
  settledAt?: string;
  createdAt: string;
}

export interface WithdrawalRecord {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  rejectionReason?: string;
  paymentMethod: string;
  paymentAccount: string;
  createdAt: string;
  processedAt?: string;
}

export interface KolStats {
  totalEarnings: number;
  monthlyEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
  totalTasks: number;
  ongoingTasks: number;
  completedTasks: number;
  successRate: number;
  totalViews: number;
  totalLikes: number;
}

interface KolState {
  // State
  kol: Kol | null;
  stats: KolStats | null;
  accounts: KolAccount[];
  tasks: KolTask[];
  earnings: KolEarnings[];
  withdrawals: WithdrawalRecord[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setKol: (kol: Kol) => void;
  setStats: (stats: KolStats) => void;
  setAccounts: (accounts: KolAccount[]) => void;
  setTasks: (tasks: KolTask[]) => void;
  setEarnings: (earnings: KolEarnings[]) => void;
  setWithdrawals: (withdrawals: WithdrawalRecord[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addAccount: (account: KolAccount) => void;
  removeAccount: (accountId: string) => void;
  updateAccount: (accountId: string, data: Partial<KolAccount>) => void;
  addTask: (task: KolTask) => void;
  updateTask: (taskId: string, data: Partial<KolTask>) => void;
}

export const useKolStore = create<KolState>((set) => ({
  // Initial state
  kol: null,
  stats: null,
  accounts: [],
  tasks: [],
  earnings: [],
  withdrawals: [],
  isLoading: false,
  error: null,

  // Actions
  setKol: (kol) => set({ kol }),

  setStats: (stats) => set({ stats }),

  setAccounts: (accounts) => set({ accounts }),

  setTasks: (tasks) => set({ tasks }),

  setEarnings: (earnings) => set({ earnings }),

  setWithdrawals: (withdrawals) => set({ withdrawals }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  addAccount: (account) =>
    set((state) => ({
      accounts: [...state.accounts, account],
    })),

  removeAccount: (accountId) =>
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== accountId),
    })),

  updateAccount: (accountId, data) =>
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === accountId ? { ...a, ...data } : a
      ),
    })),

  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task],
    })),

  updateTask: (taskId, data) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...data } : t
      ),
    })),
}));

export default useKolStore;
