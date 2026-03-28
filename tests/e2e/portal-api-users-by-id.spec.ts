import { test, expect } from '@playwright/test';

/** GET /users/:id（与 auth/me 的 id 一致） */
test.describe('Portal API users by id', () => {
  test('current user can read self', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim() || process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 ADVERTISER 或 KOL TOKEN');

    const me = await request.get(`${base}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok(), await me.text()).toBeTruthy();
    const meJson = (await me.json()) as { data?: { id?: string } };
    const id = meJson.data?.id;
    expect(typeof id).toBe('string');

    const res = await request.get(`${base}/api/v1/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { success?: boolean; data?: { id?: string } };
    expect(body.success).toBe(true);
    expect(body.data?.id).toBe(id);
  });
});
