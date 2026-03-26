import { test, expect } from '@playwright/test';

test.describe('KOL 认证流程', () => {
  test('应该完成 KOL 注册和登录全流程', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `kol${timestamp}@test.com`;
    const testPassword = 'TestPass123!';

    // 1. 访问注册页面
    await page.goto('http://localhost:3000/register');

    // 2. 选择 KOL 角色
    await page.click('text=KOL');
    await page.click('button:has-text("下一步")');

    // 3. 填写注册信息
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', testPassword);
    await page.click('text=我已阅读并同意');
    await page.click('button:has-text("下一步")');

    // 4. 验证邮箱
    await page.fill('label:has-text("验证码") input', '123456');
    await page.click('button:has-text("完成注册")');

    // 5. 验证跳转到 KOL 仪表板
    await expect(page).toHaveURL(/\/kol\/dashboard/);
    await expect(page.locator('text=KOL 仪表板')).toBeVisible();

    // 6. 登出并重新登录
    await page.click('[data-testid="user-menu"]');
    await page.click('text=登出');

    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', testPassword);
    await page.click('button:has-text("登录")');

    await expect(page).toHaveURL(/\/kol\/dashboard/);
  });

  test('应该记住 KOL 登录状态', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `kolremember${timestamp}@test.com`;
    const testPassword = 'TestPass123!';

    // 注册
    await page.goto('http://localhost:3000/register');
    await page.click('text=KOL');
    await page.click('button:has-text("下一步")');
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', testPassword);
    await page.click('text=我已阅读并同意');
    await page.click('button:has-text("下一步")');
    await page.fill('label:has-text("验证码") input', '123456');
    await page.click('button:has-text("完成注册")');

    // 刷新页面
    await page.reload();

    // 验证仍然登录
    await expect(page).toHaveURL(/\/kol\/dashboard/);
  });
});
