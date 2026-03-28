import { test, expect } from '@playwright/test';

/**
 * GET /api/v1/admin/finance/export（需 finance:export；返回 CSV 流）
 */
test.describe('Admin API finance export GET', () => {
  test('returns CSV or 403', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const qs = new URLSearchParams({
      type: 'all',
      startDate: '2024-01-01',
      endDate: '2026-12-31',
    });
    const res = await request.get(`${base}/api/v1/admin/finance/export?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = res.status();
    expect([200, 403]).toContain(status);

    if (status === 200) {
      const ct = res.headers()['content-type'] ?? '';
      expect(ct).toContain('text/csv');
      const text = await res.text();
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
