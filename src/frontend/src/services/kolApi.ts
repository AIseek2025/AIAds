import api from './api';
import type {
  Kol,
  ApiResponse,
  ListResponse,
} from '../types';
import type { KolAccount, KolTask, KolEarnings, WithdrawalRecord, KolStats } from '../stores/kolStore';

function numFromApi(v: unknown, fallback = 0): number {
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function strFromApi(v: unknown, fallback = ''): string {
  if (v == null) return fallback;
  return String(v);
}

/** GET /kols/me/stats 响应为 snake_case */
export function normalizeKolStatsFromApi(raw: Record<string, unknown>): KolStats {
  return {
    totalEarnings: numFromApi(raw.total_earnings ?? raw.totalEarnings),
    monthlyEarnings: numFromApi(raw.monthly_earnings ?? raw.monthlyEarnings),
    pendingEarnings: numFromApi(raw.pending_earnings ?? raw.pendingEarnings),
    availableBalance: numFromApi(raw.available_balance ?? raw.availableBalance),
    totalTasks: numFromApi(raw.total_tasks ?? raw.totalTasks),
    ongoingTasks: numFromApi(raw.ongoing_tasks ?? raw.ongoingTasks),
    completedTasks: numFromApi(raw.completed_tasks ?? raw.completedTasks),
    successRate: numFromApi(raw.success_rate ?? raw.successRate),
    totalViews: numFromApi(raw.total_views ?? raw.totalViews),
    totalLikes: numFromApi(raw.total_likes ?? raw.totalLikes),
  };
}

/** 后端 KolResponse snake_case → 前端 Kol */
export function normalizeKolFromApi(raw: Record<string, unknown>): Kol {
  const tags = raw.tags;
  return {
    id: strFromApi(raw.id),
    userId: strFromApi(raw.user_id ?? raw.userId),
    platform: strFromApi(raw.platform),
    platformId: strFromApi(raw.platform_id ?? raw.platformId),
    platformUsername: strFromApi(raw.platform_username ?? raw.platformUsername),
    platformDisplayName: strFromApi(raw.platform_display_name ?? raw.platformDisplayName),
    platformAvatarUrl: raw.platform_avatar_url != null ? String(raw.platform_avatar_url) : raw.platformAvatarUrl != null ? String(raw.platformAvatarUrl) : undefined,
    bio: raw.bio != null ? String(raw.bio) : undefined,
    category: raw.category != null ? String(raw.category) : undefined,
    subcategory: raw.subcategory != null ? String(raw.subcategory) : undefined,
    country: raw.country != null ? String(raw.country) : undefined,
    region: raw.region != null ? String(raw.region) : undefined,
    city: raw.city != null ? String(raw.city) : undefined,
    followers: numFromApi(raw.followers),
    following: numFromApi(raw.following),
    totalVideos: numFromApi(raw.total_videos ?? raw.totalVideos),
    totalLikes: numFromApi(raw.total_likes ?? raw.totalLikes),
    avgViews: numFromApi(raw.avg_views ?? raw.avgViews),
    avgLikes: numFromApi(raw.avg_likes ?? raw.avgLikes),
    avgComments: numFromApi(raw.avg_comments ?? raw.avgComments),
    avgShares: numFromApi(raw.avg_shares ?? raw.avgShares),
    engagementRate: numFromApi(raw.engagement_rate ?? raw.engagementRate),
    basePrice: numFromApi(raw.base_price ?? raw.basePrice),
    pricePerVideo: raw.price_per_video != null ? numFromApi(raw.price_per_video) : raw.pricePerVideo != null ? numFromApi(raw.pricePerVideo) : undefined,
    currency: strFromApi(raw.currency, 'CNY'),
    totalOrders: numFromApi(raw.total_orders ?? raw.totalOrders),
    completedOrders: numFromApi(raw.completed_orders ?? raw.completedOrders),
    avgRating: numFromApi(raw.avg_rating ?? raw.avgRating),
    verified: Boolean(raw.verified),
    verifiedAt: raw.verified_at != null ? String(raw.verified_at) : raw.verifiedAt != null ? String(raw.verifiedAt) : undefined,
    tags: Array.isArray(tags) ? (tags as string[]) : [],
    status: (raw.status === 'suspended' || raw.status === 'pending' || raw.status === 'active'
      ? raw.status
      : 'pending') as Kol['status'],
    createdAt: strFromApi(raw.created_at ?? raw.createdAt),
    updatedAt: strFromApi(raw.updated_at ?? raw.updatedAt),
  };
}

function strArrFromApi(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
}

function extractListData<T>(raw: unknown): ListResponse<T> {
  const d = raw as { items?: T[]; pagination?: ListResponse<T>['pagination'] };
  if (!d?.items || !d?.pagination) {
    return { items: [], pagination: { page: 1, page_size: 20, total: 0, total_pages: 0, has_next: false, has_prev: false } };
  }
  return { items: d.items, pagination: d.pagination };
}

/** 任务广场：Campaign TaskResponse */
export function normalizeMarketTaskFromApi(raw: Record<string, unknown>): KolTask {
  const st = strFromApi(raw.status, 'active');
  const statusMap: Record<string, KolTask['status']> = {
    active: 'pending',
    pending_review: 'pending',
    draft: 'pending',
    paused: 'pending',
    completed: 'completed',
    cancelled: 'rejected',
    rejected: 'rejected',
  };
  return {
    id: strFromApi(raw.id),
    campaignId: strFromApi(raw.campaign_id ?? raw.id),
    campaignTitle: strFromApi(raw.title),
    campaignDescription: raw.description != null ? String(raw.description) : undefined,
    platform: strFromApi(raw.platform, 'tiktok'),
    budget: numFromApi(raw.budget),
    status: statusMap[st] ?? 'pending',
    deadline: raw.deadline != null ? String(raw.deadline) : undefined,
    submittedAt: undefined,
    reviewedAt: undefined,
    rejectionReason: undefined,
    contentUrl: undefined,
    contentDescription: undefined,
    createdAt: strFromApi(raw.created_at ?? raw.createdAt),
    updatedAt: strFromApi(raw.updated_at ?? raw.updatedAt),
    campaignStatusRaw: st,
    objective: raw.objective != null ? String(raw.objective) : undefined,
    contentType: raw.content_type != null ? String(raw.content_type) : undefined,
    contentCount: raw.content_count != null ? Number(raw.content_count) : undefined,
    minFollowers: raw.min_followers != null ? numFromApi(raw.min_followers) : undefined,
    maxFollowers: raw.max_followers != null ? numFromApi(raw.max_followers) : undefined,
    minEngagementRate: raw.min_engagement_rate != null ? numFromApi(raw.min_engagement_rate) : undefined,
    requiredCategories: strArrFromApi(raw.required_categories),
    targetCountries: strArrFromApi(raw.target_countries),
    contentRequirements: raw.content_requirements != null ? String(raw.content_requirements) : undefined,
    contentGuidelines: raw.content_guidelines != null ? String(raw.content_guidelines) : undefined,
    requiredHashtags: strArrFromApi(raw.required_hashtags),
    requiredMentions: strArrFromApi(raw.required_mentions),
    startDate: raw.start_date != null ? String(raw.start_date) : undefined,
    endDate: raw.end_date != null ? String(raw.end_date) : undefined,
    totalKols: raw.total_kols != null ? numFromApi(raw.total_kols) : undefined,
    appliedKols: raw.applied_kols != null ? numFromApi(raw.applied_kols) : undefined,
    selectedKols: raw.selected_kols != null ? numFromApi(raw.selected_kols) : undefined,
    publishedVideos: raw.published_videos != null ? numFromApi(raw.published_videos) : undefined,
  };
}

/** 订单 → 我的任务卡片 */
export function normalizeOrderToKolTask(raw: Record<string, unknown>): KolTask {
  const st = strFromApi(raw.status);
  const mapStatus = (s: string): KolTask['status'] => {
    switch (s) {
      case 'pending':
        return 'pending';
      case 'accepted':
        return 'accepted';
      case 'rejected':
        return 'rejected';
      case 'in_progress':
        return 'in_progress';
      case 'submitted':
      case 'approved':
        return 'pending_review';
      case 'revision':
        return 'in_progress';
      case 'published':
        return 'completed';
      case 'completed':
        return 'completed';
      case 'cancelled':
      case 'disputed':
        return 'rejected';
      default:
        return 'in_progress';
    }
  };
  const drafts = raw.draft_urls;
  const draftUrls = Array.isArray(drafts) ? (drafts as string[]) : [];
  const published = raw.published_urls;
  const publishedUrls = Array.isArray(published) ? (published as string[]) : [];
  const pm = strFromApi(raw.pricing_model);
  const pricingModel: KolTask['pricingModel'] = pm === 'cpm' ? 'cpm' : 'fixed';
  let cpmBreakdown: KolTask['cpmBreakdown'] | undefined;
  if (raw.cpm_breakdown && typeof raw.cpm_breakdown === 'object') {
    const c = raw.cpm_breakdown as Record<string, unknown>;
    cpmBreakdown = {
      billable_impressions: numFromApi(c.billable_impressions),
      raw_views: numFromApi(c.raw_views),
      cpm_rate: c.cpm_rate == null ? null : Number(c.cpm_rate),
      gross_spend: numFromApi(c.gross_spend),
      kol_earning: numFromApi(c.kol_earning),
    };
  }
  return {
    id: strFromApi(raw.id),
    campaignId: strFromApi(raw.campaign_id),
    campaignTitle: strFromApi(raw.campaign_title ?? '活动'),
    campaignDescription: raw.content_description != null ? String(raw.content_description) : undefined,
    platform: strFromApi(raw.platform ?? 'tiktok', 'tiktok'),
    budget: numFromApi(raw.kol_earning ?? raw.price),
    status: mapStatus(st),
    deadline: raw.deadline != null ? String(raw.deadline) : undefined,
    submittedAt: raw.submitted_at != null ? String(raw.submitted_at) : undefined,
    reviewedAt: raw.approved_at != null ? String(raw.approved_at) : undefined,
    rejectionReason: raw.review_notes != null ? String(raw.review_notes) : undefined,
    contentUrl: draftUrls[0],
    contentDescription: raw.content_description != null ? String(raw.content_description) : undefined,
    createdAt: strFromApi(raw.created_at),
    updatedAt: strFromApi(raw.updated_at),
    orderNo: raw.order_no != null ? String(raw.order_no) : undefined,
    pricingModel,
    orderPrice: numFromApi(raw.price),
    platformFee: numFromApi(raw.platform_fee),
    kolEarning: numFromApi(raw.kol_earning),
    frozenAmount: numFromApi(raw.frozen_amount),
    views: numFromApi(raw.views),
    likes: numFromApi(raw.likes),
    comments: numFromApi(raw.comments),
    shares: numFromApi(raw.shares),
    revisionCount: raw.revision_count != null ? Number(raw.revision_count) : undefined,
    draftUrls: draftUrls.length ? draftUrls : undefined,
    publishedUrls: publishedUrls.length ? publishedUrls : undefined,
    cpmBreakdown,
  };
}

export function normalizeKolAccountFromApi(raw: Record<string, unknown>): KolAccount {
  const p = strFromApi(raw.platform, 'tiktok').toLowerCase();
  const platform: KolAccount['platform'] =
    p === 'youtube' || p === 'instagram' || p === 'tiktok' ? (p as KolAccount['platform']) : 'other';
  const last = raw.last_synced_at ?? raw.lastSyncAt;
  return {
    id: strFromApi(raw.id),
    platform,
    platformId: strFromApi(raw.platform_id ?? raw.platform_username ?? raw.platformUsername),
    platformUsername: strFromApi(raw.platform_username ?? raw.platformUsername),
    platformDisplayName: strFromApi(raw.platform_display_name ?? raw.platformDisplayName ?? raw.platform_username),
    platformAvatarUrl: raw.platform_avatar_url != null ? String(raw.platform_avatar_url) : undefined,
    followers: numFromApi(raw.followers),
    following: numFromApi(raw.following),
    totalVideos: numFromApi(raw.total_videos ?? raw.totalVideos),
    totalLikes: numFromApi(raw.total_likes ?? raw.totalLikes),
    avgViews: numFromApi(raw.avg_views ?? raw.avgViews),
    avgLikes: numFromApi(raw.avg_likes ?? raw.avgLikes),
    avgComments: numFromApi(raw.avg_comments ?? raw.avgComments),
    engagementRate: numFromApi(raw.engagement_rate ?? raw.engagementRate),
    status: raw.is_verified ? 'active' : 'pending',
    lastSyncAt: last != null ? String(last) : undefined,
    createdAt: strFromApi(raw.created_at ?? raw.createdAt),
  };
}

export function normalizeEarningsRowFromApi(raw: Record<string, unknown>): KolEarnings {
  const typeRaw = strFromApi(raw.type);
  let type: KolEarnings['type'] = 'task_reward';
  if (typeRaw === 'withdrawal') type = 'withdrawal';
  else if (typeRaw === 'bonus') type = 'bonus';
  else if (typeRaw === 'refund' || typeRaw === 'adjustment') type = 'refund';
  else type = 'task_reward';

  const st = strFromApi(raw.status);
  let status: KolEarnings['status'] = 'pending';
  if (type === 'withdrawal') {
    status = st === 'completed' ? 'withdrawn' : 'pending';
  } else {
    if (st === 'completed') status = 'settled';
    else status = 'pending';
  }

  const oid = raw.order_id != null ? String(raw.order_id) : '';
  return {
    id: strFromApi(raw.id),
    taskId: oid || strFromApi(raw.id),
    amount: numFromApi(raw.amount),
    type,
    status,
    settledAt: raw.completed_at != null ? String(raw.completed_at) : undefined,
    createdAt: strFromApi(raw.created_at),
  };
}

export function normalizeWithdrawalFromApi(raw: Record<string, unknown>): WithdrawalRecord {
  const pm = strFromApi(raw.payment_method);
  const paymentMethod =
    pm === 'wechat_pay' ? 'wechat' : pm === 'bank_transfer' ? 'bank' : pm === 'alipay' ? 'alipay' : pm;
  return {
    id: strFromApi(raw.id),
    amount: numFromApi(raw.amount),
    status: strFromApi(raw.status) as WithdrawalRecord['status'],
    rejectionReason: raw.failure_reason != null ? String(raw.failure_reason) : undefined,
    paymentMethod,
    paymentAccount: strFromApi(raw.account_number ?? raw.accountNumber),
    createdAt: strFromApi(raw.created_at ?? raw.createdAt),
    processedAt: raw.processed_at != null ? String(raw.processed_at) : undefined,
  };
}

/** GET /kols/me/frequency — 接单滚动窗口 */
export interface KolAcceptFrequency {
  enabled: boolean;
  rollingDays: number;
  maxAccepts: number;
  currentCount: number;
  remaining: number;
}

/** 与 React Query 共用 */
export const kolAcceptFrequencyQueryKey = ['kol', 'accept-frequency'] as const;

/** 与后端 `createKolSchema` 对齐 */
export interface CreateKolProfileInput {
  platform: 'tiktok' | 'youtube' | 'instagram' | 'xiaohongshu' | 'weibo';
  platformUsername: string;
  platformId: string;
  bio?: string;
  category?: string;
  country?: string;
}

// KOL Profile API endpoints
export const kolProfileAPI = {
  getProfile: async (): Promise<Kol> => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>('/kols/me');
    return normalizeKolFromApi(response.data.data!);
  },

  createProfile: async (data: CreateKolProfileInput): Promise<Kol> => {
    const body = {
      platform: data.platform,
      platform_username: data.platformUsername,
      platform_id: data.platformId,
      bio: data.bio,
      category: data.category,
      country: data.country,
    };
    const response = await api.post<ApiResponse<Record<string, unknown>>>('/kols/profile', body);
    return normalizeKolFromApi(response.data.data!);
  },

  updateProfile: async (data: Partial<Kol>): Promise<Kol> => {
    const body: Record<string, unknown> = {};
    if (data.bio !== undefined) body.bio = data.bio;
    if (data.category !== undefined) body.category = data.category;
    if (data.basePrice !== undefined) body.base_price = data.basePrice;
    if (data.tags !== undefined) body.tags = data.tags;
    const response = await api.put<ApiResponse<Record<string, unknown>>>('/kols/me', body);
    return normalizeKolFromApi(response.data.data!);
  },

  getStats: async (): Promise<KolStats> => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>('/kols/me/stats');
    return normalizeKolStatsFromApi(response.data.data!);
  },

  getAcceptFrequency: async (): Promise<KolAcceptFrequency> => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>('/kols/me/frequency');
    const d = response.data.data!;
    return {
      enabled: Boolean(d.enabled),
      rollingDays: numFromApi(d.rolling_days ?? d.rollingDays, 7),
      maxAccepts: numFromApi(d.max_accepts ?? d.maxAccepts, 30),
      currentCount: numFromApi(d.current_count ?? d.currentCount),
      remaining: numFromApi(d.remaining),
    };
  },
};

// KOL Account API endpoints
export const kolAccountAPI = {
  getAccounts: async (): Promise<KolAccount[]> => {
    const response = await api.get<ApiResponse<Record<string, unknown>[]>>('/kols/accounts');
    const rows = response.data.data ?? [];
    return rows.map((r) => normalizeKolAccountFromApi(r as Record<string, unknown>));
  },

  getAccount: async (id: string): Promise<KolAccount> => {
    const list = await kolAccountAPI.getAccounts();
    const found = list.find((a) => a.id === id);
    if (!found) throw new Error('账号不存在');
    return found;
  },

  bindAccount: async (data: {
    platform: string;
    platformUsername: string;
    authorizationCode?: string;
  }): Promise<KolAccount> => {
    const platform = data.platform as 'tiktok' | 'youtube' | 'instagram' | 'xiaohongshu' | 'weibo';
    const platformId = data.platformUsername.replace(/^@/, '');
    const response = await api.post<ApiResponse<Record<string, unknown>>>(`/kols/connect/${platform}`, {
      platform_username: data.platformUsername,
      platform_id: platformId,
      access_token: data.authorizationCode,
    });
    return normalizeKolAccountFromApi(response.data.data!);
  },

  unbindAccount: async (id: string): Promise<void> => {
    await api.delete(`/kols/accounts/${id}`);
  },

  syncAccount: async (id: string): Promise<KolAccount> => {
    await api.post('/kols/sync', { account_ids: [id] });
    return kolAccountAPI.getAccount(id);
  },

  syncAllAccounts: async (): Promise<KolAccount[]> => {
    await api.post('/kols/sync', {});
    return kolAccountAPI.getAccounts();
  },
};

// Task Market API endpoints
export const taskMarketAPI = {
  getAvailableTasks: async (params?: {
    page?: number;
    page_size?: number;
    platform?: string;
    minBudget?: number;
    maxBudget?: number;
    category?: string;
    keyword?: string;
  }): Promise<ListResponse<KolTask>> => {
    const response = await api.get<ApiResponse<unknown>>('/tasks', {
      params: {
        page: params?.page,
        page_size: params?.page_size,
        platform: params?.platform,
        min_budget: params?.minBudget,
        max_budget: params?.maxBudget,
      },
    });
    const list = extractListData<Record<string, unknown>>(response.data.data);
    return {
      items: list.items.map((r) => normalizeMarketTaskFromApi(r)),
      pagination: list.pagination,
    };
  },

  getTask: async (id: string): Promise<KolTask> => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>(`/tasks/${id}`);
    return normalizeMarketTaskFromApi(response.data.data!);
  },

  applyTask: async (taskId: string, message?: string): Promise<KolTask> => {
    const response = await api.post<ApiResponse<Record<string, unknown>>>(`/tasks/${taskId}/apply`, {
      message,
    });
    return normalizeOrderToKolTask(response.data.data as Record<string, unknown>);
  },
};

// My Tasks API endpoints（订单）
export const myTasksAPI = {
  getTasks: async (params?: {
    page?: number;
    page_size?: number;
    status?: KolTask['status'];
    platform?: string;
  }): Promise<ListResponse<KolTask>> => {
    const orderStatusMap: Partial<Record<KolTask['status'], string>> = {
      pending: 'pending',
      accepted: 'accepted',
      in_progress: 'in_progress',
      pending_review: 'submitted,approved',
      completed: 'completed',
      rejected: 'rejected',
    };
    const backendStatus = params?.status ? orderStatusMap[params.status] : undefined;
    const response = await api.get<ApiResponse<unknown>>('/tasks/kols/orders', {
      params: {
        page: params?.page,
        page_size: params?.page_size,
        status: backendStatus,
      },
    });
    const list = extractListData<Record<string, unknown>>(response.data.data);
    return {
      items: list.items.map((r) => normalizeOrderToKolTask(r)),
      pagination: list.pagination,
    };
  },

  getTask: async (id: string): Promise<KolTask> => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>(`/tasks/kols/orders/${id}`);
    return normalizeOrderToKolTask(response.data.data!);
  },

  acceptTask: async (orderId: string): Promise<KolTask> => {
    const response = await api.put<ApiResponse<Record<string, unknown>>>(`/tasks/kols/orders/${orderId}/accept`);
    return normalizeOrderToKolTask(response.data.data!);
  },

  rejectTask: async (orderId: string, reason?: string): Promise<void> => {
    await api.put(`/tasks/kols/orders/${orderId}/reject`, { reason });
  },

  submitWork: async (
    orderId: string,
    data: {
      contentUrl: string;
      contentDescription?: string;
    }
  ): Promise<KolTask> => {
    const response = await api.put<ApiResponse<Record<string, unknown>>>(`/tasks/kols/orders/${orderId}/submit`, {
      draft_urls: [data.contentUrl],
      message: data.contentDescription,
    });
    return normalizeOrderToKolTask(response.data.data!);
  },

  updateWork: async (
    orderId: string,
    data: {
      contentUrl: string;
      contentDescription?: string;
    }
  ): Promise<KolTask> => {
    const response = await api.put<ApiResponse<Record<string, unknown>>>(`/tasks/kols/orders/${orderId}/revise`, {
      draft_urls: [data.contentUrl],
      message: data.contentDescription,
    });
    return normalizeOrderToKolTask(response.data.data!);
  },
};

/** 与 earningsAPI.getBalance 配套；与广告主端 balance 查询键区分，避免 React Query 串缓存 */
export const kolBalanceQueryKey = ['kol', 'balance'] as const;

// Earnings API endpoints
export const earningsAPI = {
  getEarnings: async (params?: {
    page?: number;
    page_size?: number;
    status?: KolEarnings['status'];
    type?: KolEarnings['type'];
  }): Promise<ListResponse<KolEarnings>> => {
    const q: Record<string, string | number | undefined> = {
      page: params?.page,
      page_size: params?.page_size,
    };
    if (params?.status === 'pending') {
      q.status = 'pending';
    } else if (params?.status === 'settled') {
      q.status = 'completed';
      q.type = 'order_income';
    } else if (params?.status === 'withdrawn') {
      q.type = 'withdrawal';
    }
    const response = await api.get<ApiResponse<unknown>>('/kols/earnings/history', { params: q });
    const list = extractListData<Record<string, unknown>>(response.data.data);
    return {
      items: list.items.map((r) => normalizeEarningsRowFromApi(r)),
      pagination: list.pagination,
    };
  },

  getBalance: async (): Promise<{
    availableBalance: number;
    pendingBalance: number;
    totalEarnings: number;
    ordersFrozenTotal: number;
  }> => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>('/kols/balance');
    const d = response.data.data!;
    return {
      availableBalance: numFromApi(d.available_balance ?? d.availableBalance),
      pendingBalance: numFromApi(d.pending_balance ?? d.pendingBalance),
      totalEarnings: numFromApi(d.total_earnings ?? d.totalEarnings),
      ordersFrozenTotal: numFromApi(d.orders_frozen_total ?? d.ordersFrozenTotal),
    };
  },

  requestWithdrawal: async (data: {
    amount: number;
    paymentMethod: string;
    paymentAccount: string;
  }): Promise<WithdrawalRecord> => {
    const pm =
      data.paymentMethod === 'wechat' ? 'wechat_pay' : data.paymentMethod === 'bank' ? 'bank_transfer' : 'alipay';
    const response = await api.post<ApiResponse<Record<string, unknown>>>('/kols/withdraw', {
      amount: data.amount,
      payment_method: pm,
      account_name: data.paymentAccount.slice(0, 64),
      account_number: data.paymentAccount,
    });
    return normalizeWithdrawalFromApi(response.data.data!);
  },

  getWithdrawals: async (params?: {
    page?: number;
    page_size?: number;
    status?: WithdrawalRecord['status'];
  }): Promise<ListResponse<WithdrawalRecord>> => {
    const response = await api.get<ApiResponse<unknown>>('/kols/withdrawals', {
      params: {
        page: params?.page,
        page_size: params?.page_size,
        status: params?.status,
      },
    });
    const list = extractListData<Record<string, unknown>>(response.data.data);
    return {
      items: list.items.map((r) => normalizeWithdrawalFromApi(r)),
      pagination: list.pagination,
    };
  },
};

export default {
  kolProfile: kolProfileAPI,
  kolAccount: kolAccountAPI,
  taskMarket: taskMarketAPI,
  myTasks: myTasksAPI,
  earnings: earningsAPI,
};
