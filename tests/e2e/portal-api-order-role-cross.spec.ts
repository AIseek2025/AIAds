import { test, expect } from '@playwright/test';

/**
 * 订单动作跨角色：广告主不得接单/交稿；KOL 不得确认完成（列表首条驱动，无单则 skip）
 */
test.describe('Portal API order actions wrong role', () => {
  test('advertiser cannot PUT accept', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const list = await request.get(`${base}/api/v1/orders?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok(), await list.text()).toBeTruthy();
    const j = (await list.json()) as { data?: { items?: { id?: string }[] } };
    const id = j.data?.items?.[0]?.id;
    test.skip(!id, '广告主订单列表为空');

    const res = await request.put(`${base}/api/v1/orders/${id}/accept`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    // 非 pending 时先 400；pending 且非 KOL 本人则 403
    expect([400, 403]).toContain(res.status());
  });

  test('KOL cannot PUT complete', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const list = await request.get(`${base}/api/v1/orders?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok(), await list.text()).toBeTruthy();
    const j = (await list.json()) as { data?: { items?: { id?: string }[] } };
    const id = j.data?.items?.[0]?.id;
    test.skip(!id, 'KOL 订单列表为空');

    const res = await request.put(`${base}/api/v1/orders/${id}/complete`, {
      data: {},
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(403);
  });

  test('advertiser cannot PUT submit work', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const list = await request.get(`${base}/api/v1/orders?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok(), await list.text()).toBeTruthy();
    const j = (await list.json()) as { data?: { items?: { id?: string }[] } };
    const id = j.data?.items?.[0]?.id;
    test.skip(!id, '广告主订单列表为空');

    const res = await request.put(`${base}/api/v1/orders/${id}/submit`, {
      data: { draft_urls: ['https://example.com/v'] },
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect([400, 403]).toContain(res.status());
  });
});
