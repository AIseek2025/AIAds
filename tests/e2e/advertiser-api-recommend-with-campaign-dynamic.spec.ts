import { test, expect } from '@playwright/test';

/** GET /api/v1/kols/recommend?campaignId= 列表首条活动 */
test.describe('Advertiser API KOL recommend with campaignId', () => {
  test('returns recommendations when campaigns exist', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const list = await request.get(`${base}/api/v1/campaigns?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok(), await list.text()).toBeTruthy();
    const j = (await list.json()) as { data?: { items?: { id?: string }[] } };
    const campaignId = j.data?.items?.[0]?.id;
    test.skip(!campaignId, '无活动数据');

    const res = await request.get(
      `${base}/api/v1/kols/recommend?campaignId=${campaignId}&limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { success?: boolean; data?: { recommendations?: unknown } };
    expect(body.success).toBe(true);
    expect(body.data?.recommendations).toBeDefined();
  });
});
