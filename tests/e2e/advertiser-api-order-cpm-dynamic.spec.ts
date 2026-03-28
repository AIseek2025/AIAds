import { test, expect } from '@playwright/test';

/** 订单列表首条 → GET /orders/:id/cpm-metrics */
test.describe('Advertiser API order CPM metrics from list', () => {
  test('GET cpm-metrics when orders list has rows', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const prof = await request.get(`${base}/api/v1/advertisers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(prof.status() === 404, '广告主未建档');

    const list = await request.get(`${base}/api/v1/orders?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok(), await list.text()).toBeTruthy();
    const body = (await list.json()) as { data?: { items?: Array<{ id?: string }> } };
    const id = body.data?.items?.[0]?.id;
    test.skip(!id, '订单列表为空');

    const res = await request.get(`${base}/api/v1/orders/${id}/cpm-metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const j = (await res.json()) as { success?: boolean; data?: unknown };
    expect(j.success).toBe(true);
    expect(j.data).toBeDefined();
  });
});
