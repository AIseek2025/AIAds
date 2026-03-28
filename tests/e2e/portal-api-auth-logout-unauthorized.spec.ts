import { test, expect } from '@playwright/test';

/** POST /api/v1/auth/logout 需 access token */
test.describe('Portal API auth logout guard', () => {
  test('without Authorization returns 401', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/logout`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(401);
  });
});
