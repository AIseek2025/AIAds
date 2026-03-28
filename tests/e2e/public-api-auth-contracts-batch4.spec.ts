import { test, expect } from '@playwright/test';

/**
 * 公开鉴权契约第四组：与 batch1–3 互补 — 缺必填字段、非法枚举/邮箱等业务校验（400/422）
 */
test.describe('Public API auth body validation batch 4', () => {
  const cases: {
    name: string;
    path: string;
    data: Record<string, unknown>;
    expectStatuses: number[];
  }[] = [
    {
      name: 'register missing email',
      path: '/api/v1/auth/register',
      data: { password: 'Abcd1234!', role: 'advertiser' },
      expectStatuses: [400, 422],
    },
    {
      name: 'register missing password',
      path: '/api/v1/auth/register',
      data: { email: 'newuser-batch4@example.com', role: 'advertiser' },
      expectStatuses: [400, 422],
    },
    {
      name: 'login missing password',
      path: '/api/v1/auth/login',
      data: { email: 'a@b.co' },
      expectStatuses: [400, 422],
    },
    {
      name: 'reset-password missing new_password',
      path: '/api/v1/auth/reset-password',
      data: { type: 'email', target: 'a@b.co', code: '123456' },
      expectStatuses: [400, 422],
    },
    {
      name: 'verify-code missing code',
      path: '/api/v1/auth/verify-code',
      data: { type: 'email', target: 'a@b.co' },
      expectStatuses: [400, 422],
    },
    {
      name: 'login-email-code bad email',
      path: '/api/v1/auth/login-email-code',
      data: { email: 'not-an-email', code: '123456' },
      expectStatuses: [400, 422],
    },
    {
      name: 'verification-code invalid type',
      path: '/api/v1/auth/verification-code',
      data: { type: 'invalid_type_xyz', target: 'a@b.co' },
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
