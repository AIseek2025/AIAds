import { test, expect } from '@playwright/test';

/**
 * 门户需登录接口（第二组）无 Authorization → 401
 * 覆盖：会话/用户/广告主资料与流水/活动 CRUD 与提交/KOL 中心与推荐/通知已读/三方集成 TikTok+YouTube 绑定链路
 */
test.describe('Portal private routes batch2 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: {
    name: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    path: string;
    data?: Record<string, unknown>;
  }[] = [
    { name: 'auth logout', method: 'post', path: '/api/v1/auth/logout', data: {} },
    {
      name: 'auth change-password',
      method: 'post',
      path: '/api/v1/auth/change-password',
      data: { current_password: 'x', new_password: 'Abcd1234!' },
    },
    { name: 'users by id', method: 'get', path: `/api/v1/users/${u}` },
    { name: 'users put', method: 'put', path: `/api/v1/users/${u}`, data: { nickname: 'n' } },
    {
      name: 'users change-password',
      method: 'post',
      path: `/api/v1/users/${u}/change-password`,
      data: { current_password: 'x', new_password: 'Abcd1234!' },
    },
    { name: 'advertisers me balance', method: 'get', path: '/api/v1/advertisers/me/balance' },
    { name: 'advertisers me transactions', method: 'get', path: '/api/v1/advertisers/me/transactions?page=1' },
    { name: 'advertisers me put', method: 'put', path: '/api/v1/advertisers/me', data: {} },
    { name: 'campaigns by id', method: 'get', path: `/api/v1/campaigns/${u}` },
    { name: 'campaigns put', method: 'put', path: `/api/v1/campaigns/${u}`, data: { title: 't' } },
    { name: 'campaigns delete', method: 'delete', path: `/api/v1/campaigns/${u}` },
    { name: 'campaigns submit', method: 'post', path: `/api/v1/campaigns/${u}/submit`, data: {} },
    { name: 'kols recommend', method: 'get', path: `/api/v1/kols/recommend?campaign_id=${u}` },
    { name: 'kols me', method: 'get', path: '/api/v1/kols/me' },
    { name: 'kols me stats', method: 'get', path: '/api/v1/kols/me/stats' },
    { name: 'kols me frequency', method: 'get', path: '/api/v1/kols/me/frequency' },
    { name: 'kols accounts', method: 'get', path: '/api/v1/kols/accounts' },
    { name: 'kols connect tiktok', method: 'post', path: '/api/v1/kols/connect/tiktok', data: {} },
    { name: 'notifications read one', method: 'patch', path: `/api/v1/notifications/${u}/read`, data: {} },
    { name: 'integrations tiktok status', method: 'get', path: '/api/v1/integrations/tiktok/status' },
    { name: 'integrations connect tiktok', method: 'post', path: '/api/v1/integrations/kols/connect/tiktok', data: {} },
    { name: 'integrations tiktok sync', method: 'post', path: '/api/v1/integrations/kols/tiktok/sync', data: {} },
    { name: 'integrations tiktok disconnect', method: 'delete', path: '/api/v1/integrations/kols/tiktok/disconnect' },
    { name: 'integrations youtube status', method: 'get', path: '/api/v1/integrations/youtube/status' },
    { name: 'integrations connect youtube', method: 'post', path: '/api/v1/integrations/kols/connect/youtube', data: {} },
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
