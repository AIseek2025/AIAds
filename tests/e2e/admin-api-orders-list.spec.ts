import { test, expect } from '@playwright/test';

/**
 * 管理端订单列表（可选集成）
 * 需：AIADS_E2E_API_BASE + AIADS_E2E_ADMIN_TOKEN（与 admin 权限一致）
 */
test.describe('Admin API orders list (optional env)', () => {
  test('GET orders returns paginated payload', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(
      !base || !token,
      '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN 以验证 GET /admin/orders'
    );

    const res = await request.get(`${base}/api/v1/admin/orders?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: {
        items?: unknown[];
        pagination?: {
          page?: number;
          page_size?: number;
          total?: number;
          total_pages?: number;
          has_next?: boolean;
          has_prev?: boolean;
        };
      };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.items)).toBe(true);
    expect(body.data?.pagination?.page).toBe(1);
    expect(typeof body.data?.pagination?.total).toBe('number');
  });
});
