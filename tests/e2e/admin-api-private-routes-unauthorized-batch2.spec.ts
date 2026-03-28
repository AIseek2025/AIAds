import { test, expect } from '@playwright/test';

/**
 * 管理端补充：无 Admin Token 时 401（与 admin-api-private-routes-unauthorized / extended 互补）
 * 覆盖：MFA 与重置密码、单资源 CRUD 类、内容批量、财务调账、活动/订单子资源、统计、设置角色与敏感词
 */
test.describe('Admin API private routes batch2 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: {
    name: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    path: string;
    data?: Record<string, unknown>;
  }[] = [
    { name: 'auth me', method: 'get', path: '/api/v1/admin/auth/me' },
    { name: 'auth reset-password', method: 'post', path: '/api/v1/admin/auth/reset-password', data: {} },
    { name: 'mfa enable', method: 'post', path: '/api/v1/admin/auth/mfa/enable', data: {} },
    { name: 'mfa verify', method: 'post', path: '/api/v1/admin/auth/mfa/verify', data: {} },
    { name: 'mfa disable', method: 'post', path: '/api/v1/admin/auth/mfa/disable', data: {} },
    { name: 'users by id', method: 'get', path: `/api/v1/admin/users/${u}` },
    { name: 'users put', method: 'put', path: `/api/v1/admin/users/${u}`, data: {} },
    { name: 'users delete', method: 'delete', path: `/api/v1/admin/users/${u}` },
    { name: 'users ban', method: 'put', path: `/api/v1/admin/users/${u}/ban`, data: {} },
    { name: 'kols verify', method: 'put', path: `/api/v1/admin/kols/${u}/verify`, data: {} },
    { name: 'kols approve', method: 'post', path: `/api/v1/admin/kols/${u}/approve`, data: {} },
    { name: 'content by id', method: 'get', path: `/api/v1/admin/content/${u}` },
    { name: 'content batch-verify', method: 'post', path: '/api/v1/admin/content/batch-verify', data: {} },
    { name: 'finance withdrawal by id', method: 'get', path: `/api/v1/admin/finance/withdrawals/${u}` },
    { name: 'finance balance adjust', method: 'put', path: '/api/v1/admin/finance/balance/adjust', data: {} },
    { name: 'campaigns stats', method: 'get', path: `/api/v1/admin/campaigns/${u}/stats` },
    { name: 'orders metrics', method: 'put', path: `/api/v1/admin/orders/${u}/metrics`, data: {} },
    { name: 'stats revenue', method: 'get', path: '/api/v1/admin/stats/revenue' },
    { name: 'stats orders', method: 'get', path: '/api/v1/admin/stats/orders' },
    { name: 'stats content', method: 'get', path: '/api/v1/admin/stats/content' },
    { name: 'settings roles', method: 'get', path: '/api/v1/admin/settings/roles' },
    { name: 'settings sensitive-words post', method: 'post', path: '/api/v1/admin/settings/sensitive-words', data: { word: 'x' } },
    { name: 'settings sensitive-words delete', method: 'delete', path: `/api/v1/admin/settings/sensitive-words/${u}` },
  ];

  for (const item of paths) {
    test(`${item.name} returns 401 without Authorization`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const url = `${base}${item.path}`;
      const headers = { 'Content-Type': 'application/json' };
      let res;
      switch (item.method) {
        case 'get':
          res = await request.get(url, { headers });
          break;
        case 'post':
          res = await request.post(url, { data: item.data ?? {}, headers });
          break;
        case 'put':
          res = await request.put(url, { data: item.data ?? {}, headers });
          break;
        case 'patch':
          res = await request.patch(url, { data: item.data ?? {}, headers });
          break;
        case 'delete':
          res = await request.delete(url, { headers });
          break;
        default:
          throw new Error(item.method);
      }
      expect(res.status()).toBe(401);
    });
  }
});
