import { test, expect } from '@playwright/test';

/** GET /kols/recommend?campaignId=（广告主；活动列表首条） */
test.describe('Advertiser API KOL recommend (list-driven)', () => {
  test('GET /kols/recommend returns recommendations', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const prof = await request.get(`${base}/api/v1/advertisers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(prof.status() === 404, '广告主未建档');

    const list = await request.get(`${base}/api/v1/campaigns?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok(), await list.text()).toBeTruthy();
    const listBody = (await list.json()) as { data?: { items?: Array<{ id?: string }> } };
    const campaignId = listBody.data?.items?.[0]?.id;
    test.skip(!campaignId, '活动列表为空');

    const res = await request.get(
      `${base}/api/v1/kols/recommend?campaignId=${encodeURIComponent(campaignId)}&limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    const j = (await res.json()) as {
      success?: boolean;
      data?: { recommendations?: unknown[]; total?: number };
    };
    expect(j.success).toBe(true);
    expect(Array.isArray(j.data?.recommendations)).toBe(true);
    expect(typeof j.data?.total).toBe('number');
  });
});
