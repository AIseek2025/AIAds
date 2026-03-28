import { test, expect } from '@playwright/test';

/**
 * 列表首条驱动的深链：用户活动、KOL 详情、活动统计、广告主充值记录
 */
test.describe('Admin API list-driven entity routes', () => {
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  test('GET /users/:id/activity when users list has rows', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const list = await request.get(`${base}/api/v1/admin/users?page=1&limit=5`, {
      headers: auth(token!),
    });
    test.skip(list.status() === 403, '无 user:view 权限');
    expect(list.ok(), await list.text()).toBeTruthy();
    const body = (await list.json()) as { data?: { items?: Array<{ id?: string }> } };
    const id = body.data?.items?.[0]?.id;
    test.skip(!id, '用户列表为空');

    const res = await request.get(`${base}/api/v1/admin/users/${id}/activity?page=1&limit=5`, {
      headers: auth(token!),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const j = (await res.json()) as { success?: boolean; data?: unknown };
    expect(j.success).toBe(true);
    expect(j.data).toBeDefined();
  });

  test('GET /kols/:id when kols list has rows', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const list = await request.get(`${base}/api/v1/admin/kols?page=1&page_size=5`, {
      headers: auth(token!),
    });
    test.skip(list.status() === 403, '无 kol:view 权限');
    expect(list.ok(), await list.text()).toBeTruthy();
    const body = (await list.json()) as { data?: { items?: Array<{ id?: string }> } };
    const id = body.data?.items?.[0]?.id;
    test.skip(!id, 'KOL 列表为空');

    const res = await request.get(`${base}/api/v1/admin/kols/${id}`, {
      headers: auth(token!),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const j = (await res.json()) as { success?: boolean; data?: unknown };
    expect(j.success).toBe(true);
    expect(j.data).toBeDefined();
  });

  test('GET /campaigns/:id/stats when campaigns list has rows', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const list = await request.get(`${base}/api/v1/admin/campaigns?page=1&page_size=5`, {
      headers: auth(token!),
    });
    test.skip(list.status() === 403, '无 campaign:view 权限');
    expect(list.ok(), await list.text()).toBeTruthy();
    const body = (await list.json()) as { data?: { items?: Array<{ id?: string }> } };
    const id = body.data?.items?.[0]?.id;
    test.skip(!id, '活动列表为空');

    const res = await request.get(`${base}/api/v1/admin/campaigns/${id}/stats`, {
      headers: auth(token!),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const j = (await res.json()) as { success?: boolean; data?: unknown };
    expect(j.success).toBe(true);
    expect(j.data).toBeDefined();
  });

  test('GET /advertisers/:id/recharges when advertisers list has rows', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const list = await request.get(`${base}/api/v1/admin/advertisers?page=1&page_size=5`, {
      headers: auth(token!),
    });
    test.skip(list.status() === 403, '无 advertiser:view 权限');
    expect(list.ok(), await list.text()).toBeTruthy();
    const body = (await list.json()) as { data?: { items?: Array<{ id?: string }> } };
    const id = body.data?.items?.[0]?.id;
    test.skip(!id, '广告主列表为空');

    const res = await request.get(`${base}/api/v1/admin/advertisers/${id}/recharges?page=1&limit=5`, {
      headers: auth(token!),
    });
    const st = res.status();
    expect([200, 403]).toContain(st);
    if (st === 200) {
      const j = (await res.json()) as { success?: boolean; data?: unknown };
      expect(j.success).toBe(true);
      expect(j.data).toBeDefined();
    }
  });
});
