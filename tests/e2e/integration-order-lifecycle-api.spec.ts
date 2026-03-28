import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

/**
 * Wave B / 审计 §8.2：集成环境「广告主建单 → KOL 接单与交稿 → 广告主确认完成 → 断言 order_payment 流水」
 *
 * 需运行中的后端 + 数据库；与 admin-api-* 共用 global-setup 换 Token。
 * 另需一对**已建档**的广告主与 KOL 账号（含广告主资料、KOL 资料）及广告主**可用余额 ≥ offered_price**。
 *
 * 环境变量：
 * - AIADS_E2E_API_BASE
 * - AIADS_E2E_ADVERTISER_EMAIL / AIADS_E2E_ADVERTISER_PASSWORD
 * - AIADS_E2E_KOL_EMAIL / AIADS_E2E_KOL_PASSWORD
 * - AIADS_E2E_ADMIN_TOKEN（global-setup 可由管理员邮箱密码注入）
 */

function normBase(): string | undefined {
  return process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
}

async function loginPortal(
  request: APIRequestContext,
  base: string,
  email: string,
  password: string
): Promise<string> {
  const res = await request.post(`${base}/api/v1/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as { data?: { tokens?: { access_token?: string } } };
  const token = body.data?.tokens?.access_token;
  expect(typeof token).toBe('string');
  return token as string;
}

test.describe('Integration API: order lifecycle → advertiser transaction', () => {
  test.describe.configure({ timeout: 120_000 });

  test('campaign → order → accept → submit → complete → order_payment', async ({ request }) => {
    const baseUrl = normBase();
    const advEmail = process.env.AIADS_E2E_ADVERTISER_EMAIL?.trim();
    const advPass = process.env.AIADS_E2E_ADVERTISER_PASSWORD;
    const kolEmail = process.env.AIADS_E2E_KOL_EMAIL?.trim();
    const kolPass = process.env.AIADS_E2E_KOL_PASSWORD;
    const adminToken = process.env.AIADS_E2E_ADMIN_TOKEN?.trim();

    test.skip(
      !baseUrl ||
        !advEmail ||
        !advPass ||
        !kolEmail ||
        !kolPass ||
        !adminToken,
      '配置 AIADS_E2E_API_BASE、广告主与 KOL 邮箱密码、以及管理员 Token（见 tests/global-setup 与 .env.example）'
    );

    const advToken = await loginPortal(request, baseUrl!, advEmail!, advPass!);
    const kolToken = await loginPortal(request, baseUrl!, kolEmail!, kolPass!);

    const advMe = await request.get(`${baseUrl}/api/v1/advertisers/me`, {
      headers: { Authorization: `Bearer ${advToken}` },
    });
    test.skip(
      advMe.status() === 404,
      '广告主未创建资料（GET /advertisers/me 404），请先在产品中完成广告主建档'
    );
    expect(advMe.ok()).toBeTruthy();

    const kolMe = await request.get(`${baseUrl}/api/v1/kols/me`, {
      headers: { Authorization: `Bearer ${kolToken}` },
    });
    test.skip(
      kolMe.status() === 404,
      'KOL 未创建资料（GET /kols/me 404），请先在产品中完成 KOL 建档'
    );
    expect(kolMe.ok()).toBeTruthy();
    const kolBody = (await kolMe.json()) as { data?: { id?: string } };
    const kolId = kolBody.data?.id;
    expect(typeof kolId).toBe('string');

    const balanceRes = await request.get(`${baseUrl}/api/v1/advertisers/me/balance`, {
      headers: { Authorization: `Bearer ${advToken}` },
    });
    expect(balanceRes.ok()).toBeTruthy();
    const balanceJson = (await balanceRes.json()) as { data?: { wallet_balance?: number } };
    const available = balanceJson.data?.wallet_balance ?? 0;

    const offeredPrice = 100;
    test.skip(
      available < offeredPrice,
      `广告主可用余额不足（当前 ${available}，需 ≥ ${offeredPrice} 以冻结订单）`
    );

    const title = `E2E 集成 ${Date.now()}`;
    const campRes = await request.post(`${baseUrl}/api/v1/campaigns`, {
      headers: {
        Authorization: `Bearer ${advToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title,
        budget: 5000,
        target_platforms: ['tiktok'],
      },
    });
    expect(campRes.ok(), await campRes.text()).toBeTruthy();
    const campJson = (await campRes.json()) as { data?: { id?: string } };
    const campaignId = campJson.data?.id;
    expect(typeof campaignId).toBe('string');

    const subRes = await request.post(`${baseUrl}/api/v1/campaigns/${campaignId}/submit`, {
      headers: { Authorization: `Bearer ${advToken}` },
    });
    expect(subRes.ok(), await subRes.text()).toBeTruthy();

    const verifyRes = await request.put(`${baseUrl}/api/v1/admin/campaigns/${campaignId}/verify`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: { action: 'approve', note: 'playwright integration' },
    });
    expect(verifyRes.ok(), await verifyRes.text()).toBeTruthy();

    const orderRes = await request.post(`${baseUrl}/api/v1/orders`, {
      headers: {
        Authorization: `Bearer ${advToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        campaign_id: campaignId,
        kol_id: kolId,
        offered_price: offeredPrice,
        requirements: 'Playwright 集成链路',
      },
    });
    expect(orderRes.ok(), await orderRes.text()).toBeTruthy();
    const orderJson = (await orderRes.json()) as { data?: { id?: string; status?: string } };
    const orderId = orderJson.data?.id;
    expect(typeof orderId).toBe('string');
    expect(orderJson.data?.status).toBe('pending');

    const acceptRes = await request.put(`${baseUrl}/api/v1/orders/${orderId}/accept`, {
      headers: { Authorization: `Bearer ${kolToken}` },
    });
    expect(acceptRes.ok(), await acceptRes.text()).toBeTruthy();

    const submitRes = await request.put(`${baseUrl}/api/v1/orders/${orderId}/submit`, {
      headers: {
        Authorization: `Bearer ${kolToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        draft_urls: ['https://example.com/e2e-draft.mp4'],
      },
    });
    expect(submitRes.ok(), await submitRes.text()).toBeTruthy();
    const submitJson = (await submitRes.json()) as { data?: { status?: string } };
    expect(submitJson.data?.status).toBe('submitted');

    const completeRes = await request.put(`${baseUrl}/api/v1/orders/${orderId}/complete`, {
      headers: {
        Authorization: `Bearer ${advToken}`,
        'Content-Type': 'application/json',
      },
      data: { rating: 5, review: 'Playwright 集成完成' },
    });
    expect(completeRes.ok(), await completeRes.text()).toBeTruthy();
    const completeJson = (await completeRes.json()) as { data?: { status?: string } };
    expect(completeJson.data?.status).toBe('completed');

    const txRes = await request.get(
      `${baseUrl}/api/v1/advertisers/me/transactions?page=1&page_size=20`,
      {
        headers: { Authorization: `Bearer ${advToken}` },
      }
    );
    expect(txRes.ok()).toBeTruthy();
    const txBody = (await txRes.json()) as {
      data?: { items?: Array<{ order_id?: string; type?: string }> };
    };
    const items = txBody.data?.items ?? [];
    const hit = items.find((t) => t.order_id === orderId && t.type === 'order_payment');
    expect(hit).toBeDefined();
  });
});
