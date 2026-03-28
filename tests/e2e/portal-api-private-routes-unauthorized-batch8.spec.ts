import { test, expect } from '@playwright/test';

/**
 * 门户第八组：无 Token → 401
 * 列表类接口带排序/活动/预算等 query（与 batch7 互补）
 */
test.describe('Portal private routes batch8 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: { name: string; path: string }[] = [
    { name: 'orders list sort', path: '/api/v1/orders?page=1&page_size=10&sort=created_at&order=desc' },
    { name: 'campaigns list order asc', path: '/api/v1/campaigns?page=1&page_size=5&order=asc' },
    { name: 'tasks list budget and platform', path: '/api/v1/tasks?page=1&min_budget=1&max_budget=99999&platform=instagram' },
    { name: 'kols search regions', path: '/api/v1/kols?page=1&regions=US,UK&keyword=test' },
    { name: 'kols search categories', path: '/api/v1/kols?page=1&categories=美妆,数码' },
    { name: 'integrations instagram status query', path: '/api/v1/integrations/instagram/status?nocache=1' },
    { name: 'integrations tiktok status query', path: '/api/v1/integrations/tiktok/status?v=2' },
    { name: 'orders by id include', path: `/api/v1/orders/${u}?t=${Date.now()}` },
    { name: 'tasks by id cache-bust', path: `/api/v1/tasks/${u}?x=1` },
    { name: 'campaigns by id cache-bust', path: `/api/v1/campaigns/${u}?refresh=1` },
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
