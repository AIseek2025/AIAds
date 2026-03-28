import { test, expect } from '@playwright/test';

/**
 * GET /api/v1/integrations/instagram/auth
 * 与 TikTok/YouTube 一致：无 KOL 资料 404；OAuth 未配置时可能 500
 */
test.describe('KOL API Instagram OAuth URL', () => {
  test('returns auth_url or 404 without KOL profile', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const res = await request.get(`${base}/api/v1/integrations/instagram/auth`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = res.status();
    expect([200, 404, 500]).toContain(status);

    if (status === 200) {
      const body = (await res.json()) as {
        success?: boolean;
        data?: { auth_url?: string; state?: string };
      };
      expect(body.success).toBe(true);
      expect(typeof body.data?.auth_url).toBe('string');
      expect(typeof body.data?.state).toBe('string');
    }
  });
});
