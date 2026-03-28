import { test, expect } from '@playwright/test';

/** KOL：GET /notifications/unread-count */
test.describe('KOL API notifications unread count', () => {
  test('returns unread_count', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const res = await request.get(`${base}/api/v1/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { success?: boolean; data?: { unread_count?: number } };
    expect(body.success).toBe(true);
    expect(typeof body.data?.unread_count).toBe('number');
  });
});
