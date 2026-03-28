import { test, expect } from '@playwright/test';

/**
 * GET /api/v1/integrations/tiktok/auth
 * 需已登录且存在 KOL 资料；否则 404「请先创建 KOL 资料」亦为有效信号
 */
test.describe('KOL API TikTok OAuth auth URL', () => {
  test('returns auth_url or 404 without KOL profile', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const res = await request.get(`${base}/api/v1/integrations/tiktok/auth`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = res.status();
    expect([200, 404]).toContain(status);

    if (status === 200) {
      const body = (await res.json()) as {
        success?: boolean;
        data?: { auth_url?: string; state?: string };
      };
      expect(body.success).toBe(true);
      expect(typeof body.data?.auth_url).toBe('string');
      expect(body.data?.auth_url?.length).toBeGreaterThan(0);
      expect(typeof body.data?.state).toBe('string');
    }
  });
});
