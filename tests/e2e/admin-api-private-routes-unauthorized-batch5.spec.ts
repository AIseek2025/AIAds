import { test, expect } from '@playwright/test';

/**
 * 管理端第五组：无 Admin Token → 401（与 batch1–4 互补，不重复 list 分页契约）
 * 覆盖：KOL 待审与解挂、统计导出与多维查询、财务导出与待审提现队列
 */
test.describe('Admin API private routes batch5 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: {
    name: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    path: string;
    data?: Record<string, unknown>;
  }[] = [
    { name: 'kols pending', method: 'get', path: '/api/v1/admin/kols/pending?page=1&page_size=5' },
    { name: 'kols unsuspend', method: 'post', path: `/api/v1/admin/kols/${u}/unsuspend`, data: {} },
    { name: 'stats users', method: 'get', path: '/api/v1/admin/stats/users' },
    { name: 'stats kols', method: 'get', path: '/api/v1/admin/stats/kols' },
    { name: 'stats export', method: 'get', path: '/api/v1/admin/stats/export' },
    { name: 'stats trends', method: 'get', path: '/api/v1/admin/stats/trends' },
    { name: 'stats comparison', method: 'get', path: '/api/v1/admin/stats/comparison' },
    { name: 'finance export', method: 'get', path: '/api/v1/admin/finance/export' },
    { name: 'finance withdrawals pending', method: 'get', path: '/api/v1/admin/finance/withdrawals/pending?page=1' },
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
