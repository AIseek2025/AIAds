import { test, expect } from '@playwright/test';

/** GET /api/v1/orders/:id/cpm-metrics 不存在订单 → 404 */
test.describe('Advertiser API order CPM metrics not found', () => {
  test('random order id returns 404', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request.get(`${base}/api/v1/orders/${fakeId}/cpm-metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(404);
  });
});
