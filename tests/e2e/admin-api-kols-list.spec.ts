import { test, expect } from '@playwright/test';

/**
 * 管理端 KOL 列表（可选集成，需 kol:view）
 * 需：AIADS_E2E_API_BASE + AIADS_E2E_ADMIN_TOKEN
 */
test.describe('Admin API kols list (optional env)', () => {
  test('GET kols returns paginated payload', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const res = await request.get(`${base}/api/v1/admin/kols?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: { items?: unknown[]; pagination?: { page?: number; total?: number } };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.items)).toBe(true);
    expect(body.data?.pagination?.page).toBe(1);
  });
});
