import { test, expect } from '@playwright/test';

/**
 * 门户第十一组：无 Token → 401
 * 订单/任务/充值路径与 query 组合（与 batch10 互补）
 */
test.describe('Portal private routes batch11 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: { name: string; path: string }[] = [
    { name: 'orders list status pending', path: '/api/v1/orders?page=1&page_size=5&status=pending' },
    { name: 'orders list keyword', path: '/api/v1/orders?page=1&keyword=sku&sort=updated_at' },
    { name: 'tasks market min max budget', path: '/api/v1/tasks?page=1&min_budget=10&max_budget=1000&platform=youtube' },
    { name: 'kols search engagement', path: '/api/v1/kols?page=1&min_engagement_rate=0.02&keyword=tech' },
    { name: 'advertiser me recharge post only get balance', path: '/api/v1/advertisers/me/balance?fresh=1' },
    { name: 'notifications list read mix', path: '/api/v1/notifications?page=2&page_size=20&unread_only=false' },
    { name: 'campaigns list draft', path: '/api/v1/campaigns?page=1&status=draft&page_size=10' },
    { name: 'integrations tiktok stats', path: '/api/v1/integrations/tiktok/stats?range=7d' },
    { name: 'order by id metrics', path: `/api/v1/orders/${u}?include=cpm` },
    { name: 'kol profile by id', path: `/api/v1/kols/${u}?fields=bio,price` },
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
