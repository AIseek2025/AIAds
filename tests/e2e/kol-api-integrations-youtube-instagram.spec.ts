import { test, expect } from '@playwright/test';

/** YouTube / Instagram 集成状态（需 KOL 资料） */
test.describe('KOL API YouTube and Instagram status', () => {
  test('GET youtube/status and instagram/status', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const me = await request.get(`${base}/api/v1/kols/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(me.status() === 404, 'KOL 未建档');

    const paths = ['/api/v1/integrations/youtube/status', '/api/v1/integrations/instagram/status'];
    for (const p of paths) {
      const res = await request.get(`${base}${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.ok(), `${p} ${await res.text()}`).toBeTruthy();
      const body = (await res.json()) as { success?: boolean; data?: unknown };
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });
});
