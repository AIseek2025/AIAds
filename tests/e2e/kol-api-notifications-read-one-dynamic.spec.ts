import { test, expect } from '@playwright/test';

/** KOL PATCH /api/v1/notifications/:id/read */
test.describe('KOL API notifications mark one read', () => {
  test('patch first notification id when list non-empty', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const list = await request.get(`${base}/api/v1/notifications?page=1&page_size=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok(), await list.text()).toBeTruthy();
    const listJson = (await list.json()) as {
      success?: boolean;
      data?: { items?: { id?: string }[] };
    };
    const first = listJson.data?.items?.[0];
    test.skip(!first?.id, '当前无通知可标已读');

    const res = await request.patch(`${base}/api/v1/notifications/${first.id}/read`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { success?: boolean; data?: { is_read?: boolean } };
    expect(body.success).toBe(true);
    expect(body.data?.is_read).toBe(true);
  });
});
