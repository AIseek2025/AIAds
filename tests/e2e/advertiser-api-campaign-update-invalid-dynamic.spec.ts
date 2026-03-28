import { test, expect } from '@playwright/test';

/** PUT /api/v1/campaigns/:id budget 非法 → 422（列表首条驱动） */
test.describe('Advertiser API update campaign validation', () => {
  test('negative budget returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const list = await request.get(`${base}/api/v1/campaigns?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok(), await list.text()).toBeTruthy();
    const j = (await list.json()) as { data?: { items?: { id?: string }[] } };
    const id = j.data?.items?.[0]?.id;
    test.skip(!id, '无活动数据');

    const res = await request.put(`${base}/api/v1/campaigns/${id}`, {
      data: { budget: -1 },
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });
});
