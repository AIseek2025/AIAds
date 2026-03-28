import { test, expect } from '@playwright/test';

/**
 * 管理端：无 Admin Token 时受保护路由应 401（与 admin-api-auth-guard 互补，覆盖多模块入口）
 */
test.describe('Admin API private routes without token', () => {
  const paths: { name: string; method: 'get' | 'post' | 'put'; path: string; data?: Record<string, unknown> }[] = [
    { name: 'users list', method: 'get', path: '/api/v1/admin/users?page=1&limit=5' },
    { name: 'kols list', method: 'get', path: '/api/v1/admin/kols?page=1&page_size=5' },
    { name: 'orders list', method: 'get', path: '/api/v1/admin/orders?page=1&page_size=5' },
    { name: 'campaigns list', method: 'get', path: '/api/v1/admin/campaigns?page=1&page_size=5' },
    { name: 'advertisers list', method: 'get', path: '/api/v1/admin/advertisers?page=1&page_size=5' },
    { name: 'content list', method: 'get', path: '/api/v1/admin/content?page=1&page_size=5' },
    { name: 'finance overview', method: 'get', path: '/api/v1/admin/finance/overview' },
    { name: 'dashboard stats', method: 'get', path: '/api/v1/admin/dashboard/stats' },
    { name: 'stats overview', method: 'get', path: '/api/v1/admin/stats/overview' },
    { name: 'settings system', method: 'get', path: '/api/v1/admin/settings/system' },
    { name: 'invite codes', method: 'get', path: '/api/v1/admin/invite-codes?page=1&page_size=5' },
    { name: 'orders disputes', method: 'get', path: '/api/v1/admin/orders/disputes?page=1&page_size=5' },
    { name: 'auth change password', method: 'put', path: '/api/v1/admin/auth/password', data: {} },
    { name: 'auth logout', method: 'post', path: '/api/v1/admin/auth/logout', data: {} },
    { name: 'mfa generate', method: 'post', path: '/api/v1/admin/auth/mfa/generate', data: {} },
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
