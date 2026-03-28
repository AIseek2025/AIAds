import { test, expect } from '@playwright/test';

/**
 * 管理端订单详情（可选集成；需库内存在该订单）
 * 需：AIADS_E2E_API_BASE + AIADS_E2E_ADMIN_TOKEN + AIADS_E2E_ORDER_ID（UUID）
 */
test.describe('Admin API order by id (optional env)', () => {
  test('GET orders/:id returns order body', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    const orderId = process.env.AIADS_E2E_ORDER_ID?.trim();
    test.skip(
      !base || !token || !orderId,
      '设置 AIADS_E2E_API_BASE、AIADS_E2E_ADMIN_TOKEN、AIADS_E2E_ORDER_ID'
    );

    const res = await request.get(`${base}/api/v1/admin/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: { id?: string; order_no?: string; status?: string };
    };
    expect(body.success).toBe(true);
    expect(body.data?.id).toBe(orderId);
    expect(typeof body.data?.status).toBe('string');
  });
});
