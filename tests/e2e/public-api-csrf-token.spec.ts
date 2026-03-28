import { test, expect } from '@playwright/test';

/** GET /csrf-token（未禁用 CSRF 时存在；禁用时可能 404） */
test.describe('Public API CSRF token', () => {
  test('returns token or 404 when disabled', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.get(`${base}/api/v1/csrf-token`);
    const status = res.status();
    expect([200, 404]).toContain(status);

    if (status === 200) {
      const body = (await res.json()) as { success?: boolean; data?: { csrfToken?: string } };
      expect(body.success).toBe(true);
      expect(typeof body.data?.csrfToken).toBe('string');
    }
  });
});
