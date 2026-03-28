import { test, expect } from '@playwright/test';

/** POST /admin/orders/export（order:export） */
test.describe('Admin API orders export POST', () => {
  test('POST returns CSV body or 403', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const res = await request.post(`${base}/api/v1/admin/orders/export`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { format: 'csv' },
    });
    const status = res.status();
    expect([200, 403]).toContain(status);

    if (status === 200) {
      const text = await res.text();
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
