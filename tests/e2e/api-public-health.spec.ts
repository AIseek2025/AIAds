import { test, expect } from '@playwright/test';

function normBase(): string | undefined {
  return process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
}

/**
 * 公开 API：无需 Token（与 admin-api-* 共用 AIADS_E2E_API_BASE）
 */
test.describe('Public API: health + ui-config', () => {
  test('GET /health', async ({ request }) => {
    const base = normBase();
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.get(`${base}/api/v1/health`);
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: { status?: string; version?: string };
    };
    expect(body.success).toBe(true);
    expect(body.data?.status).toBe('ok');
    expect(typeof body.data?.version).toBe('string');
  });

  test('GET /public/ui-config', async ({ request }) => {
    const base = normBase();
    test.skip(!base, '设置 AIADS_E2E_API_BASE');

    const res = await request.get(`${base}/api/v1/public/ui-config`);
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: {
        budget_risk_threshold?: number;
        low_balance_alert_cny?: number;
        kol_accept_frequency?: { enabled?: boolean; rolling_days?: number; max_accepts?: number };
      };
    };
    expect(body.success).toBe(true);
    expect(typeof body.data?.budget_risk_threshold).toBe('number');
    expect(typeof body.data?.low_balance_alert_cny).toBe('number');
    expect(body.data?.kol_accept_frequency).toBeDefined();
  });
});
