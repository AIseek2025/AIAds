import { test, expect } from '@playwright/test';

/**
 * 公开鉴权接口：空体或缺必填字段 → 校验失败（契约：先于业务逻辑）
 * 与既有 public-api-auth-* 单文件用例互补，集中矩阵覆盖 POST 体
 */
test.describe('Public API auth body validation batch', () => {
  const cases: {
    name: string;
    path: string;
    data: Record<string, unknown>;
    expectStatuses: number[];
  }[] = [
    { name: 'login empty body', path: '/api/v1/auth/login', data: {}, expectStatuses: [400, 422] },
    {
      name: 'login missing password',
      path: '/api/v1/auth/login',
      data: { email: 'a@b.co' },
      expectStatuses: [400, 422],
    },
    { name: 'register empty body', path: '/api/v1/auth/register', data: {}, expectStatuses: [400, 422] },
    {
      name: 'register missing password',
      path: '/api/v1/auth/register',
      data: { email: 'new@example.com' },
      expectStatuses: [400, 422],
    },
    { name: 'refresh empty body', path: '/api/v1/auth/refresh', data: {}, expectStatuses: [400, 422] },
    {
      name: 'refresh blank token',
      path: '/api/v1/auth/refresh',
      data: { refresh_token: '' },
      expectStatuses: [400, 422],
    },
    {
      name: 'verification-code empty',
      path: '/api/v1/auth/verification-code',
      data: {},
      expectStatuses: [400, 422],
    },
    {
      name: 'verify-code empty',
      path: '/api/v1/auth/verify-code',
      data: {},
      expectStatuses: [400, 422],
    },
    {
      name: 'reset-password empty',
      path: '/api/v1/auth/reset-password',
      data: {},
      expectStatuses: [400, 422],
    },
    {
      name: 'login-email-code empty',
      path: '/api/v1/auth/login-email-code',
      data: {},
      expectStatuses: [400, 422],
    },
    {
      name: 'login-email-code missing code',
      path: '/api/v1/auth/login-email-code',
      data: { email: 'a@b.co' },
      expectStatuses: [400, 422],
    },
    {
      name: 'verification-code invalid type',
      path: '/api/v1/auth/verification-code',
      data: { type: 'fax', target: 'a@b.co' },
      expectStatuses: [400, 422],
    },
  ];

  for (const c of cases) {
    test(`${c.name}`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const res = await request.post(`${base}${c.path}`, {
        data: c.data,
        headers: { 'Content-Type': 'application/json' },
      });
      expect(c.expectStatuses).toContain(res.status());
    });
  }
});
