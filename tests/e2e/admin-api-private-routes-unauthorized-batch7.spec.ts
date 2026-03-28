import { test, expect } from '@playwright/test';

/**
 * 管理端第七组：无 Admin Token → 401
 * 覆盖：看板 KOL 排行/频次策略、财务存取款列表、带筛选的订单/活动/KOL/内容/广告主列表（与 batch1–6 查询组合互补）
 */
test.describe('Admin API private routes batch7 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: { name: string; path: string }[] = [
    { name: 'dashboard kol-rankings', path: '/api/v1/admin/dashboard/kol-rankings' },
    { name: 'dashboard kol-frequency-policy', path: '/api/v1/admin/dashboard/kol-frequency-policy' },
    { name: 'finance deposits', path: '/api/v1/admin/finance/deposits?page=1&page_size=10' },
    { name: 'finance withdrawals list', path: '/api/v1/admin/finance/withdrawals?page=1&page_size=10' },
    {
      name: 'orders list with campaign filter',
      path: `/api/v1/admin/orders?page=1&page_size=5&status=pending&campaign_id=${u}`,
    },
    {
      name: 'orders list keyword sort',
      path: '/api/v1/admin/orders?page=1&keyword=test&sort=created_at&order=asc',
    },
    { name: 'campaigns list status active', path: '/api/v1/admin/campaigns?page=1&page_size=5&status=active' },
    { name: 'kols list keyword', path: '/api/v1/admin/kols?page=1&page_size=5&keyword=beauty' },
    { name: 'content list status', path: '/api/v1/admin/content?page=1&page_size=5&status=pending' },
    { name: 'advertisers list keyword', path: '/api/v1/admin/advertisers?page=1&page_size=5&keyword=acme' },
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
