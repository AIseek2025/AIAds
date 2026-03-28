import { test, expect } from '@playwright/test';

/**
 * 广告主 KOL 发现：GET /api/v1/kols（需登录；未建档广告主时 404）
 */
test.describe('Advertiser API kols search', () => {
  test('GET /kols returns paginated list or 404', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const res = await request.get(`${base}/api/v1/kols?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = res.status();
    test.skip(status === 404, '广告主未建档');
    expect(res.ok(), await res.text()).toBeTruthy();

    const body = (await res.json()) as {
      success?: boolean;
      data?: { items?: unknown[]; pagination?: { total?: number } };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.items)).toBe(true);
    expect(typeof body.data?.pagination?.total).toBe('number');
  });
});
