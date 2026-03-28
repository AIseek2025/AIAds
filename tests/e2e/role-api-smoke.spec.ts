import { test, expect } from '@playwright/test';

/**
 * Wave B：门户角色 API 冒烟（依赖 global-setup 换票或手动 export TOKEN）
 * - 广告主：余额、通知列表、未读数
 * - KOL：接单频控快照、可提现余额
 * 未建档（GET /advertisers/me 或 /kols/me 404）时对应用例 skip，避免误报失败。
 */

function normBase(): string | undefined {
  return process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
}

test.describe('Role API smoke (advertiser + KOL)', () => {
  test('advertiser: profile → balance + notifications', async ({ request }) => {
    const base = normBase();
    const token = process.env.AIADS_E2E_ADVERTISER_TOKEN?.trim();
    test.skip(
      !base || !token,
      '设置 AIADS_E2E_API_BASE，并配置 AIADS_E2E_ADVERTISER_TOKEN 或广告主邮箱密码（见 global-setup）'
    );

    const me = await request.get(`${base}/api/v1/advertisers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(me.status() === 404, '广告主未建档（GET /advertisers/me 404）');
    expect(me.ok(), await me.text()).toBeTruthy();

    const bal = await request.get(`${base}/api/v1/advertisers/me/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(bal.ok(), await bal.text()).toBeTruthy();
    const balJson = (await bal.json()) as { success?: boolean; data?: { wallet_balance?: number } };
    expect(balJson.success).toBe(true);
    expect(typeof balJson.data?.wallet_balance).toBe('number');

    const list = await request.get(`${base}/api/v1/notifications?page=1&page_size=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok(), await list.text()).toBeTruthy();
    const listJson = (await list.json()) as {
      success?: boolean;
      data?: { items?: unknown[]; pagination?: unknown };
    };
    expect(listJson.success).toBe(true);
    expect(Array.isArray(listJson.data?.items)).toBe(true);

    const unread = await request.get(`${base}/api/v1/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(unread.ok(), await unread.text()).toBeTruthy();
    const unreadJson = (await unread.json()) as { success?: boolean; data?: { unread_count?: number } };
    expect(unreadJson.success).toBe(true);
    expect(typeof unreadJson.data?.unread_count).toBe('number');
  });

  test('KOL: profile → frequency + balance', async ({ request }) => {
    const base = normBase();
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(
      !base || !token,
      '设置 AIADS_E2E_API_BASE，并配置 AIADS_E2E_KOL_TOKEN 或 KOL 邮箱密码（见 global-setup）'
    );

    const me = await request.get(`${base}/api/v1/kols/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(me.status() === 404, 'KOL 未建档（GET /kols/me 404）');
    expect(me.ok(), await me.text()).toBeTruthy();

    const freq = await request.get(`${base}/api/v1/kols/me/frequency`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(freq.ok(), await freq.text()).toBeTruthy();
    const freqJson = (await freq.json()) as {
      success?: boolean;
      data?: { enabled?: boolean; rolling_days?: number; max_accepts?: number };
    };
    expect(freqJson.success).toBe(true);
    expect(freqJson.data).toBeDefined();
    expect(typeof freqJson.data?.enabled).toBe('boolean');
    expect(typeof freqJson.data?.rolling_days).toBe('number');

    const bal = await request.get(`${base}/api/v1/kols/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(bal.ok(), await bal.text()).toBeTruthy();
    const balJson = (await bal.json()) as { success?: boolean; data?: { available_balance?: number } };
    expect(balJson.success).toBe(true);
    expect(typeof balJson.data?.available_balance).toBe('number');
  });
});
