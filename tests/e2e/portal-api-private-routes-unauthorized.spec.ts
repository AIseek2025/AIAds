import { test, expect } from '@playwright/test';

/**
 * 门户需登录接口在无 Authorization 时应 401（契约：鉴权先于业务）
 */
test.describe('Portal private routes without token', () => {
  const paths: { name: string; method: 'get' | 'post'; path: string; data?: Record<string, unknown> }[] = [
    { name: 'auth me', method: 'get', path: '/api/v1/auth/me' },
    { name: 'orders list', method: 'get', path: '/api/v1/orders?page=1' },
    { name: 'orders create', method: 'post', path: '/api/v1/orders', data: {} },
    { name: 'campaigns list', method: 'get', path: '/api/v1/campaigns?page=1' },
    { name: 'campaigns create', method: 'post', path: '/api/v1/campaigns', data: {} },
    { name: 'advertisers me', method: 'get', path: '/api/v1/advertisers/me' },
    { name: 'advertisers recharge', method: 'post', path: '/api/v1/advertisers/me/recharge', data: {} },
    { name: 'kols search', method: 'get', path: '/api/v1/kols?page=1&page_size=5' },
    { name: 'notifications list', method: 'get', path: '/api/v1/notifications?page=1' },
    { name: 'notifications unread-count', method: 'get', path: '/api/v1/notifications/unread-count' },
    { name: 'tasks list', method: 'get', path: '/api/v1/tasks?page=1' },
    { name: 'tiktok auth url', method: 'get', path: '/api/v1/integrations/tiktok/auth' },
    { name: 'youtube auth url', method: 'get', path: '/api/v1/integrations/youtube/auth' },
    { name: 'instagram auth url', method: 'get', path: '/api/v1/integrations/instagram/auth' },
    { name: 'notifications read-all', method: 'post', path: '/api/v1/notifications/read-all', data: {} },
  ];

  for (const item of paths) {
    test(`${item.name} returns 401 without Authorization`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const url = `${base}${item.path}`;
      const res =
        item.method === 'get'
          ? await request.get(url, { headers: { 'Content-Type': 'application/json' } })
          : await request.post(url, {
              data: item.data ?? {},
              headers: { 'Content-Type': 'application/json' },
            });
      expect(res.status()).toBe(401);
    });
  }
});
