import { test, expect } from '@playwright/test';

/**
 * 广告主门户：GET /api/v1/campaigns（需已建档广告主；未建档时 404）
 * 依赖 global-setup 或手动设置 AIADS_E2E_ADVERTISER_TOKEN
 */
test.describe('Advertiser API campaigns list', () => {
  test('GET /campaigns returns list or 404 (no advertiser profile)', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN（或广告主邮箱密码换票）');

    const res = await request.get(`${base}/api/v1/campaigns?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = res.status();
    test.skip(status === 404, '广告主未建档');
    expect(res.ok(), await res.text()).toBeTruthy();

    const body = (await res.json()) as {
      success?: boolean;
      data?: { items?: unknown[]; pagination?: { total?: number; page?: number } };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.items)).toBe(true);
    expect(typeof body.data?.pagination?.total).toBe('number');
  });
});
