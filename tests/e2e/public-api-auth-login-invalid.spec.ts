import { test, expect } from '@playwright/test';

/** POST /api/v1/auth/login 非法邮箱或错误密码 */
test.describe('Public API auth login validation', () => {
  test('invalid email format returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/login`, {
      data: { email: 'not-email', password: 'Abcd1234!' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });

  test('well-formed email with wrong password returns 401', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/login`, {
      data: { email: 'nonexistent-user-e2e@example.invalid', password: 'Abcd1234!' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(401);
  });
});
