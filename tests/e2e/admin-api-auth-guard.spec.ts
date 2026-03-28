import { test, expect } from '@playwright/test';

/**
 * 管理端 API：未认证访问应拒绝（仅需 API 基址，无需账号）
 * 需：AIADS_E2E_API_BASE
 */
test.describe('Admin API auth guard (optional env)', () => {
  test('GET auth/me without Authorization returns 401', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE 以验证管理端鉴权');

    const res = await request.get(`${base}/api/v1/admin/auth/me`);
    expect(res.status()).toBe(401);
  });
});
