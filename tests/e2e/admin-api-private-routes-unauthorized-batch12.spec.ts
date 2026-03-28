import { test, expect } from '@playwright/test';

/**
 * 管理端第十二组：无 Admin Token → 401
 * 看板/订单/活动/财务 等 query 组合（与 batch11 互补）
 */
test.describe('Admin API private routes batch12 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: { name: string; path: string }[] = [
    { name: 'dashboard stats range', path: '/api/v1/admin/dashboard/stats?range=month&compare=1' },
    { name: 'dashboard analytics funnel', path: '/api/v1/admin/dashboard/analytics?period=week&metric=funnel' },
    { name: 'dashboard kol-rankings sort', path: '/api/v1/admin/dashboard/kol-rankings?limit=50&sort=engagement' },
    { name: 'stats orders day', path: '/api/v1/admin/stats/orders?period=day&group_by=hour' },
    { name: 'stats campaigns quarter', path: '/api/v1/admin/stats/campaigns?period=quarter&page=1' },
    { name: 'finance withdrawals list filter', path: '/api/v1/admin/finance/withdrawals?page=1&status=pending&page_size=5' },
    { name: 'orders list platform filter', path: '/api/v1/admin/orders?page=1&platform=tiktok&page_size=5' },
    { name: 'campaigns list budget min', path: '/api/v1/admin/campaigns?page=1&min_budget=100&page_size=5' },
    { name: 'advertisers list verification_status', path: '/api/v1/admin/advertisers?page=1&verification_status=verified' },
    { name: 'user activity log', path: `/api/v1/admin/users/${u}/activity?page=1&limit=20` },
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
