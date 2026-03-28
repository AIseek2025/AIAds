import { test, expect } from '@playwright/test';

/** GET /api/v1/users/:id 无 Token → 401 */
test.describe('Portal API users by id without token', () => {
  test('returns 401', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.get(`${base}/api/v1/users/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(401);
  });
});
