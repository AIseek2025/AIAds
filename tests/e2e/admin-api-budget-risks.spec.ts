import { test, expect } from '@playwright/test';

/**
 * 与 `scripts/cron-budget-risks.sh`、管理端看板「预算占用预警」同一接口
 * 需：AIADS_E2E_API_BASE + AIADS_E2E_ADMIN_TOKEN
 */
test.describe('Admin API campaigns budget-risks', () => {
  test('GET /campaigns/budget-risks returns items + threshold', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const res = await request.get(`${base}/api/v1/admin/campaigns/budget-risks?threshold=0.85`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: {
        items?: Array<{ id?: string; utilization?: number; spent_amount?: number }>;
        threshold?: number;
      };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.items)).toBe(true);
    expect(typeof body.data?.threshold).toBe('number');
    expect(body.data!.threshold).toBeGreaterThanOrEqual(0);
    expect(body.data!.threshold).toBeLessThanOrEqual(1);
  });
});
