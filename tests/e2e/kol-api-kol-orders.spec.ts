import { test, expect } from '@playwright/test';

/**
 * KOL：GET /api/v1/tasks/kols/orders（我的任务列表 API）
 */
test.describe('KOL API kols orders list', () => {
  test('GET /tasks/kols/orders returns list or 404', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const res = await request.get(`${base}/api/v1/tasks/kols/orders?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = res.status();
    test.skip(status === 404, 'KOL 未建档');
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
