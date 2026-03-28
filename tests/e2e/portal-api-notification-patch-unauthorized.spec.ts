import { test, expect } from '@playwright/test';

/** PATCH /api/v1/notifications/:id/read 无 Token → 401 */
test.describe('Portal API notification mark read without token', () => {
  test('returns 401', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const res = await request.patch(`${base}/api/v1/notifications/${id}/read`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(401);
  });
});
