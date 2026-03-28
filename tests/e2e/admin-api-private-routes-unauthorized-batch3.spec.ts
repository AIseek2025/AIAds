import { test, expect } from '@playwright/test';

/**
 * 管理端第三组：无 Admin Token → 401
 * 覆盖：广告主详情与审核/冻结、活动详情与审核/状态、订单详情与状态/纠纷、KOL 评分与驳回/同步、内容审核与删除、提现审核链路、用户状态与重置密码、审计与备份
 */
test.describe('Admin API private routes batch3 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: {
    name: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    path: string;
    data?: Record<string, unknown>;
  }[] = [
    { name: 'advertisers by id', method: 'get', path: `/api/v1/admin/advertisers/${u}` },
    { name: 'advertisers recharges', method: 'get', path: `/api/v1/admin/advertisers/${u}/recharges?page=1` },
    { name: 'advertisers consumptions', method: 'get', path: `/api/v1/admin/advertisers/${u}/consumptions?page=1` },
    { name: 'advertisers verify', method: 'put', path: `/api/v1/admin/advertisers/${u}/verify`, data: {} },
    { name: 'advertisers freeze', method: 'put', path: `/api/v1/admin/advertisers/${u}/freeze`, data: {} },
    { name: 'campaigns by id', method: 'get', path: `/api/v1/admin/campaigns/${u}` },
    { name: 'campaigns verify', method: 'put', path: `/api/v1/admin/campaigns/${u}/verify`, data: {} },
    { name: 'campaigns status', method: 'put', path: `/api/v1/admin/campaigns/${u}/status`, data: {} },
    { name: 'orders by id', method: 'get', path: `/api/v1/admin/orders/${u}` },
    { name: 'orders status', method: 'put', path: `/api/v1/admin/orders/${u}/status`, data: {} },
    { name: 'orders dispute', method: 'put', path: `/api/v1/admin/orders/${u}/dispute`, data: {} },
    { name: 'kols rating', method: 'put', path: `/api/v1/admin/kols/${u}/rating`, data: {} },
    { name: 'kols reject', method: 'post', path: `/api/v1/admin/kols/${u}/reject`, data: {} },
    { name: 'kols sync', method: 'post', path: `/api/v1/admin/kols/${u}/sync`, data: {} },
    { name: 'content verify', method: 'put', path: `/api/v1/admin/content/${u}/verify`, data: {} },
    { name: 'content approve', method: 'post', path: `/api/v1/admin/content/${u}/approve`, data: {} },
    { name: 'content delete', method: 'delete', path: `/api/v1/admin/content/${u}` },
    { name: 'finance withdrawal verify', method: 'put', path: `/api/v1/admin/finance/withdrawals/${u}/verify`, data: {} },
    { name: 'finance withdrawal approve', method: 'post', path: `/api/v1/admin/finance/withdrawals/${u}/approve`, data: {} },
    { name: 'users status', method: 'put', path: `/api/v1/admin/users/${u}/status`, data: {} },
    { name: 'users reset-password', method: 'post', path: `/api/v1/admin/users/${u}/reset-password`, data: {} },
    { name: 'settings audit-logs', method: 'get', path: '/api/v1/admin/settings/audit-logs?page=1&limit=5' },
    { name: 'settings audit-logs export', method: 'get', path: '/api/v1/admin/settings/audit-logs/export' },
    { name: 'settings backup restore', method: 'post', path: '/api/v1/admin/settings/backup/restore', data: {} },
  ];

  for (const item of paths) {
    test(`${item.name} returns 401 without Authorization`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const url = `${base}${item.path}`;
      const headers = { 'Content-Type': 'application/json' };
      let res;
      switch (item.method) {
        case 'get':
          res = await request.get(url, { headers });
          break;
        case 'post':
          res = await request.post(url, { data: item.data ?? {}, headers });
          break;
        case 'put':
          res = await request.put(url, { data: item.data ?? {}, headers });
          break;
        case 'patch':
          res = await request.patch(url, { data: item.data ?? {}, headers });
          break;
        case 'delete':
          res = await request.delete(url, { headers });
          break;
        default:
          throw new Error(item.method);
      }
      expect(res.status()).toBe(401);
    });
  }
});
