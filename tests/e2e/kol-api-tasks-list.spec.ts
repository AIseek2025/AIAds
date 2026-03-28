import { test, expect } from '@playwright/test';

/**
 * KOL 任务广场：GET /api/v1/tasks（需 KOL 资料；未建档时 404）
 * 依赖 global-setup 或手动设置 AIADS_E2E_KOL_TOKEN
 */
test.describe('KOL API tasks list (task market)', () => {
  test('GET /tasks returns list or 404 (no KOL profile)', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN（或 KOL 邮箱密码换票）');

    const res = await request.get(`${base}/api/v1/tasks?page=1&page_size=5`, {
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
