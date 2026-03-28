import { test, expect } from '@playwright/test';

/** GET /api/v1/integrations/tiktok/callback 缺少 code → 400 */
test.describe('Public API TikTok OAuth callback validation', () => {
  test('missing code returns 400', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.get(`${base}/api/v1/integrations/tiktok/callback?state=x`);
    expect(res.status()).toBe(400);
  });
});
