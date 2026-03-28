import { test, expect } from '@playwright/test';

/** OAuth 回调缺少 code → 400（与 TikTok 契约一致） */
test.describe('Public API YouTube Instagram OAuth callback validation', () => {
  test('YouTube callback missing code returns 400', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.get(`${base}/api/v1/integrations/youtube/callback?state=x`);
    expect(res.status()).toBe(400);
  });

  test('Instagram callback missing code returns 400', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.get(`${base}/api/v1/integrations/instagram/callback?state=x`);
    expect(res.status()).toBe(400);
  });
});
