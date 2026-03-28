import { test, expect } from '@playwright/test';

/**
 * 管理端第十组：无 Admin Token → 401
 * 统计/财务/活动广告主子资源等带扩展 query（与 batch5–9 参数矩阵互补）
 */
test.describe('Admin API private routes batch10 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: { name: string; path: string }[] = [
    { name: 'stats trends month group', path: '/api/v1/admin/stats/trends?period=month&group_by=day' },
    { name: 'stats comparison quarter metric', path: '/api/v1/admin/stats/comparison?period=quarter&metric=orders' },
    { name: 'stats export csv period', path: '/api/v1/admin/stats/export?format=csv&period=week' },
    { name: 'finance overview tz', path: '/api/v1/admin/finance/overview?period=month&tz=UTC' },
    { name: 'finance deposits page2', path: '/api/v1/admin/finance/deposits?page=2&page_size=3' },
    { name: 'campaign stats by id', path: `/api/v1/admin/campaigns/${u}/stats?range=week` },
    { name: 'advertiser recharges', path: `/api/v1/admin/advertisers/${u}/recharges?page=1&page_size=5` },
    { name: 'advertiser consumptions', path: `/api/v1/admin/advertisers/${u}/consumptions?page=1` },
    { name: 'orders disputes page2', path: '/api/v1/admin/orders/disputes?page=2&page_size=5' },
    { name: 'content pending sort', path: '/api/v1/admin/content/pending?page=1&page_size=5&sort=created_at' },
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
