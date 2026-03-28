import { describe, it, expect } from 'vitest';
import {
  APP_PATHS,
  ADVERTISER_ROUTE_SEG,
  KOL_ROUTE_SEG,
  ADMIN_ROUTE_SEG,
  AUTH_RECOVERY_FROM_ADMIN,
  AUTH_RECOVERY_FROM_QUERY,
  pathAdvertiser,
  pathKol,
  pathAdmin,
  pathAdvertiserCampaign,
  pathAdvertiserCampaignEdit,
  pathAdvertiserOrder,
  pathKolTaskMarketDetail,
  pathKolMyTask,
  pathAdminAdvertiser,
  pathAdminCampaign,
  pathAdminCampaignAnomalies,
  pathAdminProfile,
  pathAdminFinanceWithdrawals,
  pathForgotPasswordFromAdmin,
  loginPathAfterPasswordRecovery,
  pathForgotPasswordPreservingRecoveryContext,
} from '../appPaths';

describe('appPaths', () => {
  it('公开路由常量与历史路径一致', () => {
    expect(APP_PATHS.login).toBe('/login');
    expect(APP_PATHS.register).toBe('/register');
    expect(APP_PATHS.forgotPassword).toBe('/forgot-password');
    expect(APP_PATHS.adminLogin).toBe('/admin/login');
  });

  it('path* 拼接与嵌套路由 segment 一致', () => {
    expect(pathAdvertiser(ADVERTISER_ROUTE_SEG.dashboard)).toBe('/advertiser/dashboard');
    expect(pathAdvertiser(ADVERTISER_ROUTE_SEG.notifications)).toBe('/advertiser/notifications');
    expect(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaignsCreate)).toBe('/advertiser/campaigns/create');
    expect(pathKol(KOL_ROUTE_SEG.taskMarket)).toBe('/kol/task-market');
    expect(pathKol(KOL_ROUTE_SEG.earnings)).toBe('/kol/earnings');
    expect(pathKol(KOL_ROUTE_SEG.dashboard)).toBe('/kol/dashboard');
    expect(pathKol(KOL_ROUTE_SEG.notifications)).toBe('/kol/notifications');
    expect(pathAdmin(ADMIN_ROUTE_SEG.kolReview)).toBe('/admin/kol-review');
    expect(pathAdmin(ADMIN_ROUTE_SEG.inviteCodes)).toBe('/admin/invite-codes');
  });

  it('带 id 的路径与 AppRouter 动态段一致', () => {
    expect(pathAdvertiserCampaign('c1')).toBe('/advertiser/campaigns/c1');
    expect(pathAdvertiserCampaignEdit('c1')).toBe('/advertiser/campaigns/edit/c1');
    expect(pathAdvertiserOrder('o1')).toBe('/advertiser/orders/o1');
    expect(pathKolTaskMarketDetail('t1')).toBe('/kol/task-market/t1');
    expect(pathKolMyTask('t1')).toBe('/kol/my-tasks/t1');
    expect(pathAdminAdvertiser('a1')).toBe('/admin/advertisers/a1');
    expect(pathAdminCampaign('c1')).toBe('/admin/campaigns/c1');
    expect(pathAdminCampaignAnomalies()).toBe('/admin/campaign-anomalies');
    expect(pathAdminProfile()).toBe('/admin/profile');
    expect(pathAdminFinanceWithdrawals()).toBe('/admin/finance?tab=withdrawals');
  });

  it('管理端深链 segment 与 AppRouter 一致', () => {
    expect(pathAdmin(ADMIN_ROUTE_SEG.forgotPassword)).toBe('/admin/forgot-password');
    expect(pathAdmin(ADMIN_ROUTE_SEG.changePassword)).toBe('/admin/change-password');
    expect(pathAdmin(ADMIN_ROUTE_SEG.financeWithdrawals)).toBe('/admin/finance/withdrawals');
  });

  it('管理端找回密码上下文：返回登录目标与 forgot 深链', () => {
    expect(pathForgotPasswordFromAdmin()).toBe(
      `${APP_PATHS.forgotPassword}?${AUTH_RECOVERY_FROM_QUERY}=${AUTH_RECOVERY_FROM_ADMIN}`
    );
    const adminCtx = new URLSearchParams({ [AUTH_RECOVERY_FROM_QUERY]: AUTH_RECOVERY_FROM_ADMIN });
    expect(loginPathAfterPasswordRecovery(adminCtx)).toBe(APP_PATHS.adminLogin);
    expect(pathForgotPasswordPreservingRecoveryContext(adminCtx)).toBe(pathForgotPasswordFromAdmin());
    const plain = new URLSearchParams();
    expect(loginPathAfterPasswordRecovery(plain)).toBe(APP_PATHS.login);
    expect(pathForgotPasswordPreservingRecoveryContext(plain)).toBe(APP_PATHS.forgotPassword);
  });
});
