import { test, expect } from '@playwright/test';

/**
 * 管理端批量订单指标 API（Wave B / backlog §九）
 * 需：AIADS_E2E_API_BASE + AIADS_E2E_ADMIN_TOKEN（与 admin 集成环境一致）
 */
test.describe('Admin order metrics batch API', () => {
  test('PUT metrics/batch returns structured body when token is set', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN 以验证批量指标 API');

    const res = await request.put(`${base}/api/v1/admin/orders/metrics/batch`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        items: [
          {
            order_id: '00000000-0000-0000-0000-000000000099',
            views: 1,
          },
        ],
      },
    });

    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: { processed?: number; errors?: Array<{ order_id: string; message: string }> };
    };
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(typeof body.data?.processed).toBe('number');
    expect(Array.isArray(body.data?.errors)).toBe(true);
  });
});
