import { test, expect } from '@playwright/test';

/** GET /api/v1/notifications（KOL/门户通用） */
test.describe('KOL API notifications list', () => {
  test('GET /notifications returns paginated payload', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const res = await request.get(`${base}/api/v1/notifications?page=1&page_size=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: { items?: unknown[]; pagination?: { total?: number } };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.items)).toBe(true);
    expect(typeof body.data?.pagination?.total).toBe('number');
  });
});
