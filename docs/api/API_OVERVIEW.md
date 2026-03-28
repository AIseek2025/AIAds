# AIAds API 概览

**版本**: 1.0.0
**最后更新**: 2026 年 3 月 24 日

---

## 目录

1. [简介](#1-简介)
2. [基础信息](#2-基础信息)
3. [认证机制](#3-认证机制)
4. [请求规范](#4-请求规范)
5. [响应规范](#5-响应规范)
6. [错误处理](#6-错误处理)
7. [限流策略](#7-限流策略)
8. [版本控制](#8-版本控制)
9. [SDK 和工具](#9-sdk-和工具)
10. [API 模块索引](#10-api-模块索引)

---

## 1. 简介

AIAds API 提供了一套完整的 RESTful 接口，用于集成 AIAds 平台的核心功能。通过 API，您可以：

- 管理用户认证和授权
- 操作广告主账户和活动
- 管理 KOL 账号和任务
- 访问数据分析和报表
- 集成第三方服务

### 1.1 适用场景

| 场景 | 说明 |
|------|------|
| 自定义前端 | 构建自定义的 Web/移动端应用 |
| 数据集成 | 将 AIAds 数据集成到内部系统 |
| 自动化操作 | 批量管理活动和订单 |
| 第三方集成 | 与 ERP/CRM 等系统对接 |

### 1.2 相关文档

| 文档 | 说明 |
|------|------|
| [API_AUTH.md](API_AUTH.md) | 认证 API 详解 |
| [API_ADVERTISER.md](API_ADVERTISER.md) | 广告主 API 详解 |
| [API_KOL.md](API_KOL.md) | KOL API 详解 |
| [API_ADMIN.md](API_ADMIN.md) | 管理后台 API 详解 |
| [API_INTEGRATIONS.md](API_INTEGRATIONS.md) | 第三方集成 API |

---

## 2. 基础信息

### 2.1 API 端点

| 环境 | Base URL | 说明 |
|------|----------|------|
| 生产环境 | `https://api.aiads.com/v1` | 正式 API |
| 测试环境 | `https://api-staging.aiads.com/v1` | 测试 API |
| 本地开发 | `http://localhost:3000/api/v1` | 本地开发 |

### 2.2 请求格式

```http
POST /v1/resource HTTP/1.1
Host: api.aiads.com
Content-Type: application/json
Authorization: Bearer <access_token>
```

### 2.3 响应格式

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "request_id": "req_123456789"
}
```

### 2.4 时间格式

所有时间字段使用 **ISO 8601** 格式，时区为 **UTC**：

```
2026-03-24T10:00:00Z
```

### 2.5 货币格式

所有金额字段使用 **整数分** 表示（避免浮点数精度问题）：

```json
{
  "amount": 10000,  // 表示 100.00 元
  "currency": "CNY"
}
```

---

## 3. 认证机制

### 3.1 认证方式

AIAds API 使用 **JWT Bearer Token** 认证：

```http
Authorization: Bearer <access_token>
```

### 3.2 Token 类型

| Token | 有效期 | 用途 |
|-------|--------|------|
| Access Token | 1 小时 | API 请求认证 |
| Refresh Token | 7 天 | 刷新 Access Token |

### 3.3 获取 Token

```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

### 3.4 刷新 Token

```http
POST /v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3.5 权限说明

不同角色的 API 访问权限：

| 角色 | 可访问的 API |
|------|-------------|
| 广告主 | 广告主相关 API |
| KOL | KOL 相关 API |
| 管理员 | 所有 API |

---

## 4. 请求规范

### 4.1 HTTP 方法

| 方法 | 说明 | 幂等性 |
|------|------|--------|
| `GET` | 获取资源 | 是 |
| `POST` | 创建资源 | 否 |
| `PUT` | 全量更新 | 是 |
| `PATCH` | 部分更新 | 否 |
| `DELETE` | 删除资源 | 是 |

### 4.2 请求头

| 头 | 必填 | 说明 |
|----|------|------|
| `Authorization` | ✅ | Bearer Token |
| `Content-Type` | ✅ (POST/PUT/PATCH) | `application/json` |
| `Accept` | 推荐 | `application/json` |
| `X-Request-ID` | 推荐 | 请求追踪 ID |

### 4.3 分页参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | integer | 1 | 页码（从 1 开始） |
| `page_size` | integer | 20 | 每页数量（最大 100） |
| `sort` | string | `created_at` | 排序字段 |
| `order` | string | `desc` | 排序方向（asc/desc） |

### 4.4 过滤参数

| 参数 | 示例 | 说明 |
|------|------|------|
| 精确匹配 | `status=active` | `status` 等于 `active` |
| 多值匹配 | `status_in=active,pending` | `status` 在列表中 |
| 范围查询 | `amount_gt=100` | `amount` 大于 100 |
| 范围查询 | `amount_lte=1000` | `amount` 小于等于 1000 |
| 关键词搜索 | `keyword=手机` | 全文搜索 |
| 日期范围 | `start_date=2026-01-01` | 开始日期 |
| 日期范围 | `end_date=2026-12-31` | 结束日期 |

---

## 5. 响应规范

### 5.1 成功响应

#### 单资源响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "资源名称",
    "created_at": "2026-03-24T10:00:00Z"
  },
  "message": "操作成功",
  "request_id": "req_123456789"
}
```

#### 列表响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "资源 1"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "资源 2"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    }
  },
  "message": null,
  "request_id": "req_123456789"
}
```

### 5.2 空响应

```json
{
  "success": true,
  "data": null,
  "message": "操作成功",
  "request_id": "req_123456789"
}
```

### 5.3 文件下载响应

```http
HTTP/1.1 200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="report.xlsx"

<binary data>
```

---

## 6. 错误处理

### 6.1 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ]
  },
  "request_id": "req_123456789"
}
```

### 6.2 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| **2xx 成功** | |
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无内容） |
| **4xx 客户端错误** | |
| 400 | 请求参数错误 |
| 401 | 未认证/Token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 422 | 数据验证失败 |
| 429 | 请求过于频繁 |
| **5xx 服务端错误** | |
| 500 | 服务器内部错误 |
| 502 | 网关错误 |
| 503 | 服务不可用 |

### 6.3 错误码列表

| 错误码 | HTTP 状态码 | 说明 |
|--------|-----------|------|
| `SUCCESS` | 200 | 成功 |
| `VALIDATION_ERROR` | 422 | 验证错误 |
| `AUTH_REQUIRED` | 401 | 需要认证 |
| `TOKEN_INVALID` | 401 | Token 无效 |
| `TOKEN_EXPIRED` | 401 | Token 过期 |
| `FORBIDDEN` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 资源冲突 |
| `RATE_LIMITED` | 429 | 请求超限 |
| `INTERNAL_ERROR` | 500 | 内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务不可用 |

### 6.4 错误处理示例

#### 401 未认证

```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "请先登录"
  },
  "request_id": "req_123456789"
}
```

#### 422 验证错误

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式不正确"
      },
      {
        "field": "password",
        "message": "密码长度至少 8 位"
      }
    ]
  },
  "request_id": "req_123456789"
}
```

#### 429 请求超限

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "请求过于频繁，请稍后再试",
    "details": {
      "retry_after": 60
    }
  },
  "request_id": "req_123456789"
}
```

---

## 7. 限流策略

### 7.1 限流规则

| 端点类型 | 限制 | 说明 |
|----------|------|------|
| 认证接口 | 10 次/分钟 | 防止暴力破解 |
| 普通接口 | 100 次/分钟 | 一般 API 请求 |
| 数据导出 | 10 次/小时 | 大数据量接口 |
| 文件上传 | 50 次/小时 | 文件上传接口 |

### 7.2 限流响应头

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1679644860
```

| 头 | 说明 |
|----|------|
| `X-RateLimit-Limit` | 每分钟请求上限 |
| `X-RateLimit-Remaining` | 剩余请求数 |
| `X-RateLimit-Reset` | 重置时间戳（秒） |

### 7.3 提升限流

如需更高限流，请联系商务团队：

- 企业用户可申请提升限流
- 根据业务需求定制限流策略

---

## 8. 版本控制

### 8.1 版本策略

- URL Path 版本控制：`/v1/`, `/v2/`
- 向后兼容的变更不升级版本号
- 破坏性变更需要升级版本号
- 旧版本至少维护 6 个月

### 8.2 版本生命周期

| 版本 | 状态 | 开始日期 | 结束日期 |
|------|------|----------|----------|
| v1 | 当前 | 2026-03-24 | - |
| v0 | 已废弃 | 2025-01-01 | 2026-06-30 |

### 8.3 版本迁移

当新版本发布时，我们会提供：

- 迁移指南
- 变更日志
- 兼容期（至少 6 个月）

---

## 9. SDK 和工具

### 9.1 官方 SDK

| 语言 | 仓库 | 版本 |
|------|------|------|
| JavaScript/TypeScript | `@aiads/sdk-js` | 1.0.0 |
| Python | `aiads-python` | 1.0.0 |
| Java | `aiads-java` | 1.0.0 |
| Go | `aiads-go` | 1.0.0 |

### 9.2 SDK 使用示例

#### JavaScript/TypeScript

```typescript
import { AIAdsClient } from '@aiads/sdk-js';

const client = new AIAdsClient({
  apiKey: 'your_api_key'
});

// 获取 KOL 列表
const kols = await client.kols.list({
  platform: 'tiktok',
  minFollowers: 5000
});

// 创建活动
const campaign = await client.campaigns.create({
  title: '春季新品推广',
  budget: 10000
});
```

#### Python

```python
from aiads import AIAdsClient

client = AIAdsClient(api_key='your_api_key')

# 获取 KOL 列表
kols = client.kols.list(platform='tiktok', min_followers=5000)

# 创建活动
campaign = client.campaigns.create(
    title='春季新品推广',
    budget=10000
)
```

### 9.3 Postman 集合

导入 Postman 集合快速测试 API：

- 下载：[AIAds API.postman_collection.json](../tools/AIAds_API.postman_collection.json)
- 导入：Postman → Import → 选择文件

### 9.4 OpenAPI 规范

完整的 OpenAPI 3.0 规范：

- 下载：[openapi.yaml](../tools/openapi.yaml)
- 在线查看：[Swagger UI](https://api.aiads.com/docs)

---

## 10. API 模块索引

### 10.1 认证模块

| API | 说明 | 文档 |
|-----|------|------|
| `POST /auth/register` | 用户注册 | [API_AUTH.md](API_AUTH.md) |
| `POST /auth/login` | 用户登录 | [API_AUTH.md](API_AUTH.md) |
| `POST /auth/login-email-code` | 邮箱验证码登录 | [API_AUTH.md](API_AUTH.md) |
| `POST /auth/refresh` | 刷新 Token | [API_AUTH.md](API_AUTH.md) |
| `POST /auth/logout` | 用户登出 | [API_AUTH.md](API_AUTH.md) |
| `POST /auth/verification-code` | 发送验证码 | [API_AUTH.md](API_AUTH.md) |
| `POST /auth/verify-code` | 验证验证码 | [API_AUTH.md](API_AUTH.md) |
| `POST /auth/reset-password` | 重置密码 | [API_AUTH.md](API_AUTH.md) |

### 10.2 用户模块

| API | 说明 | 文档 |
|-----|------|------|
| `GET /users/me` | 获取当前用户信息 | [API_AUTH.md](API_AUTH.md) |
| `PATCH /users/me` | 更新用户信息 | [API_AUTH.md](API_AUTH.md) |
| `POST /users/me/change-password` | 修改密码 | [API_AUTH.md](API_AUTH.md) |

### 10.3 广告主模块

| API | 说明 | 文档 |
|-----|------|------|
| `GET /advertisers/me` | 获取广告主信息 | [API_ADVERTISER.md](API_ADVERTISER.md) |
| `POST /advertisers` | 创建广告主信息 | [API_ADVERTISER.md](API_ADVERTISER.md) |
| `PATCH /advertisers/me` | 更新广告主信息 | [API_ADVERTISER.md](API_ADVERTISER.md) |
| `POST /advertisers/me/business-license` | 上传营业执照 | [API_ADVERTISER.md](API_ADVERTISER.md) |
| `GET /campaigns` | 获取活动列表 | [API_ADVERTISER.md](API_ADVERTISER.md) |
| `POST /campaigns` | 创建活动 | [API_ADVERTISER.md](API_ADVERTISER.md) |
| `GET /campaigns/:id` | 获取活动详情 | [API_ADVERTISER.md](API_ADVERTISER.md) |
| `PATCH /campaigns/:id` | 更新活动 | [API_ADVERTISER.md](API_ADVERTISER.md) |
| `DELETE /campaigns/:id` | 删除活动 | [API_ADVERTISER.md](API_ADVERTISER.md) |
| `GET /orders` | 获取订单列表 | [API_ADVERTISER.md](API_ADVERTISER.md) |
| `POST /payments/recharge` | 充值 | [API_ADVERTISER.md](API_ADVERTISER.md) |

### 10.4 KOL 模块

| API | 说明 | 文档 |
|-----|------|------|
| `GET /kols` | 获取 KOL 列表 | [API_KOL.md](API_KOL.md) |
| `GET /kols/:id` | 获取 KOL 详情 | [API_KOL.md](API_KOL.md) |
| `POST /kols/recommend` | AI 推荐 KOL | [API_KOL.md](API_KOL.md) |
| `POST /kols/verify` | KOL 认证 | [API_KOL.md](API_KOL.md) |
| `PATCH /kols/me` | 更新 KOL 信息 | [API_KOL.md](API_KOL.md) |
| `GET /tasks` | 获取任务列表 | [API_KOL.md](API_KOL.md) |
| `POST /tasks/:id/apply` | 申请任务 | [API_KOL.md](API_KOL.md) |
| `POST /tasks/:id/submit` | 提交作品 | [API_KOL.md](API_KOL.md) |
| `GET /earnings` | 获取收益明细 | [API_KOL.md](API_KOL.md) |
| `POST /withdrawals` | 申请提现 | [API_KOL.md](API_KOL.md) |

### 10.5 管理后台模块

| API | 说明 | 文档 |
|-----|------|------|
| `GET /admin/users` | 用户管理 | [API_ADMIN.md](API_ADMIN.md) |
| `GET /admin/kols` | KOL 管理 | [API_ADMIN.md](API_ADMIN.md) |
| `POST /admin/kols/:id/verify` | KOL 审核 | [API_ADMIN.md](API_ADMIN.md) |
| `GET /admin/campaigns` | 活动管理 | [API_ADMIN.md](API_ADMIN.md) |
| `POST /admin/campaigns/:id/audit` | 活动审核 | [API_ADMIN.md](API_ADMIN.md) |
| `GET /admin/orders` | 订单管理 | [API_ADMIN.md](API_ADMIN.md) |
| `GET /admin/finance` | 财务管理 | [API_ADMIN.md](API_ADMIN.md) |
| `GET /admin/reports` | 数据报表 | [API_ADMIN.md](API_ADMIN.md) |

### 10.6 第三方集成模块

| API | 说明 | 文档 |
|-----|------|------|
| `POST /integrations/tiktok/bind` | 绑定 TikTok | [API_INTEGRATIONS.md](API_INTEGRATIONS.md) |
| `POST /integrations/youtube/bind` | 绑定 YouTube | [API_INTEGRATIONS.md](API_INTEGRATIONS.md) |
| `POST /integrations/instagram/bind` | 绑定 Instagram | [API_INTEGRATIONS.md](API_INTEGRATIONS.md) |
| `POST /integrations/stripe/charge` | Stripe 支付 | [API_INTEGRATIONS.md](API_INTEGRATIONS.md) |
| `POST /integrations/paypal/payout` | PayPal 提现 | [API_INTEGRATIONS.md](API_INTEGRATIONS.md) |

---

## 附录

### A. 支持联系方式

| 渠道 | 信息 |
|------|------|
| 技术支持邮箱 | api-support@aiads.com |
| 开发者文档 | https://docs.aiads.com |
| API 状态页 | https://status.aiads.com |

### B. 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-03-24 | 初始版本 |

---

**感谢您使用 AIAds API！**
