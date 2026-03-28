import { test, expect } from '@playwright/test';

/** POST /api/v1/auth/refresh */
test.describe('Portal API auth refresh', () => {
  test('invalid refresh_token returns 401', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/refresh`, {
      data: { refresh_token: 'invalid-token-not-jwt' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(401);
  });

  test('valid refresh_token returns 200 when AIADS_E2E_REFRESH_TOKEN set', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const refresh = process.env.AIADS_E2E_REFRESH_TOKEN?.trim();
    test.skip(!base || !refresh, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_REFRESH_TOKEN');

    const res = await request.post(`${base}/api/v1/auth/refresh`, {
      data: { refresh_token: refresh },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: { access_token?: string; refresh_token?: string };
    };
    expect(body.success).toBe(true);
    expect(typeof body.data?.access_token).toBe('string');
    expect(typeof body.data?.refresh_token).toBe('string');
  });
});
