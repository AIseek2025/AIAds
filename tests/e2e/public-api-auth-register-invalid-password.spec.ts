import { test, expect } from '@playwright/test';

/** POST /api/v1/auth/register 弱密码 → 422 */
test.describe('Public API register password validation', () => {
  test('weak password returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/register`, {
      data: { email: 'e2e-weak-pw@example.com', password: 'short' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });
});
