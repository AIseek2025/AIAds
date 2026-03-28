import { test, expect } from '@playwright/test';

/**
 * 管理端第八组：无 Admin Token → 401
 * 统计/看板/列表带额外 query 参数（与 batch7 路径互补）
 */
test.describe('Admin API private routes batch8 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: { name: string; path: string }[] = [
    { name: 'stats revenue period', path: '/api/v1/admin/stats/revenue?period=month' },
    { name: 'stats orders period', path: '/api/v1/admin/stats/orders?period=week' },
    { name: 'stats content period', path: '/api/v1/admin/stats/content?period=day' },
    { name: 'stats campaigns with page', path: '/api/v1/admin/stats/campaigns?page=1&page_size=5' },
    { name: 'dashboard stats extra query', path: '/api/v1/admin/dashboard/stats?x=1' },
    { name: 'orders list with keyword', path: '/api/v1/admin/orders?page=1&keyword=test&sort=created_at&order=desc' },
    { name: 'kols list with verified', path: '/api/v1/admin/kols?page=1&page_size=5&verified=true' },
    { name: 'campaigns list with status filter', path: '/api/v1/admin/campaigns?page=1&status=active' },
    { name: 'advertisers list with sort', path: `/api/v1/admin/advertisers?page=1&page_size=5&sort=created_at` },
    { name: 'users list with role filter', path: `/api/v1/admin/users?page=1&limit=5&role=advertiser` },
    { name: 'order by id with extra', path: `/api/v1/admin/orders/${u}?include=metrics` },
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
