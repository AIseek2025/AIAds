import { test, expect } from '@playwright/test';

/**
 * 门户第十组：无 Token → 401
 * OAuth 授权入口、KOL 频次、通知筛选、用户详情等 query 组合（与 batch8–9 互补）
 */
test.describe('Portal private routes batch10 without token', () => {
  const u = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  const paths: { name: string; path: string }[] = [
    { name: 'kols me frequency rolling', path: '/api/v1/kols/me/frequency?rolling_days=7' },
    { name: 'integrations instagram auth', path: '/api/v1/integrations/instagram/auth?state=test-state' },
    { name: 'integrations youtube auth', path: '/api/v1/integrations/youtube/auth?state=x' },
    { name: 'integrations tiktok auth', path: '/api/v1/integrations/tiktok/auth?state=y' },
    { name: 'integrations youtube status', path: '/api/v1/integrations/youtube/status?v=1' },
    { name: 'notifications unread filter', path: '/api/v1/notifications?page=1&page_size=5&unread_only=true' },
    { name: 'users by id', path: `/api/v1/users/${u}` },
    { name: 'advertiser transactions type', path: '/api/v1/advertisers/me/transactions?type=all&page=1' },
    { name: 'tasks keyword sort', path: '/api/v1/tasks?page=1&keyword=shop&sort=budget' },
    { name: 'campaigns status active', path: '/api/v1/campaigns?page=1&page_size=5&status=active' },
  ];

  for (const item of paths) {
    test(`${item.name} returns 401`, async ({ request }) => {
      const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
      test.skip(!base, '设置 AIADS_E2E_API_BASE');

      const res = await request.get(`${base}${item.path}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status()).toBe(401);
    });
  }
});
