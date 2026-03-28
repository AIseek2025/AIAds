import { test, expect } from '@playwright/test';

/** POST /api/v1/auth/register 校验失败应返回 422（Zod / parseBodyOrRespond） */
test.describe('Public API register validation', () => {
  test('POST register with invalid email returns 422', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.post(`${base}/api/v1/auth/register`, {
      data: {
        email: 'not-an-email',
        password: 'Abcd1234!',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(422);
  });
});
