import { test, expect } from '@playwright/test';

/** KOL 调用 POST /api/v1/orders → 403（仅广告主可建单） */
test.describe('KOL API create order forbidden', () => {
  test('returns 403 for kol role', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    const token = process.env.AIADS_E2E_KOL_TOKEN?.trim();
    test.skip(!base || !token, '设置 AIADS_E2E_API_BASE 与 AIADS_E2E_KOL_TOKEN');

    const cid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const kid = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    const res = await request.post(`${base}/api/v1/orders`, {
      data: {
        campaign_id: cid,
        kol_id: kid,
        offered_price: 100,
      },
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(403);
  });
});
