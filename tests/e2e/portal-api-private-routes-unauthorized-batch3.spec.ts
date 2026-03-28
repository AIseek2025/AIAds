import { test, expect } from '@playwright/test';

/**
 * 门户需登录接口（第三组）无 Authorization → 401
 * 覆盖：订单详情与 CPM/交稿、任务/任务侧订单、KOL 财务与同步、发现页单条、Instagram/YouTube 集成补全、TikTok 统计
 */
test.describe('Portal private routes batch3 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: {
    name: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    path: string;
    data?: Record<string, unknown>;
  }[] = [
    { name: 'orders by id', method: 'get', path: `/api/v1/orders/${u}` },
    { name: 'orders cpm-metrics', method: 'get', path: `/api/v1/orders/${u}/cpm-metrics` },
    {
      name: 'orders submit',
      method: 'put',
      path: `/api/v1/orders/${u}/submit`,
      data: { draft_urls: ['https://example.com/v'] },
    },
    { name: 'tasks by id', method: 'get', path: `/api/v1/tasks/${u}` },
    { name: 'tasks apply', method: 'post', path: `/api/v1/tasks/${u}/apply`, data: {} },
    { name: 'tasks kols orders list', method: 'get', path: '/api/v1/tasks/kols/orders?page=1&page_size=5' },
    { name: 'tasks kols order by id', method: 'get', path: `/api/v1/tasks/kols/orders/${u}` },
    {
      name: 'tasks kols order revise',
      method: 'put',
      path: `/api/v1/tasks/kols/orders/${u}/revise`,
      data: { draft_urls: ['https://example.com/r'] },
    },
    { name: 'kols discovery by id', method: 'get', path: `/api/v1/kols/${u}` },
    { name: 'kols sync', method: 'post', path: '/api/v1/kols/sync', data: {} },
    { name: 'kols earnings', method: 'get', path: '/api/v1/kols/earnings' },
    { name: 'kols earnings history', method: 'get', path: '/api/v1/kols/earnings/history?page=1' },
    { name: 'kols balance', method: 'get', path: '/api/v1/kols/balance' },
    {
      name: 'kols withdraw',
      method: 'post',
      path: '/api/v1/kols/withdraw',
      data: { amount: 1, payment_method: 'alipay', account_name: 'a', account_number: '1' },
    },
    { name: 'kols withdrawals', method: 'get', path: '/api/v1/kols/withdrawals?page=1' },
    { name: 'kols unbind account', method: 'delete', path: `/api/v1/kols/accounts/${u}` },
    { name: 'integrations instagram status', method: 'get', path: '/api/v1/integrations/instagram/status' },
    { name: 'integrations connect instagram', method: 'post', path: '/api/v1/integrations/kols/connect/instagram', data: {} },
    { name: 'integrations instagram sync', method: 'post', path: '/api/v1/integrations/kols/instagram/sync', data: {} },
    { name: 'integrations instagram disconnect', method: 'delete', path: '/api/v1/integrations/kols/instagram/disconnect' },
    { name: 'integrations youtube sync', method: 'post', path: '/api/v1/integrations/kols/youtube/sync', data: {} },
    { name: 'integrations youtube disconnect', method: 'delete', path: '/api/v1/integrations/kols/youtube/disconnect' },
    { name: 'integrations tiktok stats', method: 'get', path: '/api/v1/integrations/tiktok/stats' },
  ];

  for (const item of paths) {
    test(`${item.name} returns 401`, async ({ request }) => {
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
