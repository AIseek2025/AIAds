import { test, expect } from '@playwright/test';

/**
 * 管理端补充：无 Token 时更多入口应 401（与 admin-api-private-routes-unauthorized 互补）
 */
test.describe('Admin API extended private routes without token', () => {
  const paths: { name: string; method: 'get' | 'post' | 'put'; path: string; data?: Record<string, unknown> }[] = [
    { name: 'dashboard analytics', method: 'get', path: '/api/v1/admin/dashboard/analytics' },
    { name: 'campaigns budget-risks', method: 'get', path: '/api/v1/admin/campaigns/budget-risks?page=1&page_size=5' },
    { name: 'campaigns abnormal', method: 'get', path: '/api/v1/admin/campaigns/abnormal?page=1&page_size=5' },
    { name: 'content history', method: 'get', path: '/api/v1/admin/content/history?page=1&page_size=5' },
    { name: 'content pending', method: 'get', path: '/api/v1/admin/content/pending?page=1&page_size=5' },
    { name: 'finance transactions', method: 'get', path: '/api/v1/admin/finance/transactions?page=1&page_size=5' },
    { name: 'user activity', method: 'get', path: '/api/v1/admin/users/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/activity' },
    { name: 'settings backup create', method: 'post', path: '/api/v1/admin/settings/backup/create', data: {} },
    { name: 'orders export', method: 'post', path: '/api/v1/admin/orders/export', data: {} },
    { name: 'orders metrics batch', method: 'put', path: '/api/v1/admin/orders/metrics/batch', data: {} },
    { name: 'finance recharge confirm', method: 'post', path: '/api/v1/admin/finance/recharge/confirm', data: {} },
    { name: 'stats overview alt', method: 'get', path: '/api/v1/admin/stats/campaigns' },
  ];

  for (const item of paths) {
    test(`${item.name} returns 401 without Authorization`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const url = `${base}${item.path}`;
      let res;
      if (item.method === 'get') {
        res = await request.get(url);
      } else if (item.method === 'put') {
        res = await request.put(url, {
          data: item.data ?? {},
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        res = await request.post(url, {
          data: item.data ?? {},
          headers: { 'Content-Type': 'application/json' },
        });
      }
      expect(res.status()).toBe(401);
    });
  }
});
