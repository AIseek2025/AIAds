/**
 * 与 `AppRouter` 嵌套路由 segment 一致；完整 URL 用于侧栏/Hub/navigate。
 * 修改路由时只改此处与 AppRouter 的 element 映射。
 */

export const APP_PATHS = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  adminLogin: '/admin/login',
} as const;

/** 找回/重置密码：从管理端入口进入时 URL 带 `?from=admin`，「返回登录」与成功后跳转目标为 `adminLogin` */
export const AUTH_RECOVERY_FROM_QUERY = 'from';
export const AUTH_RECOVERY_FROM_ADMIN = 'admin';

export function pathForgotPasswordFromAdmin(): string {
  return `${APP_PATHS.forgotPassword}?${AUTH_RECOVERY_FROM_QUERY}=${AUTH_RECOVERY_FROM_ADMIN}`;
}

export function loginPathAfterPasswordRecovery(searchParams: URLSearchParams): string {
  return searchParams.get(AUTH_RECOVERY_FROM_QUERY) === AUTH_RECOVERY_FROM_ADMIN
    ? APP_PATHS.adminLogin
    : APP_PATHS.login;
}

export function pathForgotPasswordPreservingRecoveryContext(searchParams: URLSearchParams): string {
  return searchParams.get(AUTH_RECOVERY_FROM_QUERY) === AUTH_RECOVERY_FROM_ADMIN
    ? pathForgotPasswordFromAdmin()
    : APP_PATHS.forgotPassword;
}

/** 嵌套在 `/advertiser` 下的相对 path（与 `<Route path="/advertiser">` 子项一致） */
export const ADVERTISER_ROUTE_SEG = {
  dashboard: 'dashboard',
  campaigns: 'campaigns',
  campaignsCreate: 'campaigns/create',
  campaignById: 'campaigns/:id',
  campaignEditById: 'campaigns/edit/:id',
  orders: 'orders',
  orderById: 'orders/:id',
  kols: 'kols',
  analytics: 'analytics',
  recharge: 'recharge',
  notifications: 'notifications',
} as const;

/** 嵌套在 `/kol` 下的相对 path */
export const KOL_ROUTE_SEG = {
  dashboard: 'dashboard',
  profile: 'profile',
  accounts: 'accounts',
  taskMarketById: 'task-market/:id',
  taskMarket: 'task-market',
  myTasksById: 'my-tasks/:id',
  myTasks: 'my-tasks',
  earnings: 'earnings',
  analytics: 'analytics',
  notifications: 'notifications',
} as const;

/** 嵌套在 `/admin`（AdminLayout）下的相对 path */
export const ADMIN_ROUTE_SEG = {
  dashboard: 'dashboard',
  users: 'users',
  kols: 'kols',
  kolReview: 'kol-review',
  contentReview: 'content-review',
  finance: 'finance',
  stats: 'stats',
  settings: 'settings',
  /** 顶栏「个人中心」；已在 AppRouter 注册 */
  profile: 'profile',
  /** 管理端忘记密码入口；AppRouter 重定向至全局 `APP_PATHS.forgotPassword` */
  forgotPassword: 'forgot-password',
  /** 修改密码深链；AppRouter 重定向至 `profile`（表单在 AdminProfile） */
  changePassword: 'change-password',
  notifications: 'notifications',
  /** 旧式财务提现深链；AppRouter 重定向至 `finance?tab=withdrawals` */
  financeWithdrawals: 'finance/withdrawals',
  advertisers: 'advertisers',
  advertiserById: 'advertisers/:id',
  campaigns: 'campaigns',
  campaignById: 'campaigns/:id',
  /** 活动规则巡检（与 campaigns/:id 分离，避免路由歧义） */
  campaignAnomalies: 'campaign-anomalies',
  orders: 'orders',
  /** 注册邀请码（增长） */
  inviteCodes: 'invite-codes',
} as const;

export function pathAdvertiser(seg: string): string {
  return `/advertiser/${seg}`;
}

export function pathKol(seg: string): string {
  return `/kol/${seg}`;
}

export function pathAdmin(seg: string): string {
  return `/admin/${seg}`;
}

/** 与 AppRouter 中带 `:id` 的子路由一致 */
export function pathAdvertiserCampaign(id: string): string {
  return pathAdvertiser(`campaigns/${id}`);
}

export function pathAdvertiserCampaignEdit(id: string): string {
  return pathAdvertiser(`campaigns/edit/${id}`);
}

export function pathAdvertiserOrder(id: string): string {
  return pathAdvertiser(`orders/${id}`);
}

export function pathKolTaskMarketDetail(id: string): string {
  return pathKol(`task-market/${id}`);
}

export function pathKolMyTask(id: string): string {
  return pathKol(`my-tasks/${id}`);
}

export function pathAdminAdvertiser(id: string): string {
  return pathAdmin(`advertisers/${id}`);
}

export function pathAdminCampaign(id: string): string {
  return pathAdmin(`campaigns/${id}`);
}

export function pathAdminCampaignAnomalies(): string {
  return pathAdmin(ADMIN_ROUTE_SEG.campaignAnomalies);
}

export function pathAdminProfile(): string {
  return pathAdmin(ADMIN_ROUTE_SEG.profile);
}

/** 管理端财务页 — 提现审核 Tab（与 Finance 页 `?tab=withdrawals` 一致） */
export function pathAdminFinanceWithdrawals(): string {
  return `${pathAdmin(ADMIN_ROUTE_SEG.finance)}?tab=withdrawals`;
}
