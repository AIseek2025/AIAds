import { test, expect } from '@playwright/test';

/** PUT /api/v1/tasks/kols/orders/:id/submit draft_urls 为空 → 422 */
test.describe('KOL API submit order body validation', () => {
  test('empty draft_urls returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const me = await request.get(`${base}/api/v1/kols/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(me.status() === 404, 'KOL 未建档');

    const oid = '00000000-0000-0000-0000-000000000000';
    const res = await request.put(`${base}/api/v1/tasks/kols/orders/${oid}/submit`, {
      data: { draft_urls: [] },
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });
});
