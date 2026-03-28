import { test, expect } from '@playwright/test';

/**
 * 公开鉴权契约第五组：与 batch1–4 互补 — 空 JSON、缺 refresh_token、非法角色等
 */
test.describe('Public API auth body validation batch 5', () => {
  const cases: {
    name: string;
    path: string;
    data: Record<string, unknown> | undefined;
    expectStatuses: number[];
  }[] = [
    {
      name: 'register empty object',
      path: '/api/v1/auth/register',
      data: {},
      expectStatuses: [400, 422],
    },
    {
      name: 'login empty object',
      path: '/api/v1/auth/login',
      data: {},
      expectStatuses: [400, 422],
    },
    {
      name: 'refresh empty object',
      path: '/api/v1/auth/refresh',
      data: {},
      expectStatuses: [400, 422],
    },
    {
      name: 'register invalid role string',
      path: '/api/v1/auth/register',
      data: { email: 'batch5-role@example.com', password: 'Abcd1234!', role: 'superman' },
      expectStatuses: [400, 422],
    },
    {
      name: 'verify-code empty body',
      path: '/api/v1/auth/verify-code',
      data: {},
      expectStatuses: [400, 422],
    },
    {
      name: 'send-verification-code empty body',
      path: '/api/v1/auth/verification-code',
      data: {},
      expectStatuses: [400, 422],
    },
    {
      name: 'login-email-code empty body',
      path: '/api/v1/auth/login-email-code',
      data: {},
      expectStatuses: [400, 422],
    },
  ];

  for (const c of cases) {
    test(`${c.name}`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const res = await request.post(`${base}${c.path}`, {
        data: c.data ?? {},
        headers: { 'Content-Type': 'application/json' },
      });
      expect(c.expectStatuses).toContain(res.status());
    });
  }
});
