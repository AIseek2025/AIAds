import { test, expect } from '@playwright/test';

/**
 * 发现页：GET /kols → 首条 id → GET /kols/:id
 */
test.describe('Advertiser API KOL discovery by id', () => {
  test('search then get detail', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const search = await request.get(`${base}/api/v1/kols?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(search.ok(), await search.text()).toBeTruthy();
    const sJson = (await search.json()) as {
      success?: boolean;
      data?: { items?: { id?: string }[] };
    };
    const first = sJson.data?.items?.[0];
    test.skip(!first?.id, '发现页无 KOL 数据');

    const detail = await request.get(`${base}/api/v1/kols/${first.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detail.ok(), await detail.text()).toBeTruthy();
    const dJson = (await detail.json()) as { success?: boolean; data?: { id?: string } };
    expect(dJson.success).toBe(true);
    expect(dJson.data?.id).toBe(first.id);
  });
});
