import { test, expect } from '@playwright/test';

/** GET /advertisers/me */
test.describe('Advertiser API profile me', () => {
  test('returns profile or 404', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const res = await request.get(`${base}/api/v1/advertisers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = res.status();
    test.skip(status === 404, '广告主未建档');
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { success?: boolean; data?: unknown };
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});
