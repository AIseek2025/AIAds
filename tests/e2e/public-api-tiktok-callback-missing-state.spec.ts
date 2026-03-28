import { test, expect } from '@playwright/test';

/** TikTok 回调有 code 但缺 state → 400（与控制器校验顺序一致） */
test.describe('Public API TikTok OAuth callback missing state', () => {
  test('code without state returns 400', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.get(`${base}/api/v1/integrations/tiktok/callback?code=test-code`);
    expect(res.status()).toBe(400);
  });
});
