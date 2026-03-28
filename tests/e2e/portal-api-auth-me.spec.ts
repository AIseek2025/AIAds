import { test, expect } from '@playwright/test';

/**
 * 门户：GET /api/v1/auth/me（广告主 / KOL JWT）
 */
test.describe('Portal API auth me', () => {
  test('advertiser token returns user', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADVERTISER_TOKEN');

    const res = await request.get(`${base}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: { id?: string; email?: string; role?: string };
    };
    expect(body.success).toBe(true);
    expect(typeof body.data?.id).toBe('string');
    expect(typeof body.data?.email).toBe('string');
  });

  test('KOL token returns user', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const res = await request.get(`${base}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: { id?: string; email?: string; role?: string };
    };
    expect(body.success).toBe(true);
    expect(typeof body.data?.id).toBe('string');
  });
});
