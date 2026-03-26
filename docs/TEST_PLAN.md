# AIAds 测试计划文档

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**作者**: AIAds QA 团队
**保密级别**: 内部机密

---

## 1. 文档概述

### 1.1 目的

本文档定义了 AIAds 平台的整体测试策略、测试范围、测试工具和测试流程。旨在确保平台质量，满足用户需求和技术要求。

### 1.2 适用范围

本测试计划适用于 AIAds 平台的所有功能模块，包括：
- 后端 API 服务
- 前端 Web 应用（广告主端、KOL 端、管理后台）
- 第三方集成（TikTok、YouTube、Instagram、支付等）

### 1.3 术语定义

| 术语 | 定义 |
|-----|------|
| P0 | 致命级别测试用例，核心功能必须通过 |
| P1 | 严重级别测试用例，重要功能必须通过 |
| P2 | 一般级别测试用例，普通功能应该通过 |
| P3 | 轻微级别测试用例，边缘功能建议通过 |
| 单元测试 | 针对最小可测试单元（函数、方法）的测试 |
| 集成测试 | 针对模块间接口和交互的测试 |
| E2E 测试 | 端到端测试，模拟完整用户流程 |

---

## 2. 测试策略

### 2.1 测试金字塔

AIAds 采用测试金字塔策略，确保测试效率和覆盖率的最佳平衡：

```
           /\
          /  \
         / E2E \        10%
        /-------\
       /         \
      /  集成测试  \     20%
     /-------------\
    /               \
   /    单元测试      \   70%
  /-------------------\
```

#### 2.1.1 单元测试（70%）

**目标**: 验证最小代码单元的正确性

**测试对象**:
- 后端：Service 层函数、Controller 层函数、工具函数、中间件
- 前端：组件渲染、组件逻辑、Hooks、工具函数

**技术要求**:
- 代码覆盖率 ≥ 80%
- 分支覆盖率 ≥ 70%
- 所有 P0 测试用例必须通过

**测试框架**:
- 后端：Jest + ts-jest
- 前端：Vitest + React Testing Library

#### 2.1.2 集成测试（20%）

**目标**: 验证模块间的接口和交互

**测试对象**:
- API 接口测试（Controller 层）
- 数据库操作测试（Repository 层）
- 第三方服务集成测试
- 前后端集成测试

**技术要求**:
- 核心 API 接口 100% 覆盖
- 数据库事务正确性验证
- 错误处理和边界条件测试

**测试框架**:
- 后端：Jest + Supertest
- 前端：Vitest + MSW (Mock Service Worker)

#### 2.1.3 E2E 测试（10%）

**目标**: 验证完整用户流程的正确性

**测试对象**:
- 用户注册登录流程
- 广告主创建活动流程
- KOL 接单流程
- 支付充值提现流程

**技术要求**:
- 核心用户流程 100% 覆盖
- 多浏览器兼容性测试
- 响应式布局测试

**测试框架**:
- Playwright

---

## 3. 测试范围

### 3.1 后端 API 测试

#### 3.1.1 认证模块 (Auth)

| 接口 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| POST /api/v1/auth/register | 单元 + 集成 | P0 | 8 |
| POST /api/v1/auth/login | 单元 + 集成 | P0 | 8 |
| POST /api/v1/auth/refresh | 单元 + 集成 | P0 | 4 |
| POST /api/v1/auth/logout | 单元 + 集成 | P1 | 3 |
| GET /api/v1/auth/me | 单元 + 集成 | P1 | 3 |
| POST /api/v1/auth/verification-code | 单元 + 集成 | P1 | 4 |
| POST /api/v1/auth/verify-code | 单元 + 集成 | P1 | 4 |
| POST /api/v1/auth/reset-password | 单元 + 集成 | P1 | 4 |
| POST /api/v1/auth/change-password | 单元 + 集成 | P1 | 4 |

**测试重点**:
- 参数验证（邮箱格式、密码强度）
- 业务逻辑验证（重复注册、密码正确性）
- Token 生成和验证
- 限流机制
- 错误处理

#### 3.1.2 用户管理模块 (Users)

| 接口 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| GET /api/v1/users/:id | 单元 + 集成 | P1 | 4 |
| PUT /api/v1/users/:id | 单元 + 集成 | P1 | 4 |
| DELETE /api/v1/users/:id | 单元 + 集成 | P2 | 3 |
| POST /api/v1/users/:id/change-password | 单元 + 集成 | P1 | 4 |
| POST /api/v1/users/:id/suspend | 单元 + 集成 | P2 | 3 |
| POST /api/v1/users/:id/activate | 单元 + 集成 | P2 | 3 |

**测试重点**:
- 权限验证（只能修改自己的数据）
- 数据完整性
- 软删除逻辑
- 管理员权限

#### 3.1.3 广告主模块 (Advertisers)

| 接口 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| GET /api/v1/advertisers/me | 单元 + 集成 | P0 | 3 |
| POST /api/v1/advertisers | 单元 + 集成 | P0 | 5 |
| PATCH /api/v1/advertisers/me | 单元 + 集成 | P1 | 4 |
| POST /api/v1/advertisers/me/business-license | 单元 + 集成 | P1 | 4 |

**测试重点**:
- 企业认证信息验证
- 营业执照上传
- 审核状态流转

#### 3.1.4 KOL 模块 (KOLs)

| 接口 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| GET /api/v1/kols | 单元 + 集成 | P0 | 6 |
| GET /api/v1/kols/:id | 单元 + 集成 | P0 | 4 |
| POST /api/v1/kols/recommend | 单元 + 集成 | P0 | 4 |
| POST /api/v1/kols/verify | 单元 + 集成 | P1 | 4 |
| PATCH /api/v1/kols/me | 单元 + 集成 | P1 | 4 |

**测试重点**:
- KOL 数据同步
- AI 推荐算法
- 平台认证

#### 3.1.5 活动模块 (Campaigns)

| 接口 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| GET /api/v1/campaigns | 单元 + 集成 | P0 | 5 |
| POST /api/v1/campaigns | 单元 + 集成 | P0 | 6 |
| GET /api/v1/campaigns/:id | 单元 + 集成 | P0 | 4 |
| PUT /api/v1/campaigns/:id | 单元 + 集成 | P1 | 4 |
| DELETE /api/v1/campaigns/:id | 单元 + 集成 | P1 | 3 |

**测试重点**:
- 活动状态流转
- 预算控制
- KOL 匹配

#### 3.1.6 订单模块 (Orders)

| 接口 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| GET /api/v1/orders | 单元 + 集成 | P0 | 5 |
| POST /api/v1/orders | 单元 + 集成 | P0 | 6 |
| GET /api/v1/orders/:id | 单元 + 集成 | P0 | 4 |
| PATCH /api/v1/orders/:id/status | 单元 + 集成 | P1 | 5 |

**测试重点**:
- 订单状态机
- 支付状态同步
- 超时取消

#### 3.1.7 支付模块 (Payments)

| 接口 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| POST /api/v1/payments/recharge | 单元 + 集成 | P0 | 5 |
| POST /api/v1/payments/withdraw | 单元 + 集成 | P0 | 5 |
| GET /api/v1/payments/transactions | 单元 + 集成 | P1 | 4 |
| POST /api/v1/payments/webhook/:provider | 单元 + 集成 | P0 | 6 |

**测试重点**:
- 支付渠道集成
- 金额计算
- 回调验证
- 对账逻辑

#### 3.1.8 数据追踪模块 (Tracking)

| 接口 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| POST /api/v1/tracking/event | 单元 + 集成 | P0 | 4 |
| GET /api/v1/tracking/stats | 单元 + 集成 | P1 | 5 |
| GET /api/v1/tracking/report | 单元 + 集成 | P1 | 4 |

**测试重点**:
- 数据采集准确性
- 实时统计
- 报表生成

### 3.2 前端组件测试

#### 3.2.1 通用组件

| 组件 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| Button | 单元测试 | P1 | 6 |
| Input | 单元测试 | P1 | 8 |
| Dialog | 单元测试 | P2 | 5 |
| Loading | 单元测试 | P2 | 4 |
| Snackbar | 单元测试 | P2 | 4 |
| ErrorBoundary | 单元测试 | P2 | 3 |

**测试重点**:
- 渲染正确性
- 事件处理
- 状态变化
- 可访问性

#### 3.2.2 布局组件

| 组件 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| Header | 单元测试 | P2 | 4 |
| Sidebar | 单元测试 | P2 | 4 |
| Footer | 单元测试 | P3 | 2 |
| ProtectedRoute | 单元测试 | P1 | 5 |

**测试重点**:
- 路由守卫
- 权限控制
- 响应式布局

#### 3.2.3 页面组件

| 页面 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| LoginPage | 单元 + E2E | P0 | 8 |
| RegisterPage | 单元 + E2E | P0 | 10 |
| ForgotPasswordPage | 单元 + E2E | P1 | 6 |
| AdvertiserDashboard | 单元 + E2E | P0 | 6 |
| KolDashboard | 单元 + E2E | P0 | 6 |
| CampaignListPage | 单元 + E2E | P1 | 5 |
| CampaignDetailPage | 单元 + E2E | P1 | 5 |

**测试重点**:
- 表单验证
- API 调用
- 状态管理
- 错误处理
- 路由跳转

### 3.3 集成测试

#### 3.3.1 前后端集成

| 场景 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| 登录认证流程 | 集成测试 | P0 | 4 |
| Token 刷新流程 | 集成测试 | P0 | 3 |
| 文件上传流程 | 集成测试 | P1 | 3 |
| WebSocket 实时通知 | 集成测试 | P1 | 4 |

#### 3.3.2 第三方集成

| 服务 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| TikTok API | 集成测试 | P0 | 5 |
| YouTube API | 集成测试 | P0 | 5 |
| Instagram API | 集成测试 | P0 | 5 |
| 支付宝支付 | 集成测试 | P0 | 6 |
| 微信支付 | 集成测试 | P0 | 6 |
| Stripe 支付 | 集成测试 | P1 | 6 |
| PayPal 支付 | 集成测试 | P1 | 6 |
| Cloudflare R2 存储 | 集成测试 | P1 | 4 |

### 3.4 E2E 测试

#### 3.4.1 广告主流程

| 流程 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| 注册 → 企业认证 → 充值 → 创建活动 → 选择 KOL → 下单 | E2E 测试 | P0 | 2 |
| 登录 → 查看活动数据 → 调整预算 → 查看报表 | E2E 测试 | P1 | 2 |
| 登录 → 钱包充值 → 申请发票 | E2E 测试 | P1 | 2 |

#### 3.4.2 KOL 流程

| 流程 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| 注册 → 平台认证 → 完善资料 → 接单 → 发布内容 → 收款 | E2E 测试 | P0 | 2 |
| 登录 → 查看任务 → 申请任务 → 查看收入 → 提现 | E2E 测试 | P1 | 2 |

#### 3.4.3 管理员流程

| 流程 | 测试类型 | 优先级 | 测试用例数 |
|-----|---------|-------|-----------|
| 登录 → 审核企业 → 审核 KOL → 查看数据报表 | E2E 测试 | P1 | 2 |
| 登录 → 处理投诉 → 封禁用户 → 查看日志 | E2E 测试 | P2 | 2 |

---

## 4. 测试工具

### 4.1 测试框架

| 工具 | 用途 | 版本 | 配置位置 |
|-----|------|------|---------|
| Jest | 后端单元测试 | ^29.7.0 | `/src/backend/jest.config.js` |
| Vitest | 前端单元测试 | ^2.0.0 | `/src/frontend/vitest.config.ts` |
| Playwright | E2E 测试 | ^1.45.0 | `/tests/playwright.config.ts` |
| React Testing Library | React 组件测试 | ^16.0.0 | `/src/frontend/vitest.config.ts` |
| Supertest | API 集成测试 | ^7.0.0 | `/src/backend/jest.config.js` |
| MSW | API Mock | ^2.0.0 | `/src/frontend/src/mocks` |

### 4.2 覆盖率工具

| 工具 | 用途 | 目标 |
|-----|------|------|
| Istanbul/nyc | 代码覆盖率统计 | 覆盖率 ≥ 80% |
| c8 | Vitest 覆盖率 | 覆盖率 ≥ 80% |

### 4.3 质量工具

| 工具 | 用途 | 配置位置 |
|-----|------|---------|
| ESLint | 代码风格检查 | `/src/backend/.eslintrc.json` |
| Prettier | 代码格式化 | `/src/backend/.prettierrc` |
| TypeScript | 类型检查 | `/src/backend/tsconfig.json` |
| Husky | Git Hooks | `/.husky/` |
| lint-staged | 暂存文件检查 | `/package.json` |

### 4.4 CI/CD 集成

| 工具 | 用途 |
|-----|------|
| GitHub Actions | 自动化测试执行 |
| Vercel | 前端自动部署和预览 |
| Railway | 后端自动部署 |

---

## 5. 测试环境

### 5.1 环境架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        测试环境架构                              │
└─────────────────────────────────────────────────────────────────┘

开发环境 (Development)
├── 前端：http://localhost:3000
├── 后端：http://localhost:8080
├── 数据库：PostgreSQL (Docker)
└── 缓存：Redis (Docker)

测试环境 (Testing/Staging)
├── 前端：https://test.aiads.com
├── 后端：https://api-test.aiads.com
├── 数据库：Supabase (测试实例)
└── 缓存：Upstash (测试实例)

生产环境 (Production)
├── 前端：https://aiads.com
├── 后端：https://api.aiads.com
├── 数据库：Supabase (生产实例)
└── 缓存：Upstash (生产实例)
```

### 5.2 环境配置

#### 5.2.1 开发环境

| 配置项 | 值 | 说明 |
|-------|-----|------|
| Node.js | 20.x | 运行时 |
| 数据库 | PostgreSQL 15 (Docker) | 本地数据库 |
| Redis | Redis 7 (Docker) | 本地缓存 |
| 前端端口 | 3000 | Vite 开发服务器 |
| 后端端口 | 8080 | Express 服务器 |

#### 5.2.2 测试环境

| 配置项 | 值 | 说明 |
|-------|-----|------|
| 部署平台 | Vercel + Railway | 自动部署 |
| 数据库 | Supabase | 测试实例 |
| Redis | Upstash | 测试实例 |
| 域名 | test.aiads.com | 前端测试域名 |
| API 域名 | api-test.aiads.com | 后端测试域名 |

#### 5.2.3 Staging 环境

| 配置项 | 值 | 说明 |
|-------|-----|------|
| 部署平台 | Vercel + Railway | 生产配置 |
| 数据库 | Supabase | Staging 实例 |
| Redis | Upstash | Staging 实例 |
| 域名 | staging.aiads.com | 预发布域名 |

#### 5.2.4 生产环境

| 配置项 | 值 | 说明 |
|-------|-----|------|
| 部署平台 | Vercel + Railway | 生产配置 |
| 数据库 | Supabase | 生产实例 |
| Redis | Upstash | 生产实例 |
| 域名 | aiads.com | 生产域名 |

### 5.3 测试数据管理

#### 5.3.1 测试数据准备

```typescript
// 测试数据工厂
const testUserFactory = {
  advertiser: {
    email: 'advertiser@test.com',
    password: 'TestPass123!',
    role: 'advertiser' as const,
  },
  kol: {
    email: 'kol@test.com',
    password: 'TestPass123!',
    role: 'kol' as const,
  },
  admin: {
    email: 'admin@test.com',
    password: 'TestPass123!',
    role: 'admin' as const,
  },
};
```

#### 5.3.2 数据清理

- 每次测试前清空测试数据
- 使用事务回滚保证数据隔离
- E2E 测试后清理测试账号

---

## 6. 准入准出标准

### 6.1 测试准入标准

代码进入测试阶段前必须满足：

| 标准 | 要求 | 验证方式 |
|-----|------|---------|
| 代码审查 | 100% 代码经过 Review | GitHub PR |
| 单元测试 | 新增代码覆盖率 ≥ 80% | CI 检查 |
| 静态检查 | ESLint 无错误 | CI 检查 |
| 类型检查 | TypeScript 无错误 | CI 检查 |
| 构建成功 | 编译无错误 | CI 检查 |

### 6.2 测试准出标准

测试完成必须满足：

| 标准 | 要求 | 验证方式 |
|-----|------|---------|
| P0 测试用例 | 100% 通过 | 测试报告 |
| P1 测试用例 | ≥ 95% 通过 | 测试报告 |
| P2 测试用例 | ≥ 90% 通过 | 测试报告 |
| 代码覆盖率 | ≥ 80% | 覆盖率报告 |
| 致命 Bug | 0 个 | Bug 追踪 |
| 严重 Bug | 0 个 | Bug 追踪 |
| 一般 Bug | ≤ 10 个 | Bug 追踪 |

### 6.3 发布标准

产品发布必须满足：

| 标准 | 要求 | 验证方式 |
|-----|------|---------|
| 所有测试 | 100% 通过 | CI/CD 报告 |
| 性能测试 | 响应时间 < 500ms | 性能报告 |
| 安全测试 | 无高危漏洞 | 安全扫描 |
| 兼容性测试 | 主流浏览器通过 | E2E 报告 |
| 回归测试 | 100% 通过 | 回归报告 |

---

## 7. Bug 管理

### 7.1 Bug 级别定义

| 级别 | 说明 | 响应时间 | 修复时间 |
|-----|------|---------|---------|
| P0 - 致命 | 系统崩溃、数据丢失、安全漏洞 | 立即 | 24 小时 |
| P1 - 严重 | 核心功能不可用 | 4 小时 | 48 小时 |
| P2 - 一般 | 非核心功能问题 | 24 小时 | 1 周 |
| P3 - 轻微 | UI 问题、体验优化 | 1 周 | 2 周 |

### 7.2 Bug 流程

```
发现 Bug → 提交 Issue → 分配负责人 → 修复 → Code Review → 验证 → 关闭
```

### 7.3 Issue 模板

```markdown
## Bug 描述
[清晰描述 Bug 现象]

## 复现步骤
1. [步骤 1]
2. [步骤 2]
3. [步骤 3]

## 期望行为
[描述期望的正确行为]

## 实际行为
[描述实际的错误行为]

## 环境信息
- OS: [操作系统]
- Browser: [浏览器版本]
- Frontend: [前端版本]
- Backend: [后端版本]

## 截图/日志
[相关截图或日志]

## 优先级
[ ] P0 - 致命
[ ] P1 - 严重
[ ] P2 - 一般
[ ] P3 - 轻微
```

---

## 8. 测试执行计划

### 8.1 第一阶段：单元测试（Day 1-2）

| 任务 | 负责人 | 开始时间 | 结束时间 | 状态 |
|-----|-------|---------|---------|------|
| 后端认证模块测试 | QA 团队 | Day 1 AM | Day 1 PM | 待开始 |
| 后端用户模块测试 | QA 团队 | Day 1 PM | Day 2 AM | 待开始 |
| 前端组件测试 | QA 团队 | Day 1 AM | Day 2 PM | 待开始 |
| 前端页面测试 | QA 团队 | Day 2 AM | Day 2 PM | 待开始 |

### 8.2 第二阶段：集成测试（Day 3-4）

| 任务 | 负责人 | 开始时间 | 结束时间 | 状态 |
|-----|-------|---------|---------|------|
| API 集成测试 | QA 团队 | Day 3 AM | Day 3 PM | 待开始 |
| 前后端集成测试 | QA 团队 | Day 3 PM | Day 4 AM | 待开始 |
| 第三方集成测试 | QA 团队 | Day 4 AM | Day 4 PM | 待开始 |

### 8.3 第三阶段：E2E 测试（Day 5-6）

| 任务 | 负责人 | 开始时间 | 结束时间 | 状态 |
|-----|-------|---------|---------|------|
| 广告主流程 E2E | QA 团队 | Day 5 AM | Day 5 PM | 待开始 |
| KOL 流程 E2E | QA 团队 | Day 5 PM | Day 6 AM | 待开始 |
| 管理员流程 E2E | QA 团队 | Day 6 AM | Day 6 PM | 待开始 |

### 8.4 第四阶段：回归测试（Day 7）

| 任务 | 负责人 | 开始时间 | 结束时间 | 状态 |
|-----|-------|---------|---------|------|
| Bug 修复验证 | QA 团队 | Day 7 AM | Day 7 PM | 待开始 |
| 全量回归测试 | QA 团队 | Day 7 AM | Day 7 PM | 待开始 |
| 测试报告编写 | QA 团队 | Day 7 PM | Day 7 PM | 待开始 |

---

## 9. 风险管理

### 9.1 风险识别

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|---------|
| 第三方 API 不稳定 | 中 | 高 | Mock 服务、重试机制 |
| 测试数据污染 | 中 | 中 | 数据隔离、定期清理 |
| 测试环境不稳定 | 低 | 高 | 多环境备份、快速恢复 |
| 测试时间不足 | 中 | 中 | 优先级排序、自动化 |

### 9.2 应急预案

- **环境问题**: 准备 Docker Compose 本地环境
- **数据问题**: 定期备份测试数据
- **进度问题**: 优先保证 P0/P1 测试用例

---

## 10. 交付物

### 10.1 测试文档

| 文档 | 位置 | 说明 |
|-----|------|------|
| 测试计划 | `/docs/TEST_PLAN.md` | 本文档 |
| 测试用例 | `/docs/TEST_CASES.md` | 详细测试用例 |
| 测试报告 | `/docs/TEST_REPORT.md` | 测试执行报告 |

### 10.2 测试代码

| 代码 | 位置 | 说明 |
|-----|------|------|
| 后端测试 | `/src/backend/tests/` | Jest 测试文件 |
| 前端测试 | `/src/frontend/src/**/*.test.tsx` | Vitest 测试文件 |
| E2E 测试 | `/tests/e2e/` | Playwright 测试文件 |

### 10.3 配置文件

| 文件 | 位置 | 说明 |
|-----|------|------|
| Jest 配置 | `/src/backend/jest.config.js` | 后端测试配置 |
| Vitest 配置 | `/src/frontend/vitest.config.ts` | 前端测试配置 |
| Playwright 配置 | `/tests/playwright.config.ts` | E2E 测试配置 |

---

## 11. 附录

### 11.1 参考文档

- [系统架构设计](./SYSTEM_ARCHITECTURE.md)
- [API 规范](./API_SPEC.md)
- [API 实现](./API_IMPLEMENTATION.md)
- [前端开发指南](./FRONTEND_SETUP.md)

### 11.2 工具文档

- [Jest 官方文档](https://jestjs.io/)
- [Vitest 官方文档](https://vitest.dev/)
- [Playwright 官方文档](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)

### 11.3 联系方式

| 角色 | 邮箱 |
|-----|------|
| QA 负责人 | qa@aiads.com |
| 技术负责人 | tech@aiads.com |
| 产品负责人 | product@aiads.com |

---

**文档结束**
