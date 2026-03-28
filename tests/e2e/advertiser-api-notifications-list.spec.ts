import { test, expect } from '@playwright/test';

/** 广告主 GET /notifications（与 role-api-smoke 互补：单独文件便于 CI 筛选） */
test.describe('Advertiser API notifications list', () => {
  test('returns paginated notifications', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const res = await request.get(`${base}/api/v1/notifications?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: { items?: unknown[]; pagination?: unknown };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.items)).toBe(true);
  });
});
