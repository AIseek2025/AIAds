import { test, expect } from '@playwright/test';

/** 订单列表首条驱动 GET /admin/orders/:id */
test.describe('Admin API order detail (list-driven)', () => {
  test('GET /orders/:id when orders list has rows', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const list = await request.get(`${base}/api/v1/admin/orders?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(list.status() === 403, '无 order 权限');
    expect(list.ok(), await list.text()).toBeTruthy();
    const listBody = (await list.json()) as { data?: { items?: Array<{ id?: string }> } };
    const id = listBody.data?.items?.[0]?.id;
    test.skip(!id, '订单列表为空');

    const res = await request.get(`${base}/api/v1/admin/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { success?: boolean; data?: { id?: string } };
    expect(body.success).toBe(true);
    expect(body.data?.id).toBe(id);
  });
});
