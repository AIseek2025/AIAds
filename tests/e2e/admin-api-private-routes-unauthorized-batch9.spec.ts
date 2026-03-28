import { test, expect } from '@playwright/test';

/**
 * 管理端第九组：无 Admin Token → 401
 * 分析/统计/财务/活动风险与内容历史等带 query 的 GET（与 batch8 路径组合互补）
 */
test.describe('Admin API private routes batch9 without token', () => {
  const paths: { name: string; path: string }[] = [
    { name: 'dashboard analytics period', path: '/api/v1/admin/dashboard/analytics?period=month' },
    { name: 'stats revenue quarter', path: '/api/v1/admin/stats/revenue?period=quarter' },
    { name: 'stats orders week', path: '/api/v1/admin/stats/orders?period=week' },
    { name: 'stats kols month', path: '/api/v1/admin/stats/kols?period=month' },
    { name: 'stats users month', path: '/api/v1/admin/stats/users?period=month' },
    { name: 'campaigns budget-risks', path: '/api/v1/admin/campaigns/budget-risks?page=1&page_size=5' },
    { name: 'campaigns abnormal', path: '/api/v1/admin/campaigns/abnormal?page=1&page_size=5' },
    { name: 'content history', path: '/api/v1/admin/content/history?page=1&page_size=5' },
    { name: 'finance transactions', path: '/api/v1/admin/finance/transactions?page=1&page_size=5' },
    { name: 'invite codes list active', path: '/api/v1/admin/invite-codes?page=1&page_size=5&active=true' },
  ];

  for (const item of paths) {
    test(`${item.name} returns 401 without Authorization`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const res = await request.get(`${base}${item.path}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status()).toBe(401);
    });
  }
});
