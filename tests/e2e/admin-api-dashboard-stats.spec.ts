import { test, expect } from '@playwright/test';

/**
 * 管理端看板与统计总览（可选集成，需具备 dashboard:view 等权限的管理员 Token）
 * 需：AIADS_E2E_API_BASE + AIADS_E2E_ADMIN_TOKEN
 */
test.describe('Admin API dashboard & stats overview (optional env)', () => {
  test('GET dashboard/stats returns platform stats', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const res = await request.get(`${base}/api/v1/admin/dashboard/stats?period=today`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: {
        period?: { start?: string; end?: string };
        users?: { total?: number };
        orders?: { total?: number };
      };
    };
    expect(body.success).toBe(true);
    expect(body.data?.period).toBeDefined();
    expect(typeof body.data?.users?.total).toBe('number');
  });

  test('GET stats/overview returns overview payload', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const res = await request.get(`${base}/api/v1/admin/stats/overview?period=month`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { success?: boolean; data?: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(typeof body.data).toBe('object');
  });
});
