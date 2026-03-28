import { test, expect } from '@playwright/test';

/** 广告主调用 POST /api/v1/kols/profile → 400（角色非 KOL） */
test.describe('Advertiser API create KOL profile invalid role', () => {
  test('returns 400 for advertiser role', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const res = await request.post(`${base}/api/v1/kols/profile`, {
      data: {
        platform: 'tiktok',
        platform_username: 'e2e_advertiser_cannot',
        platform_id: 'pid-e2e',
      },
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
  });
});
