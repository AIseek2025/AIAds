import { test, expect } from '@playwright/test';

/** GET /tasks/kols/orders/:id 不存在 → 404 */
test.describe('KOL API tasks kols order by id not found', () => {
  test('unknown order id returns 404', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const res = await request.get(`${base}/api/v1/tasks/kols/orders/00000000-0000-4000-8000-000000000003`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(404);
  });
});
