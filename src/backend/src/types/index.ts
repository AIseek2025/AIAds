// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  request_id?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{
    field?: string;
    message: string;
  }>;
}

// Pagination types
export interface PaginationParams {
  page: number;
  page_size: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Auth types
export interface RegisterRequest {
  email: string;
  password: string;
  phone?: string;
  role?: 'advertiser' | 'kol';
  nickname?: string;
  /** 可选；与 REQUIRE_INVITE_CODE_FOR_REGISTRATION 联用 */
  invite_code?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserResponse;
  tokens: TokenResponse;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// User types
export interface UserResponse {
  id: string;
  email: string;
  phone?: string;
  nickname?: string;
  avatar_url?: string;
  real_name?: string;
  role: string;
  status: string;
  email_verified: boolean;
  phone_verified: boolean;
  language: string;
  timezone: string;
  currency: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserRequest {
  nickname?: string;
  avatar_url?: string;
  language?: string;
  timezone?: string;
  currency?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// Verification code types
export interface SendVerificationCodeRequest {
  type: 'email' | 'phone';
  target: string;
  purpose: 'register' | 'login' | 'reset_password' | 'verify';
}

export interface VerifyCodeRequest {
  type: 'email' | 'phone';
  target: string;
  code: string;
}

// Advertiser types
export interface AdvertiserResponse {
  id: string;
  user_id: string;
  company_name: string;
  company_name_en?: string;
  business_license?: string;
  business_license_url?: string;
  legal_representative?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_address?: string;
  industry?: string;
  company_size?: string;
  website?: string;
  verification_status: string;
  verified_at?: string;
  wallet_balance: number;
  frozen_balance: number;
  total_recharged: number;
  total_spent: number;
  subscription_plan: string;
  subscription_expires_at?: string;
  total_campaigns: number;
  active_campaigns: number;
  total_orders: number;
  /** 全部订单 frozen_amount 合计（与 /kols/balance 侧订单冻结口径一致，按广告主维度） */
  orders_frozen_total?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAdvertiserRequest {
  company_name: string;
  company_name_en?: string;
  business_license?: string;
  legal_representative?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  industry?: string;
  company_size?: string;
  website?: string;
}

export interface UpdateAdvertiserRequest {
  company_name?: string;
  company_name_en?: string | null;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  industry?: string;
  company_size?: string;
  website?: string | null;
}

export interface RechargeRequest {
  amount: number;
  payment_method: 'alipay' | 'wechat' | 'bank_transfer';
  payment_proof?: string;
}

// KOL types
export interface KolResponse {
  id: string;
  user_id: string;
  platform: string;
  platform_id: string;
  platform_username: string;
  platform_display_name?: string;
  platform_avatar_url?: string;
  bio?: string;
  category?: string;
  subcategory?: string;
  country?: string;
  region?: string;
  city?: string;
  followers: number;
  following: number;
  total_videos: number;
  total_likes: number;
  avg_views: number;
  avg_likes: number;
  avg_comments: number;
  avg_shares: number;
  engagement_rate: number;
  status: string;
  verified: boolean;
  verified_at?: string;
  base_price?: number;
  price_per_video?: number;
  currency: string;
  total_earnings: number;
  available_balance: number;
  pending_balance: number;
  total_orders: number;
  completed_orders: number;
  avg_rating: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
  /** 仅 keyword 搜索时返回：规则相关度（可解释，非向量检索） */
  search_rank?: {
    score: number;
    matched_fields: string[];
  };
}

export interface CreateKolRequest {
  platform: 'tiktok' | 'youtube' | 'instagram' | 'xiaohongshu' | 'weibo';
  platform_username: string;
  platform_id: string;
  bio?: string;
  category?: string;
  country?: string;
}

export interface UpdateKolRequest {
  bio?: string;
  category?: string;
  base_price?: number;
  tags?: string[];
}

export interface KolListFilters {
  platform?: string;
  min_followers?: number;
  max_followers?: number;
  category?: string;
  country?: string;
  min_engagement_rate?: number;
  keyword?: string;
}

// KOL Account Binding types
export interface KolAccountResponse {
  id: string;
  kol_id: string;
  platform: string;
  platform_username: string;
  platform_display_name?: string;
  platform_avatar_url?: string;
  followers: number;
  following?: number;
  total_videos?: number;
  total_likes?: number;
  avg_views?: number;
  avg_likes?: number;
  avg_comments?: number;
  avg_shares?: number;
  engagement_rate?: number;
  is_primary: boolean;
  is_verified: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BindKolAccountRequest {
  platform: 'tiktok' | 'youtube' | 'instagram' | 'xiaohongshu' | 'weibo';
  platform_username: string;
  platform_id: string;
  platform_display_name?: string;
  platform_avatar_url?: string;
  access_token?: string;
  refresh_token?: string;
}

export interface SyncKolDataRequest {
  account_ids?: string[];
}

// Task types
export interface TaskResponse {
  id: string;
  campaign_id: string;
  advertiser_id: string;
  title: string;
  description?: string;
  objective: string;
  platform: string;
  content_type: string;
  content_count: number;
  budget: number;
  min_followers?: number;
  max_followers?: number;
  min_engagement_rate?: number;
  required_categories: string[];
  target_countries: string[];
  content_requirements?: string;
  content_guidelines?: string;
  required_hashtags: string[];
  required_mentions: string[];
  start_date?: string;
  end_date?: string;
  deadline?: string;
  status: string;
  total_kols: number;
  applied_kols: number;
  selected_kols: number;
  published_videos: number;
  created_at: string;
  updated_at: string;
}

export interface ApplyTaskRequest {
  message?: string;
  expected_price?: number;
  draft_urls?: string[];
}

// KOL Order types
export interface KolOrderResponse {
  id: string;
  campaign_id: string;
  campaign_title: string;
  advertiser_id: string;
  advertiser_name?: string;
  order_no: string;
  pricing_model: 'fixed' | 'cpm';
  cpm_rate: number | null;
  cpm_budget_cap: number | null;
  frozen_amount: number;
  price: number;
  platform_fee: number;
  kol_earning: number;
  cpm_breakdown?: OrderCpmBreakdown;
  content_type: string;
  content_count: number;
  content_description?: string;
  draft_urls: string[];
  published_urls: string[];
  accepted_at?: string;
  deadline?: string;
  submitted_at?: string;
  approved_at?: string;
  published_at?: string;
  completed_at?: string;
  status: string;
  review_notes?: string;
  revision_count: number;
  advertiser_rating?: number;
  advertiser_review?: string;
  kol_rating?: number;
  kol_review?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
  updated_at: string;
}

export interface SubmitOrderRequest {
  draft_urls: string[];
  message?: string;
}

export interface ReviseOrderRequest {
  draft_urls: string[];
  message?: string;
}

// Earnings types
export interface EarningsResponse {
  total_earnings: number;
  available_balance: number;
  pending_balance: number;
  withdrawn_amount: number;
}

export interface EarningsDetail {
  id: string;
  order_id?: string;
  order_no?: string;
  campaign_title?: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  created_at: string;
  completed_at?: string;
}

export interface EarningsHistoryResponse {
  items: EarningsDetail[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface BalanceResponse {
  available_balance: number;
  pending_balance: number;
  total_earnings: number;
  withdrawn_amount: number;
  /** 该 KOL 名下所有合作订单的 frozen_amount 合计（与订单详情「订单冻结」同源） */
  orders_frozen_total: number;
  currency: string;
}

// Withdrawal types
export interface WithdrawRequest {
  amount: number;
  payment_method: 'alipay' | 'wechat_pay' | 'bank_transfer' | 'paypal';
  account_name: string;
  account_number: string;
  bank_name?: string;
  bank_code?: string;
  swift_code?: string;
  remarks?: string;
}

export interface WithdrawalResponse {
  id: string;
  kol_id: string;
  withdrawal_no: string;
  amount: number;
  fee: number;
  actual_amount: number;
  currency: string;
  payment_method: string;
  account_name: string;
  account_number: string;
  bank_name?: string;
  status: string;
  description?: string;
  failure_reason?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalHistoryResponse {
  items: WithdrawalResponse[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/** 活动目标受众（创建请求与活动响应共用） */
export interface CampaignTargetAudience {
  age_range?: string;
  gender?: 'male' | 'female' | 'all';
  locations?: string[];
  interests?: string[];
}

// Campaign types
export interface CampaignResponse {
  id: string;
  advertiser_id: string;
  title: string;
  description?: string;
  objective: string;
  budget: number;
  budget_type: string;
  spent_amount: number;
  target_audience?: CampaignTargetAudience;
  target_platforms: string[];
  min_followers?: number;
  max_followers?: number;
  min_engagement_rate?: number;
  required_categories: string[];
  excluded_categories: string[];
  target_countries: string[];
  content_requirements?: string;
  content_guidelines?: string;
  required_hashtags: string[];
  required_mentions: string[];
  start_date?: string;
  end_date?: string;
  deadline?: string;
  status: string;
  total_kols: number;
  applied_kols: number;
  selected_kols: number;
  published_videos: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  /** 本活动下订单 frozen_amount 合计（列表/详情与冻结口径一致） */
  orders_frozen_total?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignRequest {
  title: string;
  description?: string;
  objective?: 'awareness' | 'engagement' | 'traffic' | 'conversion' | 'sales';
  budget: number;
  budget_type?: 'fixed' | 'per_video';
  target_audience?: CampaignTargetAudience;
  target_platforms?: Array<'tiktok' | 'youtube' | 'instagram' | 'xiaohongshu' | 'weibo'>;
  min_followers?: number;
  max_followers?: number;
  min_engagement_rate?: number;
  required_categories?: string[];
  target_countries?: string[];
  content_requirements?: string;
  required_hashtags?: string[];
  start_date?: string;
  end_date?: string;
  deadline?: string;
}

/** CPM 透明化：与订单当前 views / cpm 配置一致的预估或结算口径 */
export interface OrderCpmBreakdown {
  pricing_model: 'fixed' | 'cpm';
  billable_impressions: number;
  raw_views: number;
  cpm_rate: number | null;
  cpm_budget_cap: number | null;
  gross_spend: number;
  platform_fee: number;
  kol_earning: number;
}

// Order types
export interface OrderResponse {
  id: string;
  campaign_id: string;
  kol_id: string;
  advertiser_id: string;
  order_no: string;
  pricing_model: 'fixed' | 'cpm';
  cpm_rate: number | null;
  cpm_budget_cap: number | null;
  frozen_amount: number;
  price: number;
  platform_fee: number;
  kol_earning: number;
  cpm_breakdown?: OrderCpmBreakdown;
  content_type: string;
  content_count: number;
  content_description?: string;
  draft_urls: string[];
  published_urls: string[];
  accepted_at?: string;
  deadline?: string;
  submitted_at?: string;
  approved_at?: string;
  published_at?: string;
  completed_at?: string;
  status: string;
  review_notes?: string;
  revision_count: number;
  advertiser_rating?: number;
  advertiser_review?: string;
  kol_rating?: number;
  kol_review?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
  updated_at: string;
  /** 列表/详情附带，便于 KOL 端展示活动标题与平台 */
  campaign_title?: string;
  platform?: string;
  /** 列表接口附带，便于广告主端展示 */
  kol?: {
    platform_username: string;
    platform_display_name: string | null;
    platform_avatar_url: string | null;
    platform: string;
  };
}

export interface CreateOrderRequest {
  campaign_id: string;
  kol_id: string;
  /** fixed：必填，为订单总价；cpm：可选，作为 CPM 预算上限 */
  offered_price?: number;
  pricing_model?: 'fixed' | 'cpm';
  /** CPM 订单必填，单位与钱包货币一致（如 CNY 下为「每千次曝光价格」） */
  cpm_rate?: number;
  requirements?: string;
}

// Transaction types
export interface TransactionResponse {
  id: string;
  order_id?: string;
  advertiser_id?: string;
  kol_id?: string;
  transaction_no: string;
  type: string;
  amount: number;
  currency: string;
  payment_method?: string;
  payment_ref?: string;
  status: string;
  balance_before?: number;
  balance_after?: number;
  description?: string;
  created_at: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
}

// Notification types
export interface NotificationResponse {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  related_type?: string;
  related_id?: string;
  is_read: boolean;
  read_at?: string;
  action_url?: string;
  action_text?: string;
  created_at: string;
}
