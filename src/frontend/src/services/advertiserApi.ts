import api from './api';
import type {
  Campaign,
  Advertiser,
  ApiResponse,
  ListResponse,
  Kol,
  Transaction,
} from '../types';

function numFromApi(v: unknown, fallback = 0): number {
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function strArrFromApi(v: unknown): string[] | undefined {
  if (v == null) return undefined;
  if (!Array.isArray(v)) return undefined;
  return v.length === 0 ? [] : v.map((x) => String(x));
}

/** 后端 Prisma 枚举；创建/更新 schema 与之一致 */
const ALLOWED_CAMPAIGN_PLATFORMS = new Set([
  'tiktok',
  'youtube',
  'instagram',
  'xiaohongshu',
  'weibo',
]);

function filterCampaignPlatforms(platforms: string[] | undefined): string[] {
  if (!platforms?.length) return [];
  return platforms.filter((p) => ALLOWED_CAMPAIGN_PLATFORMS.has(p));
}

/** 后端存 engagement；前端表单「用户互动」用 consideration */
function mapObjectiveFromApi(o: string | undefined): Campaign['objective'] {
  if (!o) return 'awareness';
  if (o === 'engagement') return 'consideration';
  if (o === 'awareness' || o === 'consideration' || o === 'conversion') {
    return o;
  }
  if (o === 'traffic' || o === 'sales') return 'conversion';
  return 'awareness';
}

function mapObjectiveToBackend(
  o: string | undefined
): 'awareness' | 'engagement' | 'traffic' | 'conversion' | 'sales' {
  if (!o) return 'awareness';
  if (o === 'consideration') return 'engagement';
  if (
    o === 'awareness' ||
    o === 'engagement' ||
    o === 'traffic' ||
    o === 'conversion' ||
    o === 'sales'
  ) {
    return o;
  }
  return 'awareness';
}

function mapBudgetTypeFromApi(b: unknown): Campaign['budgetType'] {
  const s = String(b ?? 'fixed');
  if (s === 'per_video') return 'dynamic';
  if (s === 'dynamic') return 'dynamic';
  return 'fixed';
}

function mapBudgetTypeToBackend(
  b: Campaign['budgetType'] | undefined
): 'fixed' | 'per_video' {
  if (b === 'dynamic') return 'per_video';
  return 'fixed';
}

function normalizeTargetAudienceForCampaign(
  raw: unknown
): Campaign['targetAudience'] {
  if (raw == null || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  return {
    ageRange: (r.age_range ?? r.ageRange) as string | undefined,
    gender:
      ((r.gender ?? 'all') as 'male' | 'female' | 'all'),
    locations: Array.isArray(r.locations)
      ? (r.locations as string[])
      : [],
    interests: Array.isArray(r.interests) ? (r.interests as string[]) : [],
  };
}

/** GET/POST/PATCH 活动响应：`campaigns.service` 使用 snake_case */
export function normalizeCampaignFromApi(raw: Record<string, unknown>): Campaign {
  const tp = raw.target_platforms ?? raw.targetPlatforms;
  const platforms = Array.isArray(tp) ? (tp as string[]) : [];

  return {
    id: String(raw.id ?? ''),
    advertiserId: String(raw.advertiser_id ?? raw.advertiserId ?? ''),
    title: String(raw.title ?? ''),
    description: raw.description as string | undefined,
    objective: mapObjectiveFromApi(String(raw.objective ?? '')),
    budget: numFromApi(raw.budget),
    budgetType: mapBudgetTypeFromApi(raw.budget_type ?? raw.budgetType),
    spentAmount: numFromApi(raw.spent_amount ?? raw.spentAmount),
    targetAudience: normalizeTargetAudienceForCampaign(
      raw.target_audience ?? raw.targetAudience
    ),
    targetPlatforms: platforms,
    minFollowers: numFromApi(raw.min_followers ?? raw.minFollowers),
    maxFollowers: numFromApi(raw.max_followers ?? raw.maxFollowers),
    minEngagementRate: numFromApi(
      raw.min_engagement_rate ?? raw.minEngagementRate
    ),
    requiredCategories: strArrFromApi(
      raw.required_categories ?? raw.requiredCategories
    ),
    targetCountries: strArrFromApi(
      raw.target_countries ?? raw.targetCountries
    ),
    contentRequirements: (raw.content_requirements ??
      raw.contentRequirements) as string | undefined,
    requiredHashtags: strArrFromApi(
      raw.required_hashtags ?? raw.requiredHashtags
    ),
    startDate: String(raw.start_date ?? raw.startDate ?? ''),
    endDate: String(raw.end_date ?? raw.endDate ?? ''),
    deadline: raw.deadline != null ? String(raw.deadline) : undefined,
    status: (raw.status as Campaign['status']) ?? 'draft',
    totalKols: numFromApi(raw.total_kols ?? raw.totalKols),
    appliedKols: numFromApi(raw.applied_kols ?? raw.appliedKols),
    selectedKols: numFromApi(raw.selected_kols ?? raw.selectedKols),
    publishedVideos: numFromApi(raw.published_videos ?? raw.publishedVideos),
    totalViews: numFromApi(raw.total_views ?? raw.totalViews),
    totalLikes: numFromApi(raw.total_likes ?? raw.totalLikes),
    totalComments: numFromApi(raw.total_comments ?? raw.totalComments),
    ordersFrozenTotal: numFromApi(raw.orders_frozen_total ?? raw.ordersFrozenTotal),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ''),
  };
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** POST /campaigns 请求体：与 `createCampaignSchema`（snake_case）一致 */
export function serializeCampaignForCreateApi(
  data: Partial<Campaign>
): Record<string, unknown> {
  const ta = data.targetAudience;
  const payload: Record<string, unknown> = {
    title: data.title,
    description: data.description,
    objective: mapObjectiveToBackend(String(data.objective ?? 'awareness')),
    budget: data.budget,
    budget_type: mapBudgetTypeToBackend(data.budgetType),
  };
  if (ta) {
    payload.target_audience = {
      age_range: ta.ageRange,
      gender: ta.gender,
      locations: ta.locations ?? [],
      interests: ta.interests ?? [],
    };
  }
  const plats = filterCampaignPlatforms(data.targetPlatforms);
  if (plats.length) payload.target_platforms = plats;
  if (data.minFollowers != null) payload.min_followers = data.minFollowers;
  if (data.maxFollowers != null) payload.max_followers = data.maxFollowers;
  if (data.minEngagementRate != null) {
    payload.min_engagement_rate = data.minEngagementRate;
  }
  if (data.requiredCategories?.length) {
    payload.required_categories = data.requiredCategories;
  }
  if (data.targetCountries?.length) {
    payload.target_countries = data.targetCountries;
  }
  if (data.contentRequirements) {
    payload.content_requirements = data.contentRequirements;
  }
  if (data.requiredHashtags?.length) {
    payload.required_hashtags = data.requiredHashtags;
  }
  if (data.startDate) payload.start_date = data.startDate;
  if (data.endDate) payload.end_date = data.endDate;
  if (data.deadline) payload.deadline = data.deadline;
  return stripUndefined(payload);
}

/** PATCH /campaigns/:id */
export function serializeCampaignForUpdateApi(
  data: Partial<Campaign>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.title !== undefined) out.title = data.title;
  if (data.description !== undefined) out.description = data.description;
  if (data.objective !== undefined) {
    out.objective = mapObjectiveToBackend(String(data.objective));
  }
  if (data.budget !== undefined) out.budget = data.budget;
  if (data.budgetType !== undefined) {
    out.budget_type = mapBudgetTypeToBackend(data.budgetType);
  }
  if (data.targetAudience !== undefined) {
    const ta = data.targetAudience;
    out.target_audience = {
      age_range: ta?.ageRange,
      gender: ta?.gender,
      locations: ta?.locations ?? [],
      interests: ta?.interests ?? [],
    };
  }
  if (data.targetPlatforms !== undefined) {
    const pl = filterCampaignPlatforms(data.targetPlatforms);
    if (pl.length) out.target_platforms = pl;
  }
  if (data.minFollowers !== undefined) out.min_followers = data.minFollowers;
  if (data.maxFollowers !== undefined) out.max_followers = data.maxFollowers;
  if (data.minEngagementRate !== undefined) {
    out.min_engagement_rate = data.minEngagementRate;
  }
  if (data.requiredCategories !== undefined) {
    out.required_categories = data.requiredCategories;
  }
  if (data.targetCountries !== undefined) {
    out.target_countries = data.targetCountries;
  }
  if (data.contentRequirements !== undefined) {
    out.content_requirements = data.contentRequirements;
  }
  if (data.requiredHashtags !== undefined) {
    out.required_hashtags = data.requiredHashtags;
  }
  if (data.startDate !== undefined) out.start_date = data.startDate;
  if (data.endDate !== undefined) out.end_date = data.endDate;
  if (data.deadline !== undefined) out.deadline = data.deadline;
  if (data.status !== undefined) out.status = data.status;
  return out;
}

/** GET /advertisers/me 等：`formatAdvertiserResponse` 为 snake_case */
export function normalizeAdvertiserFromApi(raw: Record<string, unknown>): Advertiser {
  return {
    id: String(raw.id ?? ''),
    userId: String(raw.user_id ?? raw.userId ?? ''),
    companyName: String(raw.company_name ?? raw.companyName ?? ''),
    businessLicense: (raw.business_license ?? raw.businessLicense) as
      | string
      | undefined,
    businessLicenseUrl: (raw.business_license_url ?? raw.businessLicenseUrl) as
      | string
      | undefined,
    legalRepresentative: (raw.legal_representative ??
      raw.legalRepresentative) as string | undefined,
    contactPerson: (raw.contact_person ?? raw.contactPerson) as string | undefined,
    contactPhone: (raw.contact_phone ?? raw.contactPhone) as string | undefined,
    contactEmail: (raw.contact_email ?? raw.contactEmail) as string | undefined,
    industry: raw.industry as string | undefined,
    companySize: (raw.company_size ?? raw.companySize) as string | undefined,
    website: raw.website as string | undefined,
    verificationStatus: (raw.verification_status ??
      raw.verificationStatus) as Advertiser['verificationStatus'],
    verifiedAt: (raw.verified_at ?? raw.verifiedAt) as string | undefined,
    walletBalance: numFromApi(raw.wallet_balance ?? raw.walletBalance),
    frozenBalance: numFromApi(raw.frozen_balance ?? raw.frozenBalance),
    totalRecharged: numFromApi(raw.total_recharged ?? raw.totalRecharged),
    totalSpent: numFromApi(raw.total_spent ?? raw.totalSpent),
    subscriptionPlan: (raw.subscription_plan ?? raw.subscriptionPlan) as
      | string
      | undefined,
    subscriptionExpiresAt: (raw.subscription_expires_at ??
      raw.subscriptionExpiresAt) as string | undefined,
    totalCampaigns: numFromApi(raw.total_campaigns ?? raw.totalCampaigns),
    activeCampaigns: numFromApi(raw.active_campaigns ?? raw.activeCampaigns),
    totalOrders: numFromApi(raw.total_orders ?? raw.totalOrders),
    ordersFrozenTotal: numFromApi(raw.orders_frozen_total ?? raw.ordersFrozenTotal),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ''),
  };
}

/** GET /advertisers/me/transactions：`formatTransactionResponse` 为 snake_case */
export interface AdvertiserTransactionRow {
  id: string;
  orderId?: string;
  transactionNo: string;
  type: Transaction['type'];
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentRef?: string;
  status: Transaction['status'];
  balanceBefore?: number;
  balanceAfter?: number;
  description?: string;
  completedAt?: string;
  createdAt: string;
}

function mapTransactionTypeFromApi(raw: string): Transaction['type'] {
  if (
    raw === 'recharge' ||
    raw === 'order_payment' ||
    raw === 'withdrawal' ||
    raw === 'refund' ||
    raw === 'commission'
  ) {
    return raw;
  }
  return 'recharge';
}

function mapTransactionStatusFromApi(raw: string): Transaction['status'] {
  if (
    raw === 'pending' ||
    raw === 'completed' ||
    raw === 'failed' ||
    raw === 'cancelled'
  ) {
    return raw;
  }
  return 'pending';
}

export function normalizeAdvertiserTransactionFromApi(
  raw: Record<string, unknown>
): AdvertiserTransactionRow {
  const bb = raw.balance_before ?? raw.balanceBefore;
  const ba = raw.balance_after ?? raw.balanceAfter;
  return {
    id: String(raw.id ?? ''),
    orderId: (raw.order_id ?? raw.orderId) as string | undefined,
    transactionNo: String(raw.transaction_no ?? raw.transactionNo ?? ''),
    type: mapTransactionTypeFromApi(String(raw.type ?? 'recharge')),
    amount: numFromApi(raw.amount),
    currency: String(raw.currency ?? 'CNY'),
    paymentMethod: String(raw.payment_method ?? raw.paymentMethod ?? ''),
    paymentRef: (raw.payment_ref ?? raw.paymentRef) as string | undefined,
    status: mapTransactionStatusFromApi(String(raw.status ?? 'pending')),
    balanceBefore: bb != null && bb !== '' ? numFromApi(bb) : undefined,
    balanceAfter: ba != null && ba !== '' ? numFromApi(ba) : undefined,
    description: raw.description as string | undefined,
    completedAt: (raw.completed_at ?? raw.completedAt) as string | undefined,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
  };
}

function serializeAdvertiserCreatePayload(
  data: Partial<Advertiser>
): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (data.companyName !== undefined) o.company_name = data.companyName;
  if (data.businessLicense !== undefined) o.business_license = data.businessLicense;
  if (data.legalRepresentative !== undefined) {
    o.legal_representative = data.legalRepresentative;
  }
  if (data.contactPerson !== undefined) o.contact_person = data.contactPerson;
  if (data.contactPhone !== undefined) o.contact_phone = data.contactPhone;
  if (data.contactEmail !== undefined) o.contact_email = data.contactEmail;
  if (data.industry !== undefined) o.industry = data.industry;
  if (data.companySize !== undefined) o.company_size = data.companySize;
  if (data.website !== undefined) o.website = data.website;
  return o;
}

function serializeAdvertiserUpdatePayload(
  data: Partial<Advertiser>
): Record<string, unknown> {
  return serializeAdvertiserCreatePayload(data);
}

/** 与 advertiserAPI.getProfile 配套；仪表盘、充值、经营分析等页共用 */
export const advertiserProfileQueryKey = ['advertiser'] as const;

/** 与 advertiserAPI.getBalance 配套；充值、经营分析等页共用 React Query 缓存 */
export const advertiserBalanceQueryKey = ['advertiser', 'balance'] as const;

// Advertiser API endpoints
export const advertiserAPI = {
  /**
   * Get current advertiser profile
   */
  getProfile: async (): Promise<Advertiser> => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>(
      '/advertisers/me'
    );
    return normalizeAdvertiserFromApi(response.data.data!);
  },

  /**
   * Create advertiser profile
   */
  createProfile: async (data: Partial<Advertiser>): Promise<Advertiser> => {
    const response = await api.post<ApiResponse<Record<string, unknown>>>(
      '/advertisers',
      serializeAdvertiserCreatePayload(data)
    );
    return normalizeAdvertiserFromApi(response.data.data!);
  },

  /**
   * Update advertiser profile
   */
  updateProfile: async (data: Partial<Advertiser>): Promise<Advertiser> => {
    const response = await api.patch<ApiResponse<Record<string, unknown>>>(
      '/advertisers/me',
      serializeAdvertiserUpdatePayload(data)
    );
    return normalizeAdvertiserFromApi(response.data.data!);
  },

  /**
   * Get balance
   */
  getBalance: async (): Promise<{
    wallet_balance: number;
    frozen_balance: number;
    total_recharged: number;
    total_spent: number;
    low_balance_alert_cny: number;
  }> => {
    const response = await api.get<ApiResponse<{
      wallet_balance: number;
      frozen_balance: number;
      total_recharged: number;
      total_spent: number;
      low_balance_alert_cny: number;
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
    await api.post('/advertisers/me/recharge', {
      amount: data.amount,
      payment_method: data.paymentMethod,
      payment_proof: data.paymentProof,
    });
  },

  /**
   * Get transactions
   */
  getTransactions: async (params?: {
    page?: number;
    page_size?: number;
    type?: string;
  }): Promise<ListResponse<AdvertiserTransactionRow>> => {
    const response = await api.get<
      ApiResponse<ListResponse<Record<string, unknown>>>
    >('/advertisers/me/transactions', { params });
    const data = response.data.data!;
    return {
      items: data.items.map((row) =>
        normalizeAdvertiserTransactionFromApi(row)
      ),
      pagination: data.pagination,
    };
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
    /** 前端 `consideration` 会映射为后端 Prisma 的 `engagement` */
    objective?: Campaign['objective'];
  }): Promise<ListResponse<Campaign>> => {
    const query: Record<string, string | number | undefined> = { ...params };
    if (params?.objective === 'consideration') {
      query.objective = 'engagement';
    }
    const response = await api.get<
      ApiResponse<ListResponse<Record<string, unknown>>>
    >('/campaigns', { params: query });
    const data = response.data.data!;
    return {
      items: data.items.map((row) => normalizeCampaignFromApi(row)),
      pagination: data.pagination,
    };
  },

  /**
   * Get campaign by ID
   */
  getCampaign: async (id: string): Promise<Campaign> => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>(
      `/campaigns/${id}`
    );
    return normalizeCampaignFromApi(response.data.data!);
  },

  /**
   * Create campaign
   */
  createCampaign: async (data: Partial<Campaign>): Promise<Campaign> => {
    const response = await api.post<ApiResponse<Record<string, unknown>>>(
      '/campaigns',
      serializeCampaignForCreateApi(data)
    );
    return normalizeCampaignFromApi(response.data.data!);
  },

  /**
   * Update campaign
   */
  updateCampaign: async (
    id: string,
    data: Partial<Campaign>
  ): Promise<Campaign> => {
    const response = await api.patch<ApiResponse<Record<string, unknown>>>(
      `/campaigns/${id}`,
      serializeCampaignForUpdateApi(data)
    );
    return normalizeCampaignFromApi(response.data.data!);
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
    const response = await api.post<ApiResponse<Record<string, unknown>>>(
      `/campaigns/${id}/submit`
    );
    return normalizeCampaignFromApi(response.data.data!);
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

/** 广告主订单（与 GET /orders 响应一致，snake_case） */
export const orderAPI = {
  getOrders: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    campaign_id?: string;
  }): Promise<ListResponse<Record<string, unknown>>> => {
    const response = await api.get<ApiResponse<ListResponse<Record<string, unknown>>>>('/orders', {
      params,
    });
    return response.data.data!;
  },

  getOrder: async (id: string): Promise<Record<string, unknown>> => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>(`/orders/${id}`);
    return response.data.data!;
  },

  /** CPM 口径明细（与详情内嵌 cpm_breakdown 同源，便于单独刷新） */
  getCpmMetrics: async (id: string): Promise<Record<string, unknown>> => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>(`/orders/${id}/cpm-metrics`);
    return response.data.data!;
  },

  completeOrder: async (
    id: string,
    body?: { rating?: number; review?: string }
  ): Promise<Record<string, unknown>> => {
    const response = await api.put<ApiResponse<Record<string, unknown>>>(
      `/orders/${id}/complete`,
      body ?? {}
    );
    return response.data.data!;
  },
};

/** 将后端 Kol 响应（snake_case）转为前端 Kol（camelCase），与列表/详情/推荐共用 */
export function normalizeKolFromApi(raw: Record<string, unknown>): Kol {
  const er = numFromApi(raw.engagement_rate ?? raw.engagementRate);
  const engagementRate = er > 1 ? er / 100 : er;

  return {
    id: String(raw.id ?? ''),
    userId: String(raw.user_id ?? raw.userId ?? ''),
    platform: String(raw.platform ?? ''),
    platformId: String(raw.platform_id ?? raw.platformId ?? ''),
    platformUsername: String(raw.platform_username ?? raw.platformUsername ?? ''),
    platformDisplayName: String(
      raw.platform_display_name ?? raw.platformDisplayName ?? ''
    ),
    platformAvatarUrl: (raw.platform_avatar_url ?? raw.platformAvatarUrl) as
      | string
      | undefined,
    bio: raw.bio as string | undefined,
    category: raw.category as string | undefined,
    subcategory: raw.subcategory as string | undefined,
    country: raw.country as string | undefined,
    region: raw.region as string | undefined,
    city: raw.city as string | undefined,
    followers: numFromApi(raw.followers),
    following: numFromApi(raw.following),
    totalVideos: numFromApi(raw.total_videos ?? raw.totalVideos),
    totalLikes: numFromApi(raw.total_likes ?? raw.totalLikes),
    avgViews: numFromApi(raw.avg_views ?? raw.avgViews),
    avgLikes: numFromApi(raw.avg_likes ?? raw.avgLikes),
    avgComments: numFromApi(raw.avg_comments ?? raw.avgComments),
    avgShares: numFromApi(raw.avg_shares ?? raw.avgShares),
    engagementRate,
    basePrice: numFromApi(raw.base_price ?? raw.basePrice),
    pricePerVideo:
      raw.price_per_video != null || raw.pricePerVideo != null
        ? numFromApi(raw.price_per_video ?? raw.pricePerVideo)
        : undefined,
    currency: String(raw.currency ?? 'USD'),
    totalOrders: numFromApi(raw.total_orders ?? raw.totalOrders),
    completedOrders: numFromApi(raw.completed_orders ?? raw.completedOrders),
    avgRating: numFromApi(raw.avg_rating ?? raw.avgRating),
    verified: Boolean(raw.verified),
    verifiedAt: (raw.verified_at ?? raw.verifiedAt) as string | undefined,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    status: (raw.status as Kol['status']) || 'active',
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ''),
  };
}

export type KolRecommendationRow = {
  kol: Kol;
  match_score: number;
  match_reasons: string[];
  estimated_reach: number;
  estimated_engagement: number;
};

// KOL API endpoints
export const kolAPI = {
  /**
   * Get KOLs list（query 与 GET /kols 一致：categories / regions 为逗号分隔）
   */
  getKols: async (params?: {
    page?: number;
    page_size?: number;
    platform?: string;
    min_followers?: number;
    max_followers?: number;
    /** 逗号分隔，多选类别 */
    categories?: string;
    /** 逗号分隔，多选地区/国家代码 */
    regions?: string;
    min_engagement_rate?: number;
    keyword?: string;
  }): Promise<ListResponse<Kol>> => {
    const response = await api.get<
      ApiResponse<ListResponse<Record<string, unknown>>>
    >('/kols', { params });
    const data = response.data.data!;
    return {
      items: data.items.map((row) => normalizeKolFromApi(row)),
      pagination: data.pagination,
    };
  },

  /**
   * Get KOL by ID
   */
  getKol: async (id: string): Promise<Kol> => {
    const response = await api.get<ApiResponse<Record<string, unknown>>>(
      `/kols/${id}`
    );
    return normalizeKolFromApi(response.data.data!);
  },

  /**
   * Get recommended KOLs
   */
  getRecommendedKols: async (
    campaignId: string,
    limit?: number
  ): Promise<{
    recommendations: KolRecommendationRow[];
    total: number;
  }> => {
    const response = await api.get<
      ApiResponse<{
        recommendations: Array<{
          kol: Record<string, unknown>;
          match_score: number;
          match_reasons: string[];
          estimated_reach: number;
          estimated_engagement: number;
        }>;
        total: number;
      }>
    >('/kols/recommend', { params: { campaignId, limit } });
    const data = response.data.data!;
    return {
      total: data.total,
      recommendations: data.recommendations.map((r) => ({
        kol: normalizeKolFromApi(r.kol),
        match_score: r.match_score,
        match_reasons: Array.isArray(r.match_reasons) ? r.match_reasons : [],
        estimated_reach: r.estimated_reach,
        estimated_engagement: r.estimated_engagement,
      })),
    };
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
  order: orderAPI,
};
