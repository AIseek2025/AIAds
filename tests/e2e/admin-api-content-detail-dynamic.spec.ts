import { test, expect } from '@playwright/test';

/** 内容列表首条 → GET /content/:id */
test.describe('Admin API content detail from list', () => {
  test('GET /content/:id when list has rows', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const list = await request.get(`${base}/api/v1/admin/content?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(list.status() === 403, '无 content:view 权限');
    expect(list.ok(), await list.text()).toBeTruthy();
    const body = (await list.json()) as { data?: { items?: Array<{ id?: string }> } };
    const id = body.data?.items?.[0]?.id;
    test.skip(!id, '内容列表为空');

    const res = await request.get(`${base}/api/v1/admin/content/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const j = (await res.json()) as { success?: boolean; data?: unknown };
    expect(j.success).toBe(true);
    expect(j.data).toBeDefined();
  });
});
