import { test, expect } from '@playwright/test';

/** 与 adminStore persist / login 使用的 key 一致，避免复用浏览器或残留数据导致「仍视为已登录」 */
function clearAdminBrowserStorageInit() {
  return () => {
    try {
      localStorage.removeItem('admin-auth-storage');
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
    } catch {
      /* ignore */
    }
  };
}

/**
 * 管理端轻量冒烟：登录页可访问（不依赖后端账号与登录成功）
 */
test.describe('Admin smoke', () => {
  test('optional backend health when AIADS_E2E_API_BASE is set', async ({ request }) => {
    const base = process.env.AIADS_E2E_API_BASE?.replace(/\/$/, '');
    test.skip(!base, '设置 AIADS_E2E_API_BASE（如 http://localhost:8080）以断言后端健康检查');

    const res = await request.get(`${base}/api/v1/health`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      success?: boolean;
      data?: { status?: string; version?: string };
    };
    expect(body.success).toBe(true);
    expect(body.data?.status).toBe('ok');
    expect(typeof body.data?.version).toBe('string');
  });

  test('unauthenticated /admin redirects to login', async ({ page }) => {
    await page.addInitScript(clearAdminBrowserStorageInit());
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 20000 });
    await expect(page.getByRole('textbox', { name: '邮箱' })).toBeVisible({ timeout: 15000 });
  });

  test('unauthenticated /admin/orders with tab=disputes deeplink redirects to login', async ({ page }) => {
    await page.addInitScript(clearAdminBrowserStorageInit());
    await page.goto('/admin/orders?tab=disputes', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 20000 });
    await expect(page.getByRole('textbox', { name: '邮箱' })).toBeVisible({ timeout: 15000 });
  });

  test('admin login page shows form', async ({ page }) => {
    await page.addInitScript(clearAdminBrowserStorageInit());
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    // MUI TextField：标签「邮箱」「密码」
    await expect(page.getByRole('textbox', { name: '邮箱' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByLabel('密码')).toBeVisible();
    await expect(page.getByRole('button', { name: /登录|登\s*录/ })).toBeVisible();
  });
});
