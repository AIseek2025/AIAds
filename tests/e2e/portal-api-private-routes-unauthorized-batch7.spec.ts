import { test, expect } from '@playwright/test';

/**
 * 门户第七组：无 Token → 401
 * 覆盖：订单/活动/任务/KOL 的多条件查询字符串（与 batch6 单条件/分页互补）
 */
test.describe('Portal private routes batch7 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: { name: string; path: string }[] = [
    {
      name: 'orders list campaign and status',
      path: `/api/v1/orders?page=1&page_size=5&status=pending&campaign_id=${u}`,
    },
    { name: 'campaigns list active', path: '/api/v1/campaigns?page=1&page_size=5&status=active' },
    { name: 'campaigns list draft', path: '/api/v1/campaigns?page=1&page_size=5&status=draft' },
    {
      name: 'tasks list platform and status',
      path: '/api/v1/tasks?page=1&page_size=5&status=open&platform=tiktok',
    },
    {
      name: 'tasks list budget range',
      path: '/api/v1/tasks?page=1&min_budget=10&max_budget=9000',
    },
    {
      name: 'kols search followers keyword region',
      path: '/api/v1/kols?page=1&min_followers=1000&max_followers=200000&keyword=game&regions=US',
    },
    {
      name: 'kols search category engagement',
      path: '/api/v1/kols?page=1&categories=美妆&min_engagement_rate=0.01',
    },
    { name: 'notifications page 1', path: '/api/v1/notifications?page=1&page_size=5' },
    { name: 'orders list completed', path: '/api/v1/orders?page=1&page_size=5&status=completed' },
    { name: 'tasks list closed', path: '/api/v1/tasks?page=1&page_size=5&status=closed' },
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
