import { test, expect } from '@playwright/test';

/** GET /api/v1/kols/recommend 缺少 campaignId → 400 */
test.describe('Advertiser API KOL recommend validation', () => {
  test('missing campaignId returns 400', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const res = await request.get(`${base}/api/v1/kols/recommend?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
  });
});
