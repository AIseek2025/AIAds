import { test, expect } from '@playwright/test';

/** 任务广场列表首条驱动 GET /tasks/:id */
test.describe('KOL API task detail (list-driven)', () => {
  test('GET /tasks/:id when task market has rows', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const list = await request.get(`${base}/api/v1/tasks?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(list.status() === 404, 'KOL 未建档');
    expect(list.ok(), await list.text()).toBeTruthy();
    const listBody = (await list.json()) as { data?: { items?: Array<{ id?: string }> } };
    const id = listBody.data?.items?.[0]?.id;
    test.skip(!id, '任务列表为空');

    const res = await request.get(`${base}/api/v1/tasks/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const j = (await res.json()) as { success?: boolean; data?: { id?: string } };
    expect(j.success).toBe(true);
    expect(j.data?.id).toBe(id);
  });
});
