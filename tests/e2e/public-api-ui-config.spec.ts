import { test, expect } from '@playwright/test';

/** GET /public/ui-config（无需鉴权） */
test.describe('Public API ui-config', () => {
  test('returns JSON with success', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.get(`${base}/api/v1/public/ui-config`);
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { success?: boolean; data?: unknown };
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});
