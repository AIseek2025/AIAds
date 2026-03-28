import { test, expect } from '@playwright/test';

/** POST /api/v1/auth/login 密码过短 → 422（Zod） */
test.describe('Public API login password length', () => {
  test('password shorter than min returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/login`, {
      data: { email: 'any@example.com', password: '' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });
});
