import { test, expect } from '@playwright/test';

test.describe('忘记密码流程', () => {
  test('应该完成密码重置流程', async ({ page }) => {
    const testEmail = `reset${Date.now()}@test.com`;
    const testPassword = 'OldPass123!';
    const newPassword = 'NewPass456!';

    // 1. 先注册账号
    await page.goto('/register');
    await page.click('text=广告主');
    await page.click('button:has-text("下一步")');
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', testPassword);
    await page.click('text=我已阅读并同意');
    await page.click('button:has-text("下一步")');
    await page.fill('label:has-text("验证码") input', '123456');
    await page.click('button:has-text("完成注册")');

    // 2. 登出
    await page.click('[data-testid="user-menu"]');
    await page.click('text=登出');

    // 3. 访问忘记密码页面
    await page.click('text=忘记密码？');
    await expect(page).toHaveURL(/\/forgot-password/);

    // 4. 输入邮箱
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.click('button:has-text("发送验证码")');

    // 5. 输入验证码和新密码
    await page.fill('label:has-text("验证码") input', '123456');
    await page.fill('label:has-text("新密码") input', newPassword);
    await page.fill('label:has-text("确认密码") input', newPassword);
    await page.click('button:has-text("重置密码")');

    // 6. 验证重置成功
    await expect(page.locator('text=密码重置成功')).toBeVisible();

    // 7. 使用新密码登录
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', newPassword);
    await page.click('button:has-text("登录")');

    await expect(page).toHaveURL(/\/advertiser\/dashboard/);
  });
});
