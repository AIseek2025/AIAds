import { test, expect } from '@playwright/test';

/**
 * 门户第十二组：无 Token → 401
 * KOL/广告主/任务/集成 等路径与 query（与 batch11 互补）
 */
test.describe('Portal private routes batch12 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: { name: string; path: string }[] = [
    { name: 'kols me stats range', path: '/api/v1/kols/me/stats?range=30d' },
    { name: 'kols balance fresh', path: '/api/v1/kols/balance?refresh=1' },
    { name: 'kols earnings history page', path: '/api/v1/kols/earnings/history?page=2&page_size=10' },
    { name: 'advertisers me transactions filter', path: '/api/v1/advertisers/me/transactions?type=freeze&page=1' },
    { name: 'tasks kols orders list', path: '/api/v1/tasks/kols/orders?page=1&status=submitted' },
    { name: 'integrations instagram status nocache', path: '/api/v1/integrations/instagram/status?nocache=1&t=1' },
    { name: 'integrations tiktok auth state', path: '/api/v1/integrations/tiktok/auth?state=abc&scope=user' },
    { name: 'kols accounts list', path: '/api/v1/kols/accounts?page=1&page_size=20' },
    { name: 'orders cpm-metrics', path: `/api/v1/orders/${u}/cpm-metrics?period=week` },
    { name: 'kol discovery by id extra', path: `/api/v1/kols/${u}?include=accounts` },
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
