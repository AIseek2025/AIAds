import { test, expect } from '@playwright/test';

/** POST /api/v1/admin/auth/login 密码不足 8 位 → 422 */
test.describe('Admin API login password length', () => {
  test('short password returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/admin/auth/login`, {
      data: { email: 'admin@example.com', password: 'short' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });
});
