import { test, expect } from '@playwright/test';

/**
 * 管理端 API：登录 + /me（可选集成环境）
 * 需：AIADS_E2E_API_BASE + AIADS_E2E_ADMIN_EMAIL + AIADS_E2E_ADMIN_PASSWORD
 */
test.describe('Admin API login (optional env)', () => {
  test('POST login then GET me returns admin', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const email = process.env.AIADS_E2E_ADMIN_EMAIL;
    const password = process.env.AIADS_E2E_ADMIN_PASSWORD;
    test.skip(
      !base || !email || !password,
      '设置 AIADS_E2E_API_BASE、AIADS_E2E_ADMIN_EMAIL、AIADS_E2E_ADMIN_PASSWORD 以验证管理端登录链'
    );

    const loginRes = await request.post(`${base}/api/v1/admin/auth/login`, {
      data: { email, password },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = (await loginRes.json()) as {
      success?: boolean;
      data?: { tokens?: { access_token?: string }; admin?: { email?: string } };
    };
    expect(loginBody.success).toBe(true);
    const token = loginBody.data?.tokens?.access_token;
    expect(typeof token).toBe('string');
    expect(token!.length).toBeGreaterThan(10);

    const meRes = await request.get(`${base}/api/v1/admin/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.ok()).toBeTruthy();
    const meBody = (await meRes.json()) as {
      success?: boolean;
      data?: { admin?: { email?: string } };
    };
    expect(meBody.success).toBe(true);
    expect(meBody.data?.admin?.email).toBe(email);
  });
});
