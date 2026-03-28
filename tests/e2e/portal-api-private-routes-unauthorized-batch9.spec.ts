import { test, expect } from '@playwright/test';

/**
 * 门户第九组：无 Token → 401
 * 列表/推荐/收益等 query 组合（与 batch7–8 互补）
 */
test.describe('Portal private routes batch9 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: { name: string; path: string }[] = [
    { name: 'orders list sort created_at', path: '/api/v1/orders?page=1&page_size=10&sort=created_at&order=desc' },
    { name: 'campaigns list order desc', path: '/api/v1/campaigns?page=1&page_size=5&order=desc' },
    { name: 'tasks instagram open', path: '/api/v1/tasks?page=1&platform=instagram&status=open' },
    { name: 'kols regions multi', path: '/api/v1/kols?page=1&regions=US,UK,DE&keyword=shop' },
    { name: 'kols recommend limit', path: `/api/v1/kols/recommend?campaign_id=${u}&limit=5` },
    { name: 'kols earnings period', path: '/api/v1/kols/earnings?period=month' },
    { name: 'advertiser transactions', path: '/api/v1/advertisers/me/transactions?page=1&page_size=5' },
    { name: 'notifications page 3', path: '/api/v1/notifications?page=3&page_size=10' },
    { name: 'orders by id v', path: `/api/v1/orders/${u}?v=2` },
    { name: 'campaigns by id v', path: `/api/v1/campaigns/${u}?v=2` },
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
