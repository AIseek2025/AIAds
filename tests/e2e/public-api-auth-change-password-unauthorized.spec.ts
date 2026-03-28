import { test, expect } from '@playwright/test';

/** POST /api/v1/auth/change-password 需登录 */
test.describe('Public API auth change-password guard', () => {
  test('without Authorization returns 401', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/change-password`, {
      data: {
        current_password: 'Oldpass1!',
        new_password: 'Newpass1!',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(401);
  });
});
