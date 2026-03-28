import { test, expect } from '@playwright/test';

/**
 * 管理端第十一组：无 Admin Token → 401
 * 设置/统计/内容/订单 等带多参数 query（与 batch10 互补）
 */
test.describe('Admin API private routes batch11 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: { name: string; path: string }[] = [
    { name: 'stats overview period compare', path: '/api/v1/admin/stats/overview?period=week&compare=prev' },
    { name: 'stats content channel', path: '/api/v1/admin/stats/content?period=day&group=channel' },
    { name: 'finance transactions type', path: '/api/v1/admin/finance/transactions?page=1&page_size=5&type=deposit' },
    { name: 'settings audit logs level', path: '/api/v1/admin/settings/audit-logs?page=1&page_size=10&level=warn' },
    { name: 'settings sensitive words search', path: '/api/v1/admin/settings/sensitive-words?page=1&keyword=test' },
    { name: 'users list search email', path: '/api/v1/admin/users?page=1&limit=10&search=admin%40' },
    { name: 'invite codes prefix', path: '/api/v1/admin/invite-codes?page=1&prefix=VIP' },
    { name: 'kols pending sort', path: '/api/v1/admin/kols/pending?page=1&page_size=5&sort=created_at' },
    { name: 'content list mixed', path: '/api/v1/admin/content?page=2&page_size=5&status=approved&sort=updated_at' },
    { name: 'campaign by id metrics', path: `/api/v1/admin/campaigns/${u}?include=stats` },
  ];

  for (const item of paths) {
    test(`${item.name} returns 401 without Authorization`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const res = await request.get(`${base}${item.path}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status()).toBe(401);
    });
  }
});
