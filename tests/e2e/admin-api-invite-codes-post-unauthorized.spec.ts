import { test, expect } from '@playwright/test';

/** POST /api/v1/admin/invite-codes 无 Token → 401 */
test.describe('Admin API create invite code without token', () => {
  test('returns 401', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/admin/invite-codes`, {
      data: { code: 'TEST', max_uses: 1 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(401);
  });
});
