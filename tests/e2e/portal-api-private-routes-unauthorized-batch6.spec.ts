import { test, expect } from '@playwright/test';

/**
 * 门户第六组：带查询参数/过滤条件的私域 GET 无 Token → 401（与 batch1–5 互补，覆盖筛选与分页组合）
 */
test.describe('Portal private routes batch6 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: { name: string; path: string }[] = [
    { name: 'orders list with status filter', path: '/api/v1/orders?page=1&page_size=10&status=pending' },
    { name: 'campaigns list with status', path: '/api/v1/campaigns?page=1&status=draft' },
    { name: 'campaigns by id', path: `/api/v1/campaigns/${u}` },
    { name: 'tasks list with platform', path: '/api/v1/tasks?page=1&platform=tiktok' },
    { name: 'kols search keyword', path: '/api/v1/kols?page=1&keyword=beauty' },
    { name: 'notifications page 2', path: '/api/v1/notifications?page=2&page_size=10' },
    { name: 'advertisers transactions', path: '/api/v1/advertisers/me/transactions?page=1&page_size=20' },
    { name: 'orders by id', path: `/api/v1/orders/${u}` },
    { name: 'orders cpm-metrics', path: `/api/v1/orders/${u}/cpm-metrics` },
    { name: 'tasks by id', path: `/api/v1/tasks/${u}` },
  ];

  for (const item of paths) {
    test(`${item.name} returns 401`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const res = await request.get(`${base}${item.path}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status()).toBe(401);
    });
  }
});
