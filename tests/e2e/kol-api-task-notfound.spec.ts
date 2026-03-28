import { test, expect } from '@playwright/test';

/** GET /tasks/:id 不存在任务 → 404（需 KOL 资料） */
test.describe('KOL API task by id not found', () => {
  test('unknown task id returns 404', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const me = await request.get(`${base}/api/v1/kols/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(me.status() === 404, 'KOL 未建档');

    const res = await request.get(`${base}/api/v1/tasks/00000000-0000-4000-8000-000000000002`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(404);
  });
});
