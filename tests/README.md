# AIAds 测试指南

本目录包含 AIAds 平台的所有测试代码和配置文件。

## 目录结构

```
tests/
├── e2e/                    # E2E 测试文件
│   ├── advertiser-auth.spec.ts    # 广告主认证流程测试
│   ├── kol-auth.spec.ts           # KOL 认证流程测试
│   └── forgot-password.spec.ts    # 忘记密码流程测试
└── playwright.config.ts    # Playwright 配置文件
```

## 测试类型

### 1. E2E 测试 (Playwright)

E2E 测试用于验证完整的用户流程，运行在真实的浏览器环境中。

**运行命令**:

```bash
# 安装 Playwright 浏览器
npm run install:browsers

# 运行所有 E2E 测试
npm run test:e2e

# 有头模式运行（显示浏览器）
npm run test:e2e:headed

# 调试模式运行
npm run test:e2e:debug

# 打开 UI 模式
npm run test:e2e:ui

# 查看测试报告
npm run test:e2e:report
```

## 后端测试

后端测试位于 `/src/backend/tests/` 目录。

**运行命令**:

```bash
cd src/backend

# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# CI 模式
npm run test:ci
```

### 测试文件

- `auth.test.ts` - 认证模块 API 测试
- `users.test.ts` - 用户管理模块 API 测试
- `setup.ts` - 测试配置文件

## 前端测试

前端测试位于 `/src/frontend/src/**/__tests__/` 目录。

**运行命令**:

```bash
cd src/frontend

# 运行所有测试
npm run test

# 运行一次（不监听）
npm run test:run

# 生成覆盖率报告
npm run test:coverage

# 打开 UI 界面
npm run test:ui
```

### 测试文件

- `components/common/__tests__/Button.test.tsx` - 按钮组件测试
- `components/common/__tests__/Input.test.tsx` - 输入框组件测试
- `pages/auth/__tests__/LoginPage.test.tsx` - 登录页面测试
- `pages/auth/__tests__/RegisterPage.test.tsx` - 注册页面测试

## 测试覆盖率要求

| 指标 | 后端 | 前端 |
|-----|------|------|
| 语句覆盖率 | ≥ 80% | ≥ 80% |
| 分支覆盖率 | ≥ 70% | ≥ 70% |
| 函数覆盖率 | ≥ 80% | ≥ 80% |
| 行覆盖率 | ≥ 80% | ≥ 80% |

## 测试优先级

- **P0**: 核心功能，必须 100% 通过
- **P1**: 重要功能，必须 ≥ 95% 通过
- **P2**: 普通功能，必须 ≥ 90% 通过
- **P3**: 边缘功能，建议 ≥ 80% 通过

## 编写测试

### 后端 API 测试示例

```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('POST /api/v1/auth/register', () => {
  it('应该成功注册新用户', async () => {
    const registerData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(registerData.email);
  });
});
```

### 前端组件测试示例

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('应该处理点击事件', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>点击</Button>);
    
    const button = screen.getByRole('button', { name: '点击' });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### E2E 测试示例

```typescript
import { test, expect } from '@playwright/test';

test('应该完成登录流程', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  
  await page.fill('label:has-text("邮箱") input', 'test@example.com');
  await page.fill('label:has-text("密码") input', 'SecurePass123!');
  await page.click('button:has-text("登录")');
  
  await expect(page).toHaveURL(/\/dashboard/);
});
```

## 持续集成

测试会自动在以下情况运行：

1. **Pull Request**: 运行单元测试和 E2E 测试
2. **合并到主分支**: 运行全量测试和覆盖率检查
3. **定时任务**: 每天运行一次完整测试套件

## 故障排查

### 测试失败

1. 检查错误信息和堆栈跟踪
2. 在本地重现失败
3. 使用调试模式运行测试
4. 检查测试数据是否正确清理

### 覆盖率不达标

1. 添加更多测试用例覆盖边界条件
2. 测试错误处理逻辑
3. 测试各种输入组合

### E2E 测试不稳定

1. 增加等待时间或使用显式等待
2. 使用稳定的选择器（data-testid）
3. 避免依赖动画和过渡效果

## 参考文档

- [测试计划](../docs/TEST_PLAN.md)
- [测试用例](../docs/TEST_CASES.md)
- [测试报告模板](../docs/TEST_REPORT.md)
