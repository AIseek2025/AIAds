import { test, expect } from '@playwright/test';

/**
 * 管理端统计切片：revenue / campaigns / orders / kols / content（analytics:view）
 */
test.describe('Admin API stats revenue campaigns orders kols content', () => {
  const paths = [
    ['revenue', '/api/v1/admin/stats/revenue?period=month'],
    ['campaigns', '/api/v1/admin/stats/campaigns?period=month'],
    ['orders', '/api/v1/admin/stats/orders?period=month'],
    ['kols', '/api/v1/admin/stats/kols?period=month'],
    ['content', '/api/v1/admin/stats/content?period=month'],
  ] as const;

  for (const [name, path] of paths) {
    test(`GET ${name} returns data or 403`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      const token = process.env.AIADS_E2E_ADMIN_TOKEN;
      test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

      const res = await request.get(`${base}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const status = res.status();
      expect([200, 403]).toContain(status);

      if (status === 200) {
        const body = (await res.json()) as { success?: boolean; data?: unknown };
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
      }
    });
  }
});
