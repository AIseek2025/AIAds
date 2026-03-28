import { test, expect } from '@playwright/test';

/**
 * 门户第四组：无 Token → 401（与 batch1–3 互补）
 * 覆盖：广告主建档、KOL 建档、用户删除、管理员专用用户操作（verify-email / suspend / activate）
 */
test.describe('Portal private routes batch4 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: {
    name: string;
    method: 'get' | 'post' | 'put' | 'delete';
    path: string;
    data?: Record<string, unknown>;
  }[] = [
    {
      name: 'advertisers create',
      method: 'post',
      path: '/api/v1/advertisers',
      data: { company_name: 'ACME Co' },
    },
    {
      name: 'kols profile create',
      method: 'post',
      path: '/api/v1/kols/profile',
      data: { platform: 'tiktok', platform_username: 'u', platform_id: '1' },
    },
    { name: 'users delete', method: 'delete', path: `/api/v1/users/${u}` },
    { name: 'users verify-email', method: 'post', path: `/api/v1/users/${u}/verify-email`, data: {} },
    { name: 'users suspend', method: 'post', path: `/api/v1/users/${u}/suspend`, data: {} },
    { name: 'users activate', method: 'post', path: `/api/v1/users/${u}/activate`, data: {} },
  ];

  for (const item of paths) {
    test(`${item.name} returns 401`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const url = `${base}${item.path}`;
      const headers = { 'Content-Type': 'application/json' };
      let res;
      if (item.method === 'get') {
        res = await request.get(url, { headers });
      } else if (item.method === 'post') {
        res = await request.post(url, { data: item.data ?? {}, headers });
      } else if (item.method === 'put') {
        res = await request.put(url, { data: item.data ?? {}, headers });
      } else {
        res = await request.delete(url, { headers });
      }
      expect(res.status()).toBe(401);
    });
  }
});
