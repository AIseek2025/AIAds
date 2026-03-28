import { test, expect } from '@playwright/test';

/**
 * 门户第五组：无 Token → 401（adminOnly 用户查询与手机核验）
 */
test.describe('Portal private routes batch5 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const emailEnc = encodeURIComponent('ops@example.com');

  const paths: { name: string; method: 'get' | 'post'; path: string; data?: Record<string, unknown> }[] = [
    { name: 'users by email admin', method: 'get', path: `/api/v1/users/email/${emailEnc}` },
    { name: 'users verify-phone', method: 'post', path: `/api/v1/users/${u}/verify-phone`, data: {} },
  ];

  for (const item of paths) {
    test(`${item.name} returns 401`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const url = `${base}${item.path}`;
      const res =
        item.method === 'get'
          ? await request.get(url, { headers: { 'Content-Type': 'application/json' } })
          : await request.post(url, {
              data: item.data ?? {},
              headers: { 'Content-Type': 'application/json' },
            });
      expect(res.status()).toBe(401);
    });
  }
});
