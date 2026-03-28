import { test, expect } from '@playwright/test';

/**
 * 管理端第四组：无 Admin Token → 401
 * 覆盖：邀请码 PATCH、系统配置与备份、超管账号与角色 CRUD、敏感词列表、广告主余额/解冻、提现驳回、KOL 黑名单、用户封禁/解封、内容驳回、KOL 暂停、系统监控
 */
test.describe('Admin API private routes batch4 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: {
    name: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    path: string;
    data?: Record<string, unknown>;
  }[] = [
    { name: 'invite-codes patch', method: 'patch', path: `/api/v1/admin/invite-codes/${u}`, data: {} },
    { name: 'settings system put', method: 'put', path: '/api/v1/admin/settings/system', data: {} },
    { name: 'settings backup list', method: 'get', path: '/api/v1/admin/settings/backup/list' },
    { name: 'settings backup create', method: 'post', path: '/api/v1/admin/settings/backup/create', data: {} },
    { name: 'settings admins list', method: 'get', path: '/api/v1/admin/settings/admins?page=1' },
    { name: 'settings admins create', method: 'post', path: '/api/v1/admin/settings/admins', data: {} },
    { name: 'settings admins by id', method: 'get', path: `/api/v1/admin/settings/admins/${u}` },
    { name: 'settings admins put', method: 'put', path: `/api/v1/admin/settings/admins/${u}`, data: {} },
    { name: 'settings admins delete', method: 'delete', path: `/api/v1/admin/settings/admins/${u}` },
    { name: 'settings roles create', method: 'post', path: '/api/v1/admin/settings/roles', data: {} },
    { name: 'settings roles put', method: 'put', path: `/api/v1/admin/settings/roles/${u}`, data: {} },
    { name: 'settings roles delete', method: 'delete', path: `/api/v1/admin/settings/roles/${u}` },
    { name: 'settings sensitive-words list', method: 'get', path: '/api/v1/admin/settings/sensitive-words?page=1' },
    { name: 'settings system-monitor', method: 'get', path: '/api/v1/admin/settings/system-monitor' },
    { name: 'advertisers balance', method: 'put', path: `/api/v1/admin/advertisers/${u}/balance`, data: {} },
    { name: 'advertisers unfreeze', method: 'put', path: `/api/v1/admin/advertisers/${u}/unfreeze`, data: {} },
    { name: 'finance withdrawal reject', method: 'post', path: `/api/v1/admin/finance/withdrawals/${u}/reject`, data: {} },
    { name: 'kols blacklist put', method: 'put', path: `/api/v1/admin/kols/${u}/blacklist`, data: {} },
    { name: 'kols blacklist delete', method: 'delete', path: `/api/v1/admin/kols/${u}/blacklist` },
    { name: 'kols suspend', method: 'post', path: `/api/v1/admin/kols/${u}/suspend`, data: {} },
    { name: 'users unban', method: 'put', path: `/api/v1/admin/users/${u}/unban`, data: {} },
    { name: 'users suspend', method: 'put', path: `/api/v1/admin/users/${u}/suspend`, data: {} },
    { name: 'content reject', method: 'post', path: `/api/v1/admin/content/${u}/reject`, data: {} },
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
