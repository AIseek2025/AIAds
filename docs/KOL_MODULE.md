# KOL 模块开发文档

## 概述

KOL（Key Opinion Leader）模块是 AIAds 平台的核心功能之一，为 KOL 用户提供资料管理、账号绑定、任务浏览、订单管理和收益管理等功能。

## 功能模块

### 1. KOL 资料管理

#### 1.1 创建 KOL 资料

**接口**: `POST /api/v1/kols/profile`

**请求体**:
```json
{
  "platform": "tiktok",
  "platform_username": "username",
  "platform_id": "platform_unique_id",
  "bio": "个人简介",
  "category": "娱乐",
  "country": "US"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "platform": "tiktok",
    "platform_username": "username",
    "status": "pending",
    ...
  },
  "message": "KOL 资料创建成功，请等待审核"
}
```

#### 1.2 获取当前 KOL 资料

**接口**: `GET /api/v1/kols/me`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "platform": "tiktok",
    "platform_username": "username",
    "followers": 10000,
    "engagement_rate": 5.5,
    ...
  }
}
```

#### 1.3 更新 KOL 资料

**接口**: `PUT /api/v1/kols/me`

**请求体**:
```json
{
  "bio": "更新后的简介",
  "category": "游戏",
  "base_price": 1000,
  "tags": ["游戏", "直播"]
}
```

### 2. 账号绑定

#### 2.1 绑定社交账号

**接口**: `POST /api/v1/kols/connect/:platform`

**路径参数**:
- `platform`: tiktok | youtube | instagram | xiaohongshu | weibo

**请求体**:
```json
{
  "platform_username": "username",
  "platform_id": "unique_id",
  "platform_display_name": "显示名称",
  "platform_avatar_url": "https://...",
  "access_token": "optional_token",
  "refresh_token": "optional_refresh_token"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "kol_id": "uuid",
    "platform": "tiktok",
    "platform_username": "username",
    "is_primary": false,
    "is_verified": false,
    ...
  },
  "message": "账号绑定成功"
}
```

#### 2.2 获取已绑定账号列表

**接口**: `GET /api/v1/kols/accounts`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "platform": "tiktok",
      "platform_username": "username",
      "followers": 10000,
      ...
    }
  ]
}
```

#### 2.3 解绑账号

**接口**: `DELETE /api/v1/kols/accounts/:id`

**响应**:
```json
{
  "success": true,
  "message": "账号解绑成功"
}
```

#### 2.4 同步数据

**接口**: `POST /api/v1/kols/sync`

**请求体**:
```json
{
  "account_ids": ["uuid1", "uuid2"]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "synced": 2,
    "failed": 0
  },
  "message": "数据同步完成，成功 2 个，失败 0 个"
}
```

### 3. 任务广场

#### 3.1 获取可接任务列表

**接口**: `GET /api/v1/tasks`

**查询参数**:
- `page`: 页码 (默认 1)
- `page_size`: 每页数量 (默认 20)
- `platform`: 平台过滤
- `min_budget`: 最低预算
- `max_budget`: 最高预算
- `status`: 状态过滤

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "campaign_id": "uuid",
        "title": "活动标题",
        "budget": 10000,
        "platform": "tiktok",
        "min_followers": 1000,
        ...
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
  }
}
```

#### 3.2 获取任务详情

**接口**: `GET /api/v1/tasks/:id`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "活动标题",
    "description": "活动描述",
    "budget": 10000,
    "content_requirements": "内容要求",
    "required_hashtags": ["#tag1", "#tag2"],
    "deadline": "2024-12-31T23:59:59Z",
    ...
  }
}
```

#### 3.3 申请任务

**接口**: `POST /api/v1/tasks/:id/apply`

**请求体**:
```json
{
  "message": "申请说明",
  "expected_price": 5000,
  "draft_urls": ["https://..."]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_no": "ORD-xxx-xxx",
    "price": 5000,
    "platform_fee": 500,
    "kol_earning": 4500,
    "status": "pending",
    ...
  },
  "message": "任务申请已提交，请等待广告主确认"
}
```

### 4. 订单管理

#### 4.1 获取订单列表

**接口**: `GET /api/v1/kols/orders`

**查询参数**:
- `page`: 页码
- `page_size`: 每页数量
- `status`: 状态过滤 (pending | accepted | in_progress | submitted | completed 等)
- `campaign_id`: 活动 ID 过滤

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {...}
  }
}
```

#### 4.2 获取订单详情

**接口**: `GET /api/v1/kols/orders/:id`

#### 4.3 接受订单

**接口**: `PUT /api/v1/kols/orders/:id/accept`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "accepted",
    "accepted_at": "2024-01-01T10:00:00Z",
    ...
  },
  "message": "订单已接受"
}
```

#### 4.4 拒绝订单

**接口**: `PUT /api/v1/kols/orders/:id/reject`

**请求体**:
```json
{
  "reason": "拒绝原因"
}
```

#### 4.5 提交作品

**接口**: `PUT /api/v1/kols/orders/:id/submit`

**请求体**:
```json
{
  "draft_urls": ["https://example.com/draft1", "https://example.com/draft2"],
  "message": "提交说明"
}
```

#### 4.6 修改作品

**接口**: `PUT /api/v1/kols/orders/:id/revise`

**请求体**:
```json
{
  "draft_urls": ["https://example.com/revised1"],
  "message": "修改说明"
}
```

### 5. 收益管理

#### 5.1 收益明细

**接口**: `GET /api/v1/kols/earnings`

**响应**:
```json
{
  "success": true,
  "data": {
    "total_earnings": 10000,
    "available_balance": 5000,
    "pending_balance": 2000,
    "withdrawn_amount": 3000
  }
}
```

#### 5.2 可用余额

**接口**: `GET /api/v1/kols/balance`

**响应**:
```json
{
  "success": true,
  "data": {
    "available_balance": 5000,
    "pending_balance": 2000,
    "total_earnings": 10000,
    "withdrawn_amount": 3000,
    "currency": "USD"
  }
}
```

#### 5.3 申请提现

**接口**: `POST /api/v1/kols/withdraw`

**请求体**:
```json
{
  "amount": 1000,
  "payment_method": "alipay",
  "account_name": "账户姓名",
  "account_number": "账户号码",
  "bank_name": "银行名称",
  "bank_code": "银行代码",
  "swift_code": "SWIFT 代码",
  "remarks": "备注"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "withdrawal_no": "WD-xxx-xxx",
    "amount": 1000,
    "fee": 10,
    "actual_amount": 990,
    "status": "pending",
    ...
  },
  "message": "提现申请已提交，请等待审核"
}
```

**提现规则**:
- 最低提现金额：10 元
- 手续费：支付宝/微信/PayPal 1%，银行转账 2%

#### 5.4 提现记录

**接口**: `GET /api/v1/kols/withdrawals`

**查询参数**:
- `page`: 页码
- `page_size`: 每页数量
- `status`: 状态过滤 (pending | processing | completed | rejected)

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "withdrawal_no": "WD-xxx-xxx",
        "amount": 1000,
        "fee": 10,
        "actual_amount": 990,
        "status": "pending",
        "created_at": "2024-01-01T10:00:00Z",
        ...
      }
    ],
    "pagination": {...}
  }
}
```

## 数据模型

### Kol 模型

```prisma
model Kol {
  id                String         @id @default(uuid())
  userId            String         @unique @map("user_id")
  platform          KolPlatform
  platformId        String         @map("platform_id")
  platformUsername  String         @map("platform_username")
  platformDisplayName String?      @map("platform_display_name")
  platformAvatarUrl String?        @map("platform_avatar_url")
  bio               String?
  category          String?
  subcategory       String?
  country           String?
  region            String?
  city              String?
  followers         Int            @default(0)
  following         Int            @default(0)
  totalVideos       Int            @default(0) @map("total_videos")
  totalLikes        Int            @default(0) @map("total_likes")
  avgViews          Int            @default(0) @map("avg_views")
  avgLikes          Int            @default(0) @map("avg_likes")
  avgComments       Int            @default(0) @map("avg_comments")
  avgShares         Int            @default(0) @map("avg_shares")
  engagementRate    Decimal        @default(0) @map("engagement_rate")
  status            KolStatus      @default(pending)
  verified          Boolean        @default(false)
  basePrice         Decimal?       @map("base_price")
  pricePerVideo     Decimal?       @map("price_per_video")
  currency          String         @default("USD")
  totalEarnings     Decimal        @default(0) @map("total_earnings")
  availableBalance  Decimal        @default(0) @map("available_balance")
  pendingBalance    Decimal        @default(0) @map("pending_balance")
  totalOrders       Int            @default(0) @map("total_orders")
  completedOrders   Int            @default(0) @map("completed_orders")
  avgRating         Decimal        @default(0) @map("avg_rating")
  tags              String[]
  metadata          Json           @default("{}")
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")
  lastSyncedAt      DateTime?      @map("last_synced_at")
}
```

### KolAccount 模型

```prisma
model KolAccount {
  id                String   @id @default(uuid())
  kolId             String   @map("kol_id")
  platform          KolPlatform
  platformId        String   @map("platform_id")
  platformUsername  String   @map("platform_username")
  platformDisplayName String? @map("platform_display_name")
  platformAvatarUrl String?  @map("platform_avatar_url")
  followers         Int      @default(0)
  following         Int?
  totalVideos       Int?
  totalLikes        Int?
  avgViews          Int?
  avgLikes          Int?
  avgComments       Int?
  avgShares         Int?
  engagementRate    Decimal?
  isPrimary         Boolean  @default(false)
  isVerified        Boolean  @default(false)
  accessToken       String?
  refreshToken      String?
  lastSyncedAt      DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Withdrawal 模型

```prisma
model Withdrawal {
  id              String   @id @default(uuid())
  kolId           String   @map("kol_id")
  withdrawalNo    String   @unique @map("withdrawal_no")
  amount          Decimal
  fee             Decimal
  actualAmount    Decimal  @map("actual_amount")
  currency        String   @default("CNY")
  paymentMethod   String   @map("payment_method")
  accountName     String   @map("account_name")
  accountNumber   String   @map("account_number")
  bankName        String?  @map("bank_name")
  status          String   @default("pending")
  description     String?
  failureReason   String?  @map("failure_reason")
  processedAt     DateTime? @map("processed_at")
  metadata        Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## 订单状态流转

```
pending (待确认)
    ↓
accepted (已接受) ───→ rejected (已拒绝)
    ↓
in_progress (进行中)
    ↓
submitted (已提交)
    ↓
approved (已审核) ←──→ revision (修改中)
    ↓
published (已发布)
    ↓
completed (已完成)
```

## 错误码

| 错误码 | 说明 |
|--------|------|
| UNAUTHORIZED | 未授权 |
| NOT_FOUND | 资源不存在 |
| FORBIDDEN | 没有权限 |
| CONFLICT | 资源冲突 (如重复创建) |
| INVALID_ROLE | 用户角色不正确 |
| INVALID_STATUS | 状态不正确 |
| INVALID_TASK_STATUS | 任务状态不正确 |
| ALREADY_APPLIED | 已申请过该任务 |
| INSUFFICIENT_BALANCE | 余额不足 |
| BELOW_MINIMUM | 低于最低金额 |
| VALIDATION_ERROR | 验证失败 |

## 测试

运行 KOL 模块测试:

```bash
cd /Users/surferboy/.openclaw/workspace/AIAds/src/backend
npm test -- kols.test.ts
npm test -- tasks.test.ts
```

## 文件结构

```
src/backend/
├── src/
│   ├── controllers/
│   │   ├── kols.controller.ts      # KOL 控制器
│   │   └── tasks.controller.ts     # 任务控制器
│   ├── services/
│   │   ├── kols.service.ts         # KOL 服务层
│   │   ├── tasks.service.ts        # 任务服务层
│   │   └── earnings.service.ts     # 收益服务层
│   ├── routes/
│   │   ├── kols.routes.ts          # KOL 路由
│   │   └── tasks.routes.ts         # 任务路由
│   └── types/
│       └── index.ts                # 类型定义
├── tests/
│   ├── kols.test.ts                # KOL 模块测试
│   └── tasks.test.ts               # 任务模块测试
└── prisma/
    └── schema.prisma               # 数据库模型
```

## 待办事项

- [ ] 实现真实的社交媒体平台 API 集成
- [ ] 添加数据同步定时任务
- [ ] 实现提现审核流程
- [ ] 添加通知功能 (订单状态变更通知)
- [ ] 实现 KOL 评级系统
- [ ] 添加数据统计和报表功能
