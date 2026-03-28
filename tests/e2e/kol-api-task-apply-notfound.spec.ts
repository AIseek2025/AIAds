import { test, expect } from '@playwright/test';

/** POST /api/v1/tasks/:id/apply 不存在任务 → 404 */
test.describe('KOL API apply task not found', () => {
  test('random task id returns 404', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const me = await request.get(`${base}/api/v1/kols/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(me.status() === 404, 'KOL 未建档');

    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request.post(`${base}/api/v1/tasks/${fakeId}/apply`, {
      data: {},
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(404);
  });
});
