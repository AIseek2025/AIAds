import { test, expect } from '@playwright/test';

/**
 * GET /api/v1/users/:id 与 /auth/me 的 id 一致（广告主 Token）
 */
test.describe('Portal API users self by id', () => {
  test('GET /users/:id matches auth/me id', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const me = await request.get(`${base}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok(), await me.text()).toBeTruthy();
    const meBody = (await me.json()) as { data?: { id?: string } };
    const id = meBody.data?.id;
    expect(id).toBeTruthy();

    const res = await request.get(`${base}/api/v1/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const j = (await res.json()) as { success?: boolean; data?: { id?: string } };
    expect(j.success).toBe(true);
    expect(j.data?.id).toBe(id);
  });
});
