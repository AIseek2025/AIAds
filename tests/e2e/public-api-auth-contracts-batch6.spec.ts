import { test, expect } from '@playwright/test';

/**
 * 公开鉴权契约第六组：与 batch1–5 互补 — 字段类型错误、过长邮箱、错误 purpose 等
 */
test.describe('Public API auth body validation batch 6', () => {
  const cases: {
    name: string;
    path: string;
    data: Record<string, unknown>;
    expectStatuses: number[];
  }[] = [
    {
      name: 'register password not string',
      path: '/api/v1/auth/register',
      data: { email: 'batch6-type@example.com', password: 12345678, role: 'advertiser' },
      expectStatuses: [400, 422],
    },
    {
      name: 'login email not string',
      path: '/api/v1/auth/login',
      data: { email: 12345, password: 'Abcd1234!' },
      expectStatuses: [400, 422],
    },
    {
      name: 'reset-password new_password not string',
      path: '/api/v1/auth/reset-password',
      data: {
        type: 'email',
        target: 'a@b.co',
        code: '123456',
        new_password: 99999999,
      },
      expectStatuses: [400, 422],
    },
    {
      name: 'verify-code code not string',
      path: '/api/v1/auth/verify-code',
      data: { type: 'email', target: 'a@b.co', code: 123456 },
      expectStatuses: [400, 422],
    },
    {
      name: 'refresh_token wrong type',
      path: '/api/v1/auth/refresh',
      data: { refresh_token: ['a', 'b'] },
      expectStatuses: [400, 422],
    },
    {
      name: 'verification-code target not string',
      path: '/api/v1/auth/verification-code',
      data: { type: 'email', target: 12345 },
      expectStatuses: [400, 422],
    },
    {
      name: 'login-email-code code not string',
      path: '/api/v1/auth/login-email-code',
      data: { email: 'ok@example.com', code: 123456 },
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
