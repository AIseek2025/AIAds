import { test, expect } from '@playwright/test';

test.describe('广告主认证流程', () => {
  test('应该完成广告主注册和登录全流程', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `advertiser${timestamp}@test.com`;
    const testPassword = 'TestPass123!';

    // 1. 访问首页（使用 playwright baseURL，默认与 Vite 4173 一致）
    await page.goto('/');
    await expect(page).toHaveTitle(/AIAds/);

    // 2. 点击注册
    await page.click('text=立即注册');
    await expect(page).toHaveURL(/\/register/);

    // 3. 选择广告主角色
    await page.click('text=广告主');
    await page.click('button:has-text("下一步")');

    // 4. 填写注册信息
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', testPassword);
    await page.click('text=我已阅读并同意');
    await page.click('button:has-text("下一步")');

    // 5. 验证邮箱（使用测试验证码）
    await page.fill('label:has-text("验证码") input', '123456');
    await page.click('button:has-text("完成注册")');

    // 6. 验证跳转到仪表板
    await expect(page).toHaveURL(/\/advertiser\/dashboard/);
    await expect(page.locator('text=仪表板')).toBeVisible();

    // 7. 登出
    await page.click('[data-testid="user-menu"]');
    await page.click('text=登出');
    await expect(page).toHaveURL(/\/login/);

    // 8. 登录
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', testPassword);
    await page.click('button:has-text("登录")');

    // 9. 验证登录后跳转
    await expect(page).toHaveURL(/\/advertiser\/dashboard/);
  });

  test('应该记住登录状态', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `remember${timestamp}@test.com`;
    const testPassword = 'TestPass123!';

    // 注册
    await page.goto('/register');
    await page.click('text=广告主');
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
    await expect(page).toHaveURL(/\/advertiser\/dashboard/);
  });

  test('应该显示表单验证错误', async ({ page }) => {
    await page.goto('/register');

    // 选择角色
    await page.click('text=广告主');
    await page.click('button:has-text("下一步")');

    // 输入无效邮箱
    await page.fill('label:has-text("邮箱") input', 'invalid');
    await page.click('button:has-text("下一步")');

    // 验证错误显示
    await expect(page.locator('text=邮箱格式不正确')).toBeVisible();
  });

  test('应该验证密码强度', async ({ page }) => {
    await page.goto('/register');

    // 选择角色
    await page.click('text=广告主');
    await page.click('button:has-text("下一步")');

    // 输入弱密码
    await page.fill('label:has-text("密码") input', '123');
    await expect(page.locator('text=弱')).toBeVisible();

    // 输入强密码
    await page.fill('label:has-text("密码") input', 'SecurePass123!');
    await expect(page.locator('text=强')).toBeVisible();
  });
});
