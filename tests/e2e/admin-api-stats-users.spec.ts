import { test, expect } from '@playwright/test';

/** GET /admin/stats/users（analytics:view） */
test.describe('Admin API stats users', () => {
  test('GET returns user stats or 403', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const res = await request.get(`${base}/api/v1/admin/stats/users`, {
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
});
