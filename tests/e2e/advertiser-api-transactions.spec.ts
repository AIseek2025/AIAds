import { test, expect } from '@playwright/test';

/** 广告主 GET /advertisers/me/transactions */
test.describe('Advertiser API wallet transactions', () => {
  test('returns list or 404 profile', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const prof = await request.get(`${base}/api/v1/advertisers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(prof.status() === 404, '广告主未建档');

    const res = await request.get(`${base}/api/v1/advertisers/me/transactions?page=1&page_size=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: { items?: unknown[]; pagination?: { total?: number } };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.items)).toBe(true);
  });
});
