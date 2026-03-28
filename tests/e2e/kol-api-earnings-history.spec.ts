import { test, expect } from '@playwright/test';

/** GET /api/v1/kols/earnings/history */
test.describe('KOL API earnings history', () => {
  test('returns paginated history', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const me = await request.get(`${base}/api/v1/kols/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(me.status() === 404, 'KOL 未建档');

    const res = await request.get(`${base}/api/v1/kols/earnings/history?page=1&page_size=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: { items?: unknown[]; pagination?: unknown };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.items)).toBe(true);
  });
});
