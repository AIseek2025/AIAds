import { test, expect } from '@playwright/test';

/** 广告主列表首条驱动 GET /advertisers/:id/consumptions（需 finance:view） */
test.describe('Admin API advertiser consumptions (list-driven)', () => {
  test('GET consumptions when advertisers list has rows', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_ADMIN_TOKEN;
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_ADMIN_TOKEN');

    const list = await request.get(`${base}/api/v1/admin/advertisers?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(list.status() === 403, '无 advertiser:view 权限');
    expect(list.ok(), await list.text()).toBeTruthy();
    const listBody = (await list.json()) as { data?: { items?: Array<{ id?: string }> } };
    const id = listBody.data?.items?.[0]?.id;
    test.skip(!id, '广告主列表为空');

    const res = await request.get(`${base}/api/v1/admin/advertisers/${id}/consumptions?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
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
