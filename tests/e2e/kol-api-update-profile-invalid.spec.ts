import { test, expect } from '@playwright/test';

/** PUT /api/v1/kols/me 非法 base_price → 422 */
test.describe('KOL API update profile validation', () => {
  test('negative base_price returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const me = await request.get(`${base}/api/v1/kols/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(me.status() === 404, 'KOL 未建档');

    const res = await request.put(`${base}/api/v1/kols/me`, {
      data: { base_price: -10 },
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });
});
