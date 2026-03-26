# AIAds KOL API

**版本**: 1.0.0
**最后更新**: 2026 年 3 月 24 日

---

## 目录

1. [KOL 账户](#1-kol-账户)
2. [账号绑定](#2-账号绑定)
3. [任务管理](#3-任务管理)
4. [收益管理](#4-收益管理)
5. [提现管理](#5-提现管理)

---

## 1. KOL 账户

### 1.1 获取 KOL 信息

获取当前登录 KOL 的详细信息。

#### 请求

```http
GET /v1/kols/me
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "platform_username": "@creator",
    "bio": "科技博主 | 产品评测",
    "category": "technology",
    "base_price": 50000,
    "currency": "USD",
    "tags": ["科技", "评测", "数码"],
    "verification_status": "approved",
    "verified_at": "2026-03-20T10:00:00Z",
    "total_earnings": 1000000,
    "available_balance": 200000,
    "pending_balance": 50000,
    "total_tasks": 30,
    "completed_tasks": 25,
    "avg_rating": 4.8,
    "created_at": "2026-03-01T10:00:00Z"
  }
}
```

### 1.2 更新 KOL 信息

更新 KOL 账户信息。

#### 请求

```http
PATCH /v1/kols/me
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bio` | string | ❌ | 个人简介 |
| `category` | string | ❌ | 内容类别 |
| `base_price` | integer | ❌ | 基础报价（分） |
| `tags` | array | ❌ | 标签列表 |

#### 请求示例

```json
{
  "bio": "科技博主 | 产品评测 | 商务合作请私信",
  "category": "technology",
  "base_price": 60000,
  "tags": ["科技", "评测", "数码", "AI"]
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "bio": "科技博主 | 产品评测 | 商务合作请私信",
    "base_price": 60000,
    "tags": ["科技", "评测", "数码", "AI"]
  }
}
```

### 1.3 KOL 认证

提交 KOL 认证申请。

#### 请求

```http
POST /v1/kols/me/verify
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `platform` | string | ✅ | 平台：`tiktok`/`youtube`/`instagram` |
| `platform_username` | string | ✅ | 平台账号名 |
| `authorization_code` | string | ✅ | 平台授权码 |

#### 请求示例

```json
{
  "platform": "tiktok",
  "platform_username": "@myaccount",
  "authorization_code": "auth_code_from_tiktok"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "kol_id": "550e8400-e29b-41d4-a716-446655440000",
    "platform": "tiktok",
    "platform_username": "@myaccount",
    "status": "pending",
    "message": "认证申请已提交，请等待审核"
  }
}
```

---

## 2. 账号绑定

### 2.1 获取绑定账号列表

获取已绑定的社交平台账号列表。

#### 请求

```http
GET /v1/kols/me/accounts
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440100",
        "platform": "tiktok",
        "platform_id": "123456789",
        "platform_username": "@myaccount",
        "platform_display_name": "My Account",
        "platform_avatar_url": "https://...",
        "followers": 15000,
        "following": 500,
        "total_videos": 100,
        "total_likes": 50000,
        "avg_views": 5000,
        "avg_likes": 500,
        "avg_comments": 50,
        "engagement_rate": 0.0333,
        "status": "active",
        "last_sync_at": "2026-03-24T09:00:00Z",
        "created_at": "2026-03-01T10:00:00Z"
      }
    ]
  }
}
```

### 2.2 绑定新账号

获取绑定账号的授权 URL。

#### 请求

```http
POST /v1/kols/me/accounts/bind
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `platform` | string | ✅ | 平台：`tiktok`/`youtube`/`instagram` |

#### 请求示例

```json
{
  "platform": "tiktok"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "authorization_url": "https://www.tiktok.com/auth/authorize?client_id=xxx&redirect_uri=xxx",
    "expires_in": 600
  },
  "message": "请在 10 分钟内完成授权"
}
```

### 2.3 处理授权回调

处理平台授权回调。

#### 请求

```http
POST /v1/kols/me/accounts/callback
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `platform` | string | ✅ | 平台名称 |
| `authorization_code` | string | ✅ | 授权码 |
| `state` | string | ✅ | 状态参数 |

#### 响应

```json
{
  "success": true,
  "data": {
    "account_id": "550e8400-e29b-41d4-a716-446655440100",
    "platform": "tiktok",
    "platform_username": "@myaccount",
    "status": "active"
  },
  "message": "账号绑定成功"
}
```

### 2.4 同步账号数据

手动同步账号数据。

#### 请求

```http
POST /v1/kols/me/accounts/:account_id/sync
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "account_id": "550e8400-e29b-41d4-a716-446655440100",
    "last_sync_at": "2026-03-24T10:00:00Z",
    "followers": 15500,
    "status": "success"
  },
  "message": "数据同步成功"
}
```

### 2.5 解绑账号

解绑社交平台账号。

#### 请求

```http
DELETE /v1/kols/me/accounts/:account_id
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "message": "账号解绑成功"
}
```

---

## 3. 任务管理

### 3.1 获取任务广场列表

获取可申请的任务列表。

#### 请求

```http
GET /v1/tasks?page=1&page_size=20
Authorization: Bearer <access_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | ❌ | 页码 |
| `page_size` | integer | ❌ | 每页数量 |
| `platform` | string | ❌ | 平台筛选 |
| `min_budget` | integer | ❌ | 最低预算 |
| `max_budget` | integer | ❌ | 最高预算 |
| `category` | string | ❌ | 类别筛选 |
| `keyword` | string | ❌ | 关键词搜索 |

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440200",
        "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
        "campaign_title": "春季新品推广",
        "advertiser": {
          "company_name": "某某科技有限公司",
          "industry": "电子产品"
        },
        "platform": "tiktok",
        "budget": 50000,
        "currency": "USD",
        "content_requirements": "需要展示产品外观和使用场景",
        "required_hashtags": ["#TechReview", "#NewProduct"],
        "deadline": "2026-04-15T23:59:59Z",
        "application_deadline": "2026-04-05T23:59:59Z",
        "requirements": {
          "min_followers": 5000,
          "max_followers": 50000,
          "min_engagement_rate": 0.02,
          "category": "technology"
        },
        "status": "open",
        "applicants_count": 10,
        "created_at": "2026-03-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 50,
      "total_pages": 3,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 3.2 获取任务详情

获取单个任务的详细信息。

#### 请求

```http
GET /v1/tasks/:task_id
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "campaign_title": "春季新品推广",
    "campaign_description": "推广我们的春季新品电子产品",
    "advertiser": {
      "company_name": "某某科技有限公司",
      "industry": "电子产品"
    },
    "platform": "tiktok",
    "budget": 50000,
    "bonus": 10000,
    "currency": "USD",
    "content_requirements": "需要展示产品外观和使用场景，视频时长 30-60 秒",
    "required_hashtags": ["#TechReview", "#NewProduct"],
    "forbidden_content": "不得提及竞品",
    "reference_video": "https://tiktok.com/@xxx/video/123",
    "deadline": "2026-04-15T23:59:59Z",
    "application_deadline": "2026-04-05T23:59:59Z",
    "requirements": {
      "min_followers": 5000,
      "max_followers": 50000,
      "min_engagement_rate": 0.02,
      "category": "technology",
      "countries": ["US", "UK", "CA"]
    },
    "status": "open",
    "applicants_count": 10,
    "selected_count": 0,
    "created_at": "2026-03-24T10:00:00Z"
  }
}
```

### 3.3 申请任务

申请参与任务。

#### 请求

```http
POST /v1/tasks/:task_id/apply
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `message` | string | ❌ | 申请说明 |
| `offer` | integer | ❌ | 期望报价（可在预算范围内） |
| `expected_publish_date` | string | ❌ | 预计发布日期 |
| `portfolio_urls` | array | ❌ | 作品集链接 |

#### 请求示例

```json
{
  "message": "我是科技类博主，有多次电子产品推广经验，期待合作！",
  "offer": 45000,
  "expected_publish_date": "2026-04-10T00:00:00Z",
  "portfolio_urls": [
    "https://tiktok.com/@myaccount/video/1",
    "https://tiktok.com/@myaccount/video/2"
  ]
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "application_id": "550e8400-e29b-41d4-a716-446655440300",
    "task_id": "550e8400-e29b-41d4-a716-446655440200",
    "status": "pending",
    "created_at": "2026-03-24T10:00:00Z"
  },
  "message": "申请已提交，等待广告主审核"
}
```

### 3.4 获取我的任务列表

获取 KOL 的任务列表。

#### 请求

```http
GET /v1/my-tasks?page=1&page_size=20&status=in_progress
Authorization: Bearer <access_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | ❌ | 页码 |
| `page_size` | integer | ❌ | 每页数量 |
| `status` | string | ❌ | 状态筛选 |

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440400",
        "task_id": "550e8400-e29b-41d4-a716-446655440200",
        "campaign_title": "春季新品推广",
        "advertiser": {
          "company_name": "某某科技有限公司"
        },
        "platform": "tiktok",
        "budget": 50000,
        "status": "in_progress",
        "deadline": "2026-04-15T23:59:59Z",
        "submitted_at": null,
        "created_at": "2026-03-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 5,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

### 3.5 获取任务详情

获取我的任务详情。

#### 请求

```http
GET /v1/my-tasks/:task_id
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440400",
    "task_id": "550e8400-e29b-41d4-a716-446655440200",
    "campaign_title": "春季新品推广",
    "advertiser": {
      "company_name": "某某科技有限公司",
      "contact_person": "李四",
      "contact_email": "contact@example.com"
    },
    "platform": "tiktok",
    "budget": 50000,
    "bonus": 10000,
    "status": "in_progress",
    "content_requirements": "需要展示产品外观和使用场景",
    "required_hashtags": ["#TechReview", "#NewProduct"],
    "deadline": "2026-04-15T23:59:59Z",
    "accepted_at": "2026-03-25T10:00:00Z",
    "submitted_at": null,
    "reviewed_at": null,
    "rejection_reason": null,
    "content_url": null,
    "content_description": null,
    "created_at": "2026-03-24T10:00:00Z"
  }
}
```

### 3.6 接受任务

接受广告主创建的任务订单。

#### 请求

```http
POST /v1/my-tasks/:task_id/accept
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "task_id": "550e8400-e29b-41d4-a716-446655440400",
    "status": "accepted",
    "accepted_at": "2026-03-24T10:00:00Z"
  },
  "message": "任务已接受"
}
```

### 3.7 拒绝任务

拒绝广告主创建的任务订单。

#### 请求

```http
POST /v1/my-tasks/:task_id/reject
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `reason` | string | ❌ | 拒绝原因 |

#### 请求示例

```json
{
  "reason": "时间安排冲突，无法在截止日期前完成"
}
```

#### 响应

```json
{
  "success": true,
  "message": "任务已拒绝"
}
```

### 3.8 提交作品

提交任务作品。

#### 请求

```http
POST /v1/my-tasks/:task_id/submit
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content_url` | string | ✅ | 视频链接 |
| `content_description` | string | ✅ | 内容描述 |
| `screenshot_url` | string | ✅ | 发布截图 URL |
| `remark` | string | ❌ | 备注 |

#### 请求示例

```json
{
  "content_url": "https://tiktok.com/@myaccount/video/123",
  "content_description": "春季新品电子产品评测视频，展示了产品外观和主要功能",
  "screenshot_url": "https://r2.aiads.com/screenshots/xxx.jpg",
  "remark": "已按要求添加标签 #TechReview #NewProduct"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "task_id": "550e8400-e29b-41d4-a716-446655440400",
    "status": "pending_review",
    "submitted_at": "2026-03-24T10:00:00Z"
  },
  "message": "作品已提交，等待广告主审核"
}
```

### 3.9 修改作品

修改被驳回的作品。

#### 请求

```http
POST /v1/my-tasks/:task_id/resubmit
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content_url` | string | ✅ | 新视频链接 |
| `content_description` | string | ✅ | 新内容描述 |
| `screenshot_url` | string | ✅ | 新发布截图 |
| `response_to_feedback` | string | ✅ | 对审核意见的回应 |

#### 响应

```json
{
  "success": true,
  "data": {
    "task_id": "550e8400-e29b-41d4-a716-446655440400",
    "status": "pending_review",
    "resubmitted_at": "2026-03-24T10:00:00Z"
  },
  "message": "作品已重新提交"
}
```

---

## 4. 收益管理

### 4.1 获取收益统计

获取 KOL 的收益统计信息。

#### 请求

```http
GET /v1/earnings/stats
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "available_balance": 200000,
    "pending_balance": 50000,
    "total_earnings": 1000000,
    "monthly_earnings": 150000,
    "currency": "USD"
  }
}
```

### 4.2 获取收益明细

获取收益明细列表。

#### 请求

```http
GET /v1/earnings?page=1&page_size=20
Authorization: Bearer <access_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | ❌ | 页码 |
| `page_size` | integer | ❌ | 每页数量 |
| `type` | string | ❌ | 类型筛选 |
| `status` | string | ❌ | 状态筛选 |
| `start_date` | string | ❌ | 开始日期 |
| `end_date` | string | ❌ | 结束日期 |

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440500",
        "task_id": "550e8400-e29b-41d4-a716-446655440400",
        "campaign_title": "春季新品推广",
        "amount": 50000,
        "type": "task_reward",
        "status": "settled",
        "settled_at": "2026-03-20T10:00:00Z",
        "created_at": "2026-03-19T10:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440501",
        "task_id": "550e8400-e29b-41d4-a716-446655440401",
        "campaign_title": "夏季促销",
        "amount": 30000,
        "type": "task_reward",
        "status": "pending",
        "settled_at": null,
        "created_at": "2026-03-22T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 30,
      "total_pages": 2,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 4.3 收益类型说明

| 类型 | 说明 |
|------|------|
| `task_reward` | 任务报酬 |
| `bonus` | 绩效奖金 |
| `referral_reward` | 推荐奖励 |
| `platform_reward` | 平台活动奖励 |

### 4.4 收益状态说明

| 状态 | 说明 | 可提现 |
|------|------|--------|
| `pending` | 待结算 | ❌ |
| `settled` | 已结算 | ✅ |
| `withdrawn` | 已提现 | ❌ |

---

## 5. 提现管理

### 5.1 获取提现账户

获取已绑定的提现账户。

#### 请求

```http
GET /v1/withdrawals/accounts
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440600",
        "type": "paypal",
        "account": "user@example.com",
        "is_default": true,
        "created_at": "2026-03-01T10:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440601",
        "type": "alipay",
        "account": "138****3800",
        "is_default": false,
        "created_at": "2026-03-05T10:00:00Z"
      }
    ]
  }
}
```

### 5.2 添加提现账户

添加新的提现账户。

#### 请求

```http
POST /v1/withdrawals/accounts
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 提现方式 |
| `account` | string | ✅ | 账号 |
| `name` | string | ✅ | 姓名（需与实名认证一致） |
| `is_default` | boolean | ❌ | 是否设为默认 |

#### type 选项

- `paypal` - PayPal
- `alipay` - 支付宝
- `wechat` - 微信支付
- `bank` - 银行转账

#### 请求示例

```json
{
  "type": "paypal",
  "account": "user@example.com",
  "name": "张三",
  "is_default": true
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440600",
    "type": "paypal",
    "account": "user@example.com",
    "is_default": true
  },
  "message": "提现账户添加成功"
}
```

### 5.3 申请提现

申请提现收益。

#### 请求

```http
POST /v1/withdrawals
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `amount` | integer | ✅ | 提现金额（分） |
| `account_id` | string | ✅ | 提现账户 ID |
| `remark` | string | ❌ | 备注 |

#### 请求示例

```json
{
  "amount": 100000,
  "account_id": "550e8400-e29b-41d4-a716-446655440600",
  "remark": "3 月收益提现"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "withdrawal_id": "550e8400-e29b-41d4-a716-446655440700",
    "amount": 100000,
    "fee": 2000,
    "net_amount": 98000,
    "status": "pending",
    "estimated_arrival": "2026-03-27T00:00:00Z",
    "created_at": "2026-03-24T10:00:00Z"
  },
  "message": "提现申请已提交，1-3 个工作日到账"
}
```

### 5.4 获取提现记录

获取历史提现记录。

#### 请求

```http
GET /v1/withdrawals?page=1&page_size=20
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440700",
        "amount": 100000,
        "fee": 2000,
        "net_amount": 98000,
        "status": "completed",
        "payment_method": "paypal",
        "payment_account": "user@example.com",
        "processed_at": "2026-03-25T10:00:00Z",
        "completed_at": "2026-03-26T10:00:00Z",
        "created_at": "2026-03-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 5,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

### 5.5 提现状态说明

| 状态 | 说明 |
|------|------|
| `pending` | 待审核 |
| `processing` | 处理中 |
| `completed` | 已完成 |
| `rejected` | 已拒绝 |

---

## 附录

### A. 任务状态说明

| 状态 | 说明 |
|------|------|
| `pending_accept` | 待接受 |
| `accepted` | 已接受 |
| `in_progress` | 进行中 |
| `pending_review` | 待审核 |
| `pending_revision` | 待修改 |
| `completed` | 已完成 |
| `cancelled` | 已取消 |

### B. 提现限额

| 方式 | 最低提现 | 最高提现 | 手续费 | 到账时间 |
|------|----------|----------|--------|----------|
| PayPal | $50 | $10,000 | 2% | 1-3 工作日 |
| 支付宝 | ¥100 | ¥50,000 | 0% | 即时 |
| 微信支付 | ¥100 | ¥50,000 | 0% | 即时 |
| 银行转账 | ¥500 | ¥100,000 | 1% | 3-5 工作日 |

---

**AIAds KOL API 文档结束**
