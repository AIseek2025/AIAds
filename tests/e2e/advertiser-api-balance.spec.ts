import { test, expect } from '@playwright/test';

/** GET /api/v1/advertisers/me/balance */
test.describe('Advertiser API balance', () => {
  test('returns balance when profile exists', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const prof = await request.get(`${base}/api/v1/advertisers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(prof.status() === 404, '广告主未建档');

    const res = await request.get(`${base}/api/v1/advertisers/me/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: {
        wallet_balance?: number;
        frozen_balance?: number;
        low_balance_alert_cny?: number;
      };
    };
    expect(body.success).toBe(true);
    expect(typeof body.data?.wallet_balance).toBe('number');
    expect(typeof body.data?.frozen_balance).toBe('number');
    expect(typeof body.data?.low_balance_alert_cny).toBe('number');
  });
});
