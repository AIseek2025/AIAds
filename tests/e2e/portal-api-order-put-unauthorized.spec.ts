import { test, expect } from '@playwright/test';

/** 订单状态类 PUT 无 Token → 401 */
test.describe('Portal API order state transitions without token', () => {
  const oid = '00000000-0000-0000-0000-000000000000';
  const paths = [
    { name: 'complete', method: 'put' as const, path: `/api/v1/orders/${oid}/complete`, data: {} },
    { name: 'accept', method: 'put' as const, path: `/api/v1/orders/${oid}/accept`, data: {} },
    { name: 'reject', method: 'put' as const, path: `/api/v1/orders/${oid}/reject`, data: { reason: 'x' } },
  ];

  for (const item of paths) {
    test(`${item.name} returns 401`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const res = await request.put(`${base}${item.path}`, {
        data: item.data,
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status()).toBe(401);
    });
  }
});
