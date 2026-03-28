import { test, expect } from '@playwright/test';

/** 管理员列表首条驱动 GET /settings/admins/:id（super_admin） */
test.describe('Admin API settings admin detail (list-driven)', () => {
  test('GET /settings/admins/:id when list has rows', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const list = await request.get(`${base}/api/v1/admin/settings/admins?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listSt = list.status();
    test.skip(listSt === 403, '非 super_admin');
    expect(listSt).toBe(200);
    const listBody = (await list.json()) as {
      success?: boolean;
      data?: { items?: Array<{ id?: string }> };
    };
    const id = listBody.data?.items?.[0]?.id;
    test.skip(!id, '管理员列表为空');

    const res = await request.get(`${base}/api/v1/admin/settings/admins/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const j = (await res.json()) as { success?: boolean; data?: { id?: string } };
    expect(j.success).toBe(true);
    expect(j.data?.id).toBe(id);
  });
});
