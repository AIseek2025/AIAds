import { test, expect } from '@playwright/test';

/** 门户会话类接口无 Token → 401 */
test.describe('Portal API auth session without token', () => {
  test('GET /auth/me returns 401', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.get(`${base}/api/v1/auth/me`);
    expect(res.status()).toBe(401);
  });

  test('POST /auth/logout returns 401', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/logout`, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(401);
  });
});
