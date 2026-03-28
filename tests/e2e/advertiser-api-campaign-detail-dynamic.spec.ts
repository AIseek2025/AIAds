import { test, expect } from '@playwright/test';

/** 活动列表首条驱动 GET /campaigns/:id（广告主） */
test.describe('Advertiser API campaign detail (list-driven)', () => {
  test('GET /campaigns/:id when list has rows', async ({ request }) => {
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
    const id = listBody.data?.items?.[0]?.id;
    test.skip(!id, '活动列表为空');

    const res = await request.get(`${base}/api/v1/campaigns/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const j = (await res.json()) as { success?: boolean; data?: { id?: string } };
    expect(j.success).toBe(true);
    expect(j.data?.id).toBe(id);
  });
});
