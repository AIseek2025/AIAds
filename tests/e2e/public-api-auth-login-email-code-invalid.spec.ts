import { test, expect } from '@playwright/test';

/** POST /api/v1/auth/login-email-code 参数校验 */
test.describe('Public API auth login-email-code validation', () => {
  test('invalid email returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/login-email-code`, {
      data: { email: 'bad', code: '123456' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });
});
