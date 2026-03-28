import { test, expect } from '@playwright/test';

/**
 * 公开鉴权契约第二组：与 batch（空体→400/422）互补
 * — 门户需登录 POST 无 Token → 401；管理端登录/刷新缺字段 → 400/422；管理端 auth/me 无 Token → 401
 */
test.describe('Public API auth contracts batch 2', () => {
  const cases: {
    name: string;
    method: 'get' | 'post';
    path: string;
    data?: Record<string, unknown>;
    expectStatuses: number[];
  }[] = [
    { name: 'auth logout without token', method: 'post', path: '/api/v1/auth/logout', data: {}, expectStatuses: [401] },
    {
      name: 'auth change-password without token',
      method: 'post',
      path: '/api/v1/auth/change-password',
      data: {},
      expectStatuses: [401],
    },
    { name: 'admin auth login empty', method: 'post', path: '/api/v1/admin/auth/login', data: {}, expectStatuses: [400, 422] },
    {
      name: 'admin auth login email only',
      method: 'post',
      path: '/api/v1/admin/auth/login',
      data: { email: 'ops@example.com' },
      expectStatuses: [400, 422],
    },
    {
      name: 'admin auth login password only',
      method: 'post',
      path: '/api/v1/admin/auth/login',
      data: { password: 'SomePass123!' },
      expectStatuses: [400, 422],
    },
    { name: 'admin auth refresh empty', method: 'post', path: '/api/v1/admin/auth/refresh', data: {}, expectStatuses: [400, 422] },
    { name: 'admin auth me without token', method: 'get', path: '/api/v1/admin/auth/me', expectStatuses: [401] },
  ];

  for (const c of cases) {
    test(`${c.name}`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const url = `${base}${c.path}`;
      const headers = { 'Content-Type': 'application/json' };
      const res =
        c.method === 'get'
          ? await request.get(url, { headers })
          : await request.post(url, { data: c.data ?? {}, headers });
      expect(c.expectStatuses).toContain(res.status());
    });
  }
});
