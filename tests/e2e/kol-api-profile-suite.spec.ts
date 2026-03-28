import { test, expect } from '@playwright/test';

/**
 * KOL 建档后核心读接口：me/stats、accounts、earnings、earnings/history、withdrawals
 * 未建档（GET /kols/me 404）时整组 skip。
 */
test.describe('KOL API profile-dependent reads', () => {
  test('me/stats, accounts, earnings, earnings/history, withdrawals', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const me = await request.get(`${base}/api/v1/kols/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(me.status() === 404, 'KOL 未建档');

    const paths = [
      '/api/v1/kols/me/stats',
      '/api/v1/kols/accounts',
      '/api/v1/kols/earnings',
      '/api/v1/kols/earnings/history?page=1&page_size=5',
      '/api/v1/kols/withdrawals?page=1&page_size=5',
    ];

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
