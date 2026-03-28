import { test, expect } from '@playwright/test';

/** PUT /api/v1/advertisers/me 非法 contact_email → 422 */
test.describe('Advertiser API update profile validation', () => {
  test('invalid contact_email returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const res = await request.put(`${base}/api/v1/advertisers/me`, {
      data: { contact_email: 'not-an-email' },
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });
});
