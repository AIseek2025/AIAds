import { test, expect } from '@playwright/test';

/**
 * 公开鉴权契约第三组：与 batch / batch2 互补
 * — 非法邮箱、弱密码、缺字段等业务校验（400/422）
 */
test.describe('Public API auth body validation batch 3', () => {
  const cases: {
    name: string;
    path: string;
    data: Record<string, unknown>;
    expectStatuses: number[];
  }[] = [
    {
      name: 'register invalid email format',
      path: '/api/v1/auth/register',
      data: { email: 'not-an-email', password: 'Abcd1234!', role: 'advertiser' },
      expectStatuses: [400, 422],
    },
    {
      name: 'register weak password',
      path: '/api/v1/auth/register',
      data: { email: 'newuser@example.com', password: 'abcdefgh', role: 'advertiser' },
      expectStatuses: [400, 422],
    },
    {
      name: 'login invalid email',
      path: '/api/v1/auth/login',
      data: { email: 'bad', password: 'Abcd1234!' },
      expectStatuses: [400, 422],
    },
    {
      name: 'reset-password missing code',
      path: '/api/v1/auth/reset-password',
      data: { type: 'email', target: 'a@b.co', new_password: 'Abcd1234!' },
      expectStatuses: [400, 422],
    },
    {
      name: 'verify-code missing target',
      path: '/api/v1/auth/verify-code',
      data: { type: 'email', code: '123456' },
      expectStatuses: [400, 422],
    },
    {
      name: 'send-verification-code missing type',
      path: '/api/v1/auth/verification-code',
      data: { target: 'a@b.co' },
      expectStatuses: [400, 422],
    },
    {
      name: 'login-email-code wrong code length',
      path: '/api/v1/auth/login-email-code',
      data: { email: 'a@b.co', code: '12' },
      expectStatuses: [400, 422],
    },
    {
      name: 'refresh token too short',
      path: '/api/v1/auth/refresh',
      data: { refresh_token: 'x' },
      expectStatuses: [400, 422, 401],
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
