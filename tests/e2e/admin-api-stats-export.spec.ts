import { test, expect } from '@playwright/test';

/** GET /admin/stats/export（analytics:export）返回 CSV 正文 */
test.describe('Admin API stats export', () => {
  test('GET returns CSV or 403', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const res = await request.get(`${base}/api/v1/admin/stats/export?type=revenue&period=month&format=csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = res.status();
    expect([200, 403]).toContain(status);

    if (status === 200) {
      const text = await res.text();
      expect(text.length).toBeGreaterThan(0);
      const ct = res.headers()['content-type'] ?? '';
      expect(ct).toContain('csv');
    }
  });
});
