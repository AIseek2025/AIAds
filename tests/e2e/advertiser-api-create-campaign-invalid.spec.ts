import { test, expect } from '@playwright/test';

/** POST /api/v1/campaigns 非法 body → 422 */
test.describe('Advertiser API create campaign validation', () => {
  test('empty body returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const res = await request.post(`${base}/api/v1/campaigns`, {
      data: {},
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });
});
