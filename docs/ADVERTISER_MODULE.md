# AIAds 广告主模块开发文档

**版本**: 1.0  
**创建日期**: 2026 年 3 月 24 日  
**作者**: AIAds 开发团队  
**状态**: 已完成

---

## 1. 模块概述

广告主模块是 AIAds 平台的核心功能之一，为广告主提供完整的投放管理功能，包括：

- 广告主资料管理
- 充值和余额管理
- 投放活动管理
- KOL 搜索和筛选
- AI 智能推荐
- 订单管理

---

## 2. 技术架构

### 2.1 技术栈

- **TypeScript**: 类型安全的 JavaScript 超集
- **Express**: Web 应用框架
- **Prisma**: 类型安全的 ORM
- **Zod**: TypeScript 优先的 schema 验证
- **Redis**: 缓存和会话管理
- **PostgreSQL**: 主数据库

### 2.2 目录结构

```
src/backend/
├── src/
│   ├── controllers/
│   │   ├── advertisers.controller.ts    # 广告主资料控制器
│   │   ├── campaigns.controller.ts      # 活动管理控制器
│   │   ├── kols.controller.ts           # KOL 搜索控制器
│   │   └── orders.controller.ts         # 订单管理控制器
│   ├── services/
│   │   ├── advertisers.service.ts       # 广告主业务逻辑
│   │   ├── campaigns.service.ts         # 活动业务逻辑
│   │   ├── kols.service.ts              # KOL 业务逻辑
│   │   ├── orders.service.ts            # 订单业务逻辑
│   │   └── ai-matching.service.ts       # AI 匹配服务
│   ├── routes/
│   │   ├── advertisers.routes.ts
│   │   ├── campaigns.routes.ts
│   │   ├── kols.routes.ts
│   │   └── orders.routes.ts
│   ├── utils/
│   │   └── validator.ts                 # Zod 验证 schemas
│   └── types/
│       └── index.ts                     # TypeScript 类型定义
├── tests/
│   ├── advertisers.test.ts
│   ├── campaigns.test.ts
│   ├── kols.test.ts
│   └── orders.test.ts
```

---

## 3. API 接口文档

### 3.1 广告主资料 API

#### 3.1.1 创建广告主资料

```http
POST /api/v1/advertisers
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "companyName": "公司名称",
  "companyWebsite": "https://example.com",
  "industry": "行业类别",
  "contactPerson": "联系人",
  "contactPhone": "138****1234",
  "budget": 50000
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "company_name": "公司名称",
    "verification_status": "pending",
    "created_at": "2026-03-24T10:00:00Z"
  },
  "message": "广告主信息创建成功，请等待审核"
}
```

#### 3.1.2 获取广告主资料

```http
GET /api/v1/advertisers/me
Authorization: Bearer <access_token>
```

#### 3.1.3 更新广告主资料

```http
PUT /api/v1/advertisers/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "contactPerson": "新联系人",
  "industry": "新行业"
}
```

### 3.2 充值和余额 API

#### 3.2.1 充值

```http
POST /api/v1/advertisers/me/recharge
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 10000,
  "paymentMethod": "alipay",
  "paymentProof": "支付凭证 URL"
}
```

#### 3.2.2 查询余额

```http
GET /api/v1/advertisers/me/balance
Authorization: Bearer <access_token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "wallet_balance": 50000.00,
    "frozen_balance": 5000.00,
    "total_recharged": 100000.00,
    "total_spent": 50000.00
  }
}
```

#### 3.2.3 交易明细

```http
GET /api/v1/advertisers/me/transactions?page=1&page_size=20&type=recharge
Authorization: Bearer <access_token>
```

### 3.3 投放活动 API

#### 3.3.1 创建活动

```http
POST /api/v1/campaigns
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "夏季促销活动",
  "description": "活动描述",
  "platform": "tiktok",
  "budget": 5000,
  "pricingModel": "CPM",
  "targetAudience": {
    "regions": ["US", "EU"],
    "ageRange": "18-35",
    "categories": ["fashion", "beauty"],
    "minFollowers": 5000,
    "maxFollowers": 50000,
    "minEngagementRate": 0.03
  },
  "startDate": "2026-04-01",
  "endDate": "2026-04-30",
  "deliverables": {
    "posts": 3,
    "stories": 5
  }
}
```

#### 3.3.2 获取活动列表

```http
GET /api/v1/campaigns?page=1&page_size=20&status=active
Authorization: Bearer <access_token>
```

#### 3.3.3 获取活动详情

```http
GET /api/v1/campaigns/:id
Authorization: Bearer <access_token>
```

#### 3.3.4 更新活动

```http
PUT /api/v1/campaigns/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "更新后的标题",
  "budget": 6000
}
```

#### 3.3.5 删除活动

```http
DELETE /api/v1/campaigns/:id
Authorization: Bearer <access_token>
```

#### 3.3.6 提交活动

```http
POST /api/v1/campaigns/:id/submit
Authorization: Bearer <access_token>
```

### 3.4 KOL 搜索 API

#### 3.4.1 搜索 KOL

```http
GET /api/v1/kols?platform=tiktok&minFollowers=5000&maxFollowers=50000&categories=fashion,beauty&regions=US,EU&minEngagementRate=0.03&page=1&limit=20
Authorization: Bearer <access_token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "kol-id",
        "platform": "tiktok",
        "username": "@kol_name",
        "followers": 25000,
        "engagementRate": 0.045,
        "categories": ["fashion", "beauty"],
        "regions": ["US"]
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

#### 3.4.2 获取 KOL 详情

```http
GET /api/v1/kols/:id
Authorization: Bearer <access_token>
```

### 3.5 AI 推荐 API

#### 3.5.1 推荐 KOL

```http
GET /api/v1/kols/recommend?campaignId=campaign-id&limit=20
Authorization: Bearer <access_token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "kol": { ... },
        "match_score": 0.92,
        "match_reasons": [
          "高互动率",
          "目标受众匹配",
          "预算范围内",
          "电子产品类博主"
        ],
        "estimated_reach": 15000,
        "estimated_engagement": 675
      }
    ],
    "total": 50
  }
}
```

### 3.6 订单 API

#### 3.6.1 创建订单

```http
POST /api/v1/orders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "campaignId": "campaign-id",
  "kolId": "kol-id",
  "offeredPrice": 500,
  "requirements": "合作要求"
}
```

#### 3.6.2 获取订单列表

```http
GET /api/v1/orders?page=1&page_size=20&status=pending
Authorization: Bearer <access_token>
```

#### 3.6.3 获取订单详情

```http
GET /api/v1/orders/:id
Authorization: Bearer <access_token>
```

#### 3.6.4 接受订单 (KOL 操作)

```http
PUT /api/v1/orders/:id/accept
Authorization: Bearer <access_token>
```

#### 3.6.5 拒绝订单 (KOL 操作)

```http
PUT /api/v1/orders/:id/reject
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "价格太低"
}
```

#### 3.6.6 完成订单 (广告主操作)

```http
PUT /api/v1/orders/:id/complete
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 5,
  "review": "合作愉快"
}
```

---

## 4. 业务逻辑说明

### 4.1 广告主资料管理

- 每个用户只能创建一个广告主资料
- 创建后状态为 `pending`，等待审核
- 只有广告主本人可以查看和修改自己的资料

### 4.2 充值流程

1. 广告主提交充值申请
2. 系统生成交易记录
3. 自动完成充值（生产环境需要对接支付平台）
4. 更新账户余额

### 4.3 活动管理

- 创建活动时检查账户余额
- 草稿状态的活动可以随时修改
- 提交后进入审核状态
- 审核通过后变为 active 状态，开始匹配 KOL

### 4.4 KOL 搜索

支持多维度筛选：
- 平台（tiktok, youtube, instagram 等）
- 粉丝数量区间
- 互动率
- 内容分类
- 地区

### 4.5 AI 匹配算法

匹配分数计算维度：
1. **粉丝匹配度** (0-30 分): 根据活动要求的粉丝区间计算
2. **互动率** (0-25 分): 高于最低要求的 KOL 获得更高分
3. **类别匹配** (0-20 分): KOL 分类与活动要求匹配度
4. **地区匹配** (0-15 分): KOL 地区与目标市场匹配度
5. **历史表现** (0-10 分): 基于完成订单数和评分

### 4.6 订单流程

```
pending (待确认)
  ↓
accepted (已接受)
  ↓
in_progress (进行中)
  ↓
submitted (已提交)
  ↓
approved (已批准)
  ↓
published (已发布)
  ↓
completed (已完成)
```

---

## 5. 数据库表关系

```
users (1) ── (1) advertisers
users (1) ── (1) kols
advertisers (1) ── (N) campaigns
campaigns (1) ── (N) orders
kols (1) ── (N) orders
orders (1) ── (N) transactions
```

---

## 6. 缓存策略

### 6.1 缓存键设计

- `advertiser:user:{userId}` - 广告主资料 (5 分钟)
- `advertiser:{advertiserId}` - 广告主资料 (5 分钟)
- `campaign:{campaignId}` - 活动详情 (5 分钟)
- `kol:{kolId}` - KOL 详情 (10 分钟)

### 6.2 缓存失效

以下操作需要清除相关缓存：
- 更新资料后清除对应缓存
- 删除资源后清除对应缓存
- 充值后清除广告主余额缓存

---

## 7. 错误处理

### 7.1 常见错误码

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| `AUTH_REQUIRED` | 401 | 未认证 |
| `FORBIDDEN` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 资源冲突 |
| `INSUFFICIENT_BALANCE` | 400 | 余额不足 |
| `INVALID_STATUS` | 400 | 状态无效 |
| `VALIDATION_ERROR` | 422 | 验证失败 |

### 7.2 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": [
      {
        "field": "字段名",
        "message": "具体错误信息"
      }
    ]
  },
  "request_id": "req_xxx"
}
```

---

## 8. 测试说明

### 8.1 运行测试

```bash
# 运行所有测试
npm test

# 运行特定模块测试
npm test -- advertisers.test.ts
npm test -- campaigns.test.ts
npm test -- kols.test.ts
npm test -- orders.test.ts
```

### 8.2 测试覆盖

- 广告主模块：创建、获取、更新、充值、余额、交易记录
- 活动模块：CRUD、提交、状态管理
- KOL 模块：搜索、详情、AI 推荐
- 订单模块：创建、接受、拒绝、完成

---

## 9. 安全考虑

1. **认证**: 所有接口需要 JWT Token 认证
2. **授权**: 用户只能操作自己的资源
3. **验证**: 所有输入使用 Zod 进行严格验证
4. **限流**: 敏感接口使用 rate limiter
5. **审计**: 重要操作记录审计日志

---

## 10. 性能优化

1. **分页**: 列表接口支持分页，默认 20 条/页
2. **缓存**: 热门数据使用 Redis 缓存
3. **索引**: 数据库表已建立合适索引
4. **事务**: 多表操作使用事务保证一致性

---

## 11. 后续优化建议

1. **支付对接**: 集成真实的支付平台（支付宝、微信支付、Stripe）
2. **消息通知**: 订单状态变更时发送通知
3. **数据分析**: 活动效果数据追踪和分析
4. **文件上传**: 营业执照、支付凭证等文件上传功能
5. **审核流程**: 广告主和活动的后台审核功能
6. **实时通讯**: 广告主和 KOL 的在线沟通功能

---

## 12. 相关文件

- [API 规范](./API_SPEC.md)
- [数据库设计](./DATABASE_SCHEMA.md)
- [后端代码](../src/backend/src/)
- [测试文件](../src/backend/tests/)
