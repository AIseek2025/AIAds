// User types
export interface User {
  id: string;
  email: string;
  phone?: string;
  nickname?: string;
  avatarUrl?: string;
  role: 'advertiser' | 'kol' | 'admin';
  status: 'pending' | 'active' | 'suspended' | 'deleted';
  emailVerified: boolean;
  phoneVerified?: boolean;
  language?: string;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  phone?: string;
  role: 'advertiser' | 'kol';
  verificationCode: string;
  agreeTerms: boolean;
}

export interface ForgotPasswordData {
  email: string;
  verificationCode: string;
  newPassword: string;
}

export interface ResetPasswordData {
  email: string;
  verificationCode: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  request_id?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface PaginationParams {
  page: number;
  page_size: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationResponse {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ListResponse<T> {
  items: T[];
  pagination: PaginationResponse;
}

// Advertiser types
export interface Advertiser {
  id: string;
  userId: string;
  companyName: string;
  businessLicense?: string;
  businessLicenseUrl?: string;
  legalRepresentative?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verifiedAt?: string;
  walletBalance: number;
  frozenBalance: number;
  totalRecharged: number;
  totalSpent: number;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
  totalCampaigns: number;
  activeCampaigns: number;
  totalOrders: number;
  createdAt: string;
  updatedAt: string;
}

// KOL types
export interface Kol {
  id: string;
  userId: string;
  platform: string;
  platformId: string;
  platformUsername: string;
  platformDisplayName: string;
  platformAvatarUrl?: string;
  bio?: string;
  category?: string;
  subcategory?: string;
  country?: string;
  region?: string;
  city?: string;
  followers: number;
  following: number;
  totalVideos: number;
  totalLikes: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  engagementRate: number;
  basePrice: number;
  pricePerVideo?: number;
  currency: string;
  totalOrders: number;
  completedOrders: number;
  avgRating: number;
  verified: boolean;
  verifiedAt?: string;
  tags: string[];
  status: 'pending' | 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

// Campaign types
export interface Campaign {
  id: string;
  advertiserId: string;
  title: string;
  description?: string;
  objective: 'awareness' | 'consideration' | 'conversion';
  budget: number;
  budgetType: 'fixed' | 'dynamic';
  spentAmount: number;
  targetAudience?: {
    ageRange?: string;
    gender?: 'male' | 'female' | 'all';
    locations?: string[];
    interests?: string[];
  };
  targetPlatforms: string[];
  minFollowers: number;
  maxFollowers: number;
  minEngagementRate: number;
  requiredCategories?: string[];
  targetCountries?: string[];
  contentRequirements?: string;
  requiredHashtags?: string[];
  startDate: string;
  endDate: string;
  deadline?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  totalKols: number;
  appliedKols: number;
  selectedKols: number;
  publishedVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  createdAt: string;
  updatedAt: string;
}

// Component props types
export interface ButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'success';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
  className?: string;
}

export interface InputProps {
  label?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error?: boolean;
  helperText?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number';
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  multiline?: boolean;
  rows?: number;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  className?: string;
  name?: string;
  autoComplete?: string;
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface SnackbarProps {
  open: boolean;
  onClose: () => void;
  message: string;
  severity?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface LoadingProps {
  open: boolean;
  message?: string;
}

// ==================== Admin Types ====================

// Admin user types
export interface Admin {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: AdminRole;
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
}

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'finance' | 'analyst';

export interface AdminRoleDefinition {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
  adminCount: number;
  createdAt: string;
}

export interface AdminAuthResponse {
  admin: Admin;
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  role?: AdminRoleDefinition;
  permissions?: string[];
}

// Admin login types
export interface AdminLoginData {
  email: string;
  password: string;
  mfa_code?: string;
  remember_me?: boolean;
}

// Permission types
export type AdminPermission =
  | 'user:view'
  | 'user:create'
  | 'user:edit'
  | 'user:delete'
  | 'user:ban'
  | 'user:unban'
  | 'user:reset_password'
  | 'kol:view'
  | 'kol:review'
  | 'kol:approve'
  | 'kol:reject'
  | 'kol:verify'
  | 'kol:suspend'
  | 'content:view'
  | 'content:review'
  | 'content:approve'
  | 'content:reject'
  | 'content:delete'
  | 'finance:view'
  | 'finance:export'
  | 'withdrawal:review'
  | 'withdrawal:approve'
  | 'withdrawal:reject'
  | 'recharge:confirm'
  | 'dashboard:view'
  | 'dashboard:export'
  | 'analytics:view'
  | 'settings:view'
  | 'settings:edit'
  | 'role:manage'
  | 'admin:manage'
  | 'audit:view';

// User management types
export interface AdminUser {
  id: string;
  email: string;
  phone?: string;
  nickname: string;
  avatarUrl?: string;
  role: 'advertiser' | 'kol';
  status: 'active' | 'suspended' | 'banned';
  emailVerified: boolean;
  phoneVerified?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  advertiserProfile?: AdvertiserProfile;
  kolProfile?: KolProfile;
  statistics?: UserStatistics;
}

export interface AdvertiserProfile {
  id: string;
  companyName: string;
  businessLicense?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  walletBalance: number;
  frozenBalance: number;
  totalSpent: number;
}

export interface KolProfile {
  id: string;
  platform: string;
  platformUsername: string;
  platformDisplayName: string;
  followers: number;
  engagementRate: number;
  category?: string;
  verified: boolean;
  totalOrders: number;
  completedOrders: number;
}

export interface UserStatistics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalOrders: number;
  totalTransactions: number;
}

export interface UserListParams extends PaginationParams {
  keyword?: string;
  role?: 'advertiser' | 'kol';
  status?: 'active' | 'suspended' | 'banned';
  email_verified?: boolean;
  created_after?: string;
  created_before?: string;
}

// KOL review types
export interface KolApplication {
  id: string;
  userId: string;
  user: {
    email: string;
    nickname: string;
    avatarUrl?: string;
  };
  platform: string;
  platformId: string;
  platformUsername: string;
  platformDisplayName: string;
  platformAvatarUrl?: string;
  followers: number;
  engagementRate: number;
  category: string;
  subcategory?: string;
  country: string;
  bio?: string;
  tags: string[];
  status: 'pending' | 'active' | 'verified' | 'suspended' | 'rejected' | 'banned';
  verified?: boolean;
  avgViews?: number;
  totalOrders?: number;
  submittedAt: string;
  createdAt: string;
}

export interface KolDetail extends KolApplication {
  following: number;
  totalVideos: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  basePrice: number;
  totalOrders: number;
  completedOrders: number;
  statsHistory: Array<{
    date: string;
    followers: number;
    engagementRate: number;
  }>;
}

export interface KolListParams extends PaginationParams {
  keyword?: string;
  status?: 'pending' | 'active' | 'verified' | 'suspended' | 'rejected' | 'banned';
  platform?: string;
  category?: string;
  min_followers?: number;
  max_followers?: number;
  verified?: boolean;
}

// Content review types
export interface ContentItem {
  id: string;
  contentType: 'video' | 'image' | 'post';
  sourceType: 'kol_profile' | 'campaign_content' | 'user_report';
  title: string;
  description?: string;
  thumbnailUrl: string;
  contentUrl: string;
  duration?: number;
  submitter: {
    id: string;
    name: string;
    platform: string;
    avatarUrl?: string;
  };
  relatedOrderId?: string;
  relatedOrder?: {
    id: string;
    orderNo: string;
    campaignTitle: string;
  };
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  aiScore?: number;
  aiFlags?: string[];
  aiReview?: {
    suggestions?: string[];
  };
  submittedAt: string;
  createdAt: string;
}

export interface ContentListParams extends PaginationParams {
  keyword?: string;
  content_type?: 'video' | 'image' | 'post';
  source_type?: 'kol_profile' | 'campaign_content' | 'user_report';
  priority?: 'high' | 'normal' | 'low';
  status?: 'pending' | 'approved' | 'rejected';
}

// Finance types
export interface Transaction {
  id: string;
  transactionNo: string;
  type: 'recharge' | 'order_payment' | 'withdrawal' | 'refund' | 'commission';
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentRef?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  user: {
    id: string;
    email: string;
    companyName?: string;
  };
  balanceBefore?: number;
  balanceAfter?: number;
  description?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  withdrawalNo: string;
  kol: {
    id: string;
    userId: string;
    name: string;
    email: string;
    platform: string;
    platformUsername: string;
  };
  user?: {
    nickname?: string;
    email?: string;
  };
  amount: number;
  currency: string;
  paymentMethod: 'paypal' | 'bank_transfer' | 'alipay' | 'wechat';
  paymentAccount: string;
  paymentAccountName?: string;
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    swiftCode: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  note?: string;
  adminNote?: string;
  rejectionReason?: string;
  submittedAt: string;
  createdAt: string;
  transactionHistory?: Array<{
    action: string;
    adminEmail?: string;
    note?: string;
    createdAt: string;
  }>;
}

export interface TransactionListParams extends PaginationParams {
  keyword?: string;
  type?: 'recharge' | 'order_payment' | 'withdrawal' | 'refund' | 'commission';
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method?: string;
  user_id?: string;
  min_amount?: number;
  max_amount?: number;
  created_after?: string;
  created_before?: string;
}

// Dashboard types
export interface DashboardStats {
  period: {
    start: string;
    end: string;
  };
  users: {
    total: number;
    newToday: number;
    activeToday: number;
    advertisers: number;
    kols: number;
  };
  campaigns: {
    total: number;
    active: number;
    completedToday: number;
    totalBudget: number;
    spentAmount: number;
  };
  orders: {
    total: number;
    pending: number;
    inProgress: number;
    completedToday: number;
  };
  finance: {
    totalRevenue: number;
    todayRevenue: number;
    totalPayout: number;
    todayPayout: number;
    pendingWithdrawals: number;
  };
  content: {
    pendingReview: number;
    approvedToday: number;
    rejectedToday: number;
  };
  kol?: {
    pendingVerification: number;
  };
  totalUsers?: number;
  totalAdvertisers?: number;
  totalKols?: number;
  totalCampaigns?: number;
  totalGmv?: number;
  totalRevenue?: number;
  activeUsers?: number;
  pendingReviews?: number;
}

export interface AnalyticsData {
  userGrowth?: {
    labels: string[];
    series: {
      newUsers: number[];
      activeUsers: number[];
      advertisers: number[];
      kols: number[];
    };
  };
  revenueTrend?: {
    labels: string[];
    series: {
      revenue: number[];
      payout: number[];
    };
  };
  platformDistribution?: Record<string, number>;
  categoryDistribution?: Record<string, number>;
}

export interface KolRanking {
  rank: number;
  kol: {
    id: string;
    name: string;
    platform: string;
    avatarUrl: string;
  };
  value: number;
  change: string;
}

export interface DashboardKolRankings {
  metric: string;
  period: string;
  rankings: KolRanking[];
}

export interface RecentActivity {
  id: string;
  type: 'user_registered' | 'kol_verified' | 'campaign_created' | 'order_completed' | 'withdrawal_submitted';
  title: string;
  description: string;
  user?: {
    name: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

// Settings types
export interface SystemSettings {
  platform: {
    name: string;
    logoUrl: string;
    supportEmail: string;
    maintenanceMode: boolean;
  };
  commission: {
    defaultRate: number;
    minRate: number;
    maxRate: number;
  };
  withdrawal: {
    minAmount: number;
    maxAmount: number;
    processingDays: number;
    autoApproveThreshold: number;
  };
  kyc: {
    enabled: boolean;
    requiredForWithdrawal: boolean;
    minWithdrawalAmount: number;
  };
  siteName?: string;
  siteUrl?: string;
  logoUrl?: string;
  faviconUrl?: string;
  emailFrom?: string;
  enableRegistration?: boolean;
  enableEmailVerification?: boolean;
  enableMaintenanceMode?: boolean;
  maintenanceMessage?: string;
}

// Audit log types
export interface AuditLog {
  id: string;
  admin: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
  };
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  requestMethod: string;
  requestPath: string;
  ipAddress: string;
  geoLocation?: {
    country: string;
    region: string;
    city: string;
  };
  status: 'success' | 'failure';
  details?: string;
  createdAt: string;
}

export interface AuditLogListParams extends PaginationParams {
  admin_id?: string;
  action?: string;
  resource_type?: string;
  status?: 'success' | 'failure';
  created_after?: string;
  created_before?: string;
  ip_address?: string;
}

// ==================== Advertiser Management Types ====================

export interface AdvertiserListItem {
  id: string;
  userId?: string;
  companyName: string;
  contactPerson?: string;
  contactName?: string;
  contactEmail: string;
  contactPhone?: string;
  industry?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'verified';
  walletBalance?: number;
  balance?: number;
  frozenBalance?: number;
  activeCampaigns?: number;
  status?: 'active' | 'disabled' | 'suspended';
  createdAt?: string;
  registeredAt?: string;
}

export interface AdvertiserDetail extends AdvertiserListItem {
  companyNameEn?: string;
  businessLicense: string;
  businessLicenseUrl: string;
  legalRepresentative: string;
  companySize?: string;
  website?: string;
  contactPhone: string;
  contactAddress?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  totalRecharged: number;
  totalSpent: number;
  statistics: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalOrders: number;
    completedOrders: number;
  };
  recentCampaigns?: Array<{
    id: string;
    title: string;
    status: string;
    budget: number;
    startDate: string;
  }>;
  recentTransactions?: Array<{
    id: string;
    type: 'recharge' | 'consumption';
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

export interface AdvertiserListParams extends PaginationParams {
  keyword?: string;
  verification_status?: 'pending' | 'approved' | 'rejected';
  industry?: string;
  min_balance?: number;
  max_balance?: number;
  created_after?: string;
  created_before?: string;
}

export interface RechargeRecord {
  id: string;
  transactionNo: string;
  amount: number;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  balanceBefore: number;
  balanceAfter: number;
  completedAt?: string;
  createdAt: string;
}

export interface ConsumptionRecord {
  id: string;
  transactionNo: string;
  orderId?: string;
  campaignId?: string;
  amount: number;
  type: 'order_payment' | 'campaign_boost' | 'service_fee';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  completedAt?: string;
  createdAt: string;
}

export interface BalanceAdjustment {
  id: string;
  advertiserId: string;
  amount: number;
  type: 'manual' | 'refund' | 'compensation' | 'penalty';
  reason: string;
  beforeBalance: number;
  afterBalance: number;
  adminId: string;
  createdAt: string;
}

// ==================== Campaign Management Types ====================

export interface CampaignListItem {
  id: string;
  advertiserId?: string;
  advertiserName: string;
  title: string;
  description?: string;
  industry?: string;
  budget: number;
  spentAmount?: number;
  status: 'draft' | 'pending_review' | 'pending' | 'approved' | 'rejected' | 'active' | 'paused' | 'completed' | 'cancelled';
  objective?: 'awareness' | 'engagement' | 'traffic' | 'conversion' | 'sales';
  startDate?: string;
  endDate?: string;
  totalOrders?: number;
  completedOrders?: number;
  totalImpressions?: number;
  totalClicks?: number;
  kolCount?: number;
  performanceScore?: 'excellent' | 'good' | 'average' | 'poor';
  createdAt: string;
}

export interface CampaignDetail extends CampaignListItem {
  budgetType: 'fixed' | 'dynamic';
  pricingModel: 'cpm' | 'cpc' | 'cpa';
  targetAudience: {
    ageRange: string;
    gender: string[];
    locations: string[];
    interests: string[];
  };
  targetPlatforms: string[];
  minFollowers: number;
  maxFollowers: number;
  minEngagementRate: number;
  requiredCategories: string[];
  targetCountries: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  statistics: {
    totalKols: number;
    appliedKols: number;
    selectedKols: number;
    publishedVideos: number;
    totalImpressions: number;
    totalClicks: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    estimatedReach: number;
    actualReach: number;
  };
  kolPerformance?: Array<{
    kolId: string;
    kolName: string;
    impressions: number;
    clicks: number;
    engagements: number;
    conversions: number;
    performanceScore: number;
  }>;
}

export interface CampaignListParams extends PaginationParams {
  keyword?: string;
  status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'active' | 'paused' | 'completed' | 'cancelled';
  advertiser_id?: string;
  industry?: string;
  start_date_after?: string;
  start_date_before?: string;
  min_budget?: number;
  max_budget?: number;
}

export interface CampaignStats {
  campaignId: string;
  overview: {
    totalImpressions: number;
    totalClicks: number;
    ctr: number;
    totalEngagements: number;
    engagementRate: number;
    totalConversions: number;
    conversionRate: number;
    totalCost: number;
    totalRevenue: number;
    roi: number;
  };
  trends: {
    impressions: Array<{ date: string; value: number }>;
    clicks: Array<{ date: string; value: number }>;
  };
  kolPerformance: Array<{
    kolId: string;
    kolName: string;
    impressions: number;
    clicks: number;
    engagements: number;
    conversions: number;
    performanceScore: number;
  }>;
}

export interface CampaignAnomaly {
  id: string;
  campaignId: string;
  kolId?: string;
  orderId?: string;
  anomalyType: 'fake_impressions' | 'fake_clicks' | 'unusual_engagement' | 'budget_overspend' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedValue: number;
  actualValue: number;
  deviationRate: number;
  detectedAt: string;
  detectionMethod: 'ai_model' | 'rule_based' | 'manual_report';
  status: 'pending' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved';
  handledBy?: string;
  handledAt?: string;
}

// ==================== Order Management Types ====================

export interface OrderListItem {
  id: string;
  orderNo: string;
  campaignId?: string;
  campaignName: string;
  advertiserId?: string;
  advertiserName?: string;
  kolId?: string;
  kolName: string;
  kolPlatform?: string;
  platform?: string;
  amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  createdAt: string;
  updatedAt?: string;
}

export interface OrderDetail extends OrderListItem {
  deliverables: {
    videoCount: number;
    imageCount: number;
    postCount: number;
  };
  requirements: string;
  kolProfile: {
    platform: string;
    platformUsername: string;
    followers: number;
    engagementRate: number;
  };
  timeline: {
    acceptedAt?: string;
    submittedAt?: string;
    reviewedAt?: string;
    publishedAt?: string;
    completedAt?: string;
  };
  deliverableUrls?: string[];
  reviewNotes?: string;
  rejectionReason?: string;
  disputeInfo?: {
    reason: string;
    description: string;
    raisedBy: 'advertiser' | 'kol';
    raisedAt: string;
    status: 'pending' | 'investigating' | 'resolved' | 'escalated';
    resolution?: string;
    resolvedAt?: string;
  };
}

export interface OrderListParams extends PaginationParams {
  keyword?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  campaign_id?: string;
  advertiser_id?: string;
  kol_id?: string;
  platform?: string;
  amount_min?: number;
  amount_max?: number;
  created_after?: string;
  created_before?: string;
}

export interface OrderDispute {
  id: string;
  orderId: string;
  orderNo: string;
  campaign: {
    id: string;
    title: string;
  };
  advertiser: {
    id: string;
    name: string;
    email: string;
  };
  kol: {
    id: string;
    name: string;
    email: string;
    platform: string;
  };
  reason: string;
  description: string;
  raisedBy: 'advertiser' | 'kol';
  status: 'pending' | 'investigating' | 'resolved' | 'escalated';
  evidence: string[];
  assignedAdmin?: string;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
}

// ==================== Advanced Settings Types ====================

export interface SensitiveWord {
  id: string;
  word: string;
  category: 'political' | 'pornographic' | 'violent' | 'spam' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'block' | 'review' | 'warn';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemMonitor {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
  };
  database: {
    connections: number;
    maxConnections: number;
    queriesPerSecond: number;
  };
  cache: {
    hitRate: number;
    memoryUsed: number;
    keysCount: number;
  };
  queue: {
    pending: number;
    processing: number;
    failed: number;
  };
  timestamp: string;
}

export interface BackupRecord {
  id: string;
  type: 'full' | 'incremental' | 'database' | 'files';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  size: number;
  location: string;
  startedAt: string;
  completedAt?: string;
  expiresAt?: string;
  createdAt: string;
}
