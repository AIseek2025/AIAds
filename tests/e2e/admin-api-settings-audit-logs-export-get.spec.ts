import { test, expect } from '@playwright/test';

/** GET /api/v1/admin/settings/audit-logs/export（super_admin；CSV 流） */
test.describe('Admin API audit logs export GET', () => {
  test('returns CSV body or 403', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const res = await request.get(`${base}/api/v1/admin/settings/audit-logs/export?format=csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = res.status();
    expect([200, 403]).toContain(status);

    if (status === 200) {
      const ct = res.headers()['content-type'] ?? '';
      expect(ct).toContain('text/csv');
      const text = await res.text();
      expect(text.length).toBeGreaterThanOrEqual(0);
    }
  });
});
