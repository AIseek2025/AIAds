import { test, expect } from '@playwright/test';

/** POST /api/v1/auth/refresh 缺少或非空 refresh_token → 422 */
test.describe('Public API auth refresh body validation', () => {
  test('empty refresh_token returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/refresh`, {
      data: { refresh_token: '' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });

  test('missing refresh_token returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/refresh`, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });
});
