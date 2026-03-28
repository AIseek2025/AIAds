import { test, expect } from '@playwright/test';

/** GET /admin/campaigns（需 campaign:view；无权限时 403 亦为有效信号） */
test.describe('Admin API campaigns list', () => {
  test('GET /campaigns returns paginated payload or 403', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const res = await request.get(`${base}/api/v1/admin/campaigns?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = res.status();
    expect([200, 403]).toContain(status);

    if (status === 200) {
      const body = (await res.json()) as {
        success?: boolean;
        data?: { items?: unknown[]; pagination?: { page?: number; total?: number } };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data?.items)).toBe(true);
      expect(typeof body.data?.pagination?.total).toBe('number');
    }
  });
});
