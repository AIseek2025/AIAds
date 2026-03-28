import { test, expect } from '@playwright/test';

/**
 * 公共路由：不依赖后端账号
 */
test.describe('Public routes', () => {
  test('root / redirects to /login', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
  });
});
