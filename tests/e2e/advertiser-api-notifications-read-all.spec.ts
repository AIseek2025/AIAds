import { test, expect } from '@playwright/test';

/** POST /api/v1/notifications/read-all */
test.describe('Advertiser API notifications mark all read', () => {
  test('read-all returns success', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const res = await request.post(`${base}/api/v1/notifications/read-all`, {
      data: {},
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { success?: boolean; data?: { updated?: number } };
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});
