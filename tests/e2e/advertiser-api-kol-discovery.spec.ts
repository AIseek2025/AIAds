import { test, expect } from '@playwright/test';

/** 广告主 GET /kols/:id（不存在时 404） */
test.describe('Advertiser API KOL discovery by id', () => {
  test('unknown id returns 404', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const res = await request.get(`${base}/api/v1/kols/00000000-0000-4000-8000-000000000001`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(404);
  });
});
