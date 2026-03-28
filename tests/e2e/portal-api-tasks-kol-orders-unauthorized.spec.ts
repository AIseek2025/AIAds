import { test, expect } from '@playwright/test';

/** KOL 任务订单子路径无 Token → 401 */
test.describe('Portal API tasks KOL orders without token', () => {
  const oid = '00000000-0000-0000-0000-000000000000';

  const paths = [
    { name: 'reject', path: `/api/v1/tasks/kols/orders/${oid}/reject`, data: { reason: 'x' } },
    { name: 'accept', path: `/api/v1/tasks/kols/orders/${oid}/accept`, data: {} },
    { name: 'submit', path: `/api/v1/tasks/kols/orders/${oid}/submit`, data: { draft_urls: ['https://example.com/a'] } },
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
