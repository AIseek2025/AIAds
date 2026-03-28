import { test, expect } from '@playwright/test';

/** POST /api/v1/auth/reset-password 参数不全 → 422 */
test.describe('Public API auth reset-password validation', () => {
  test('empty body returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/reset-password`, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });
});
