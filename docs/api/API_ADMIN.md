# AIAds 管理后台 API

**版本**: 1.0.0
**最后更新**: 2026 年 3 月 24 日

---

## 目录

1. [用户管理](#1-用户管理)
2. [KOL 管理](#2-kol-管理)
3. [活动管理](#3-活动管理)
4. [订单管理](#4-订单管理)
5. [财务管理](#5-财务管理)
6. [数据报表](#6-数据报表)
7. [系统设置](#7-系统设置)

---

## 1. 用户管理

### 1.1 获取用户列表

获取平台用户列表。

#### 请求

```http
GET /v1/admin/users?page=1&page_size=20
Authorization: Bearer <admin_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | ❌ | 页码 |
| `page_size` | integer | ❌ | 每页数量 |
| `role` | string | ❌ | 角色筛选：`advertiser`/`kol` |
| `status` | string | ❌ | 状态筛选 |
| `keyword` | string | ❌ | 关键词搜索 |
| `start_date` | string | ❌ | 注册开始日期 |
| `end_date` | string | ❌ | 注册结束日期 |

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "phone": "+86-13800138000",
        "nickname": "用户昵称",
        "avatar_url": "https://...",
        "role": "advertiser",
        "status": "active",
        "email_verified": true,
        "phone_verified": true,
        "last_login_at": "2026-03-24T09:00:00Z",
        "created_at": "2026-03-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1000,
      "total_pages": 50,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 1.2 获取用户详情

获取单个用户的详细信息。

#### 请求

```http
GET /v1/admin/users/:user_id
Authorization: Bearer <admin_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "phone": "+86-13800138000",
    "nickname": "用户昵称",
    "avatar_url": "https://...",
    "role": "advertiser",
    "status": "active",
    "email_verified": true,
    "phone_verified": true,
    "two_factor_enabled": false,
    "advertiser_profile": {
      "company_name": "某某科技有限公司",
      "verification_status": "approved",
      "wallet_balance": 1000000,
      "total_campaigns": 10,
      "total_spent": 5000000
    },
    "last_login_at": "2026-03-24T09:00:00Z",
    "last_login_ip": "192.168.1.1",
    "created_at": "2026-03-01T10:00:00Z"
  }
}
```

### 1.3 禁用用户

禁用违规用户账号。

#### 请求

```http
POST /v1/admin/users/:user_id/disable
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `reason` | string | ✅ | 禁用原因 |
| `duration` | integer | ❌ | 禁用时长（小时），不传则永久禁用 |

#### 请求示例

```json
{
  "reason": "发布违规内容",
  "duration": 168
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "disabled",
    "disabled_at": "2026-03-24T10:00:00Z",
    "disabled_until": "2026-03-31T10:00:00Z"
  },
  "message": "用户已禁用"
}
```

### 1.4 启用用户

启用被禁用的用户账号。

#### 请求

```http
POST /v1/admin/users/:user_id/enable
Authorization: Bearer <admin_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "enabled_at": "2026-03-24T10:00:00Z"
  },
  "message": "用户已启用"
}
```

---

## 2. KOL 管理

### 2.1 获取 KOL 列表

获取平台 KOL 列表。

#### 请求

```http
GET /v1/admin/kols?page=1&page_size=20
Authorization: Bearer <admin_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | ❌ | 页码 |
| `page_size` | integer | ❌ | 每页数量 |
| `platform` | string | ❌ | 平台筛选 |
| `verification_status` | string | ❌ | 认证状态 |
| `status` | string | ❌ | 账号状态 |
| `min_followers` | integer | ❌ | 最低粉丝量 |
| `keyword` | string | ❌ | 关键词搜索 |

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "platform_username": "@creator",
        "platform": "tiktok",
        "followers": 15000,
        "engagement_rate": 0.0333,
        "category": "technology",
        "verification_status": "approved",
        "status": "active",
        "total_tasks": 30,
        "completed_tasks": 28,
        "avg_rating": 4.8,
        "total_earnings": 1000000,
        "created_at": "2026-03-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 500,
      "total_pages": 25,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 2.2 获取 KOL 详情

获取单个 KOL 的详细信息。

#### 请求

```http
GET /v1/admin/kols/:kol_id
Authorization: Bearer <admin_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user": {
      "email": "creator@example.com",
      "phone": "+86-13800138000",
      "nickname": "创作者"
    },
    "platform": "tiktok",
    "platform_id": "123456789",
    "platform_username": "@creator",
    "platform_display_name": "Creator",
    "followers": 15000,
    "engagement_rate": 0.0333,
    "category": "technology",
    "bio": "科技博主 | 产品评测",
    "base_price": 50000,
    "tags": ["科技", "评测", "数码"],
    "verification_status": "approved",
    "verified_at": "2026-03-20T10:00:00Z",
    "verified_by": "admin_001",
    "status": "active",
    "total_tasks": 30,
    "completed_tasks": 28,
    "pending_tasks": 2,
    "avg_rating": 4.8,
    "total_earnings": 1000000,
    "available_balance": 200000,
    "fraud_score": 0.05,
    "risk_level": "low",
    "created_at": "2026-03-01T10:00:00Z"
  }
}
```

### 2.3 审核 KOL 认证

审核 KOL 认证申请。

#### 请求

```http
POST /v1/admin/kols/:kol_id/verify
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `approved` | boolean | ✅ | 是否通过 |
| `rejection_reason` | string | ❌ | 拒绝原因 |
| `remark` | string | ❌ | 审核备注 |

#### 请求示例（通过）

```json
{
  "approved": true,
  "remark": "资料真实有效，粉丝数据正常"
}
```

#### 请求示例（拒绝）

```json
{
  "approved": false,
  "rejection_reason": "粉丝数据异常，疑似刷粉"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "kol_id": "550e8400-e29b-41d4-a716-446655440000",
    "verification_status": "approved",
    "verified_at": "2026-03-24T10:00:00Z",
    "verified_by": "admin_001"
  },
  "message": "KOL 认证审核通过"
}
```

### 2.4 标记风险 KOL

标记可疑 KOL 进行重点监控。

#### 请求

```http
POST /v1/admin/kols/:kol_id/flag
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `risk_level` | string | ✅ | 风险等级：`low`/`medium`/`high` |
| `reason` | string | ✅ | 标记原因 |
| `action` | string | ❌ | 处理措施 |

#### 请求示例

```json
{
  "risk_level": "high",
  "reason": "检测到粉丝异常增长，24 小时内增长 10000 粉",
  "action": "限制接单，待进一步核查"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "kol_id": "550e8400-e29b-41d4-a716-446655440000",
    "risk_level": "high",
    "flagged_at": "2026-03-24T10:00:00Z",
    "flagged_by": "admin_001"
  },
  "message": "KOL 已标记为高风险"
}
```

---

## 3. 活动管理

### 3.1 获取活动列表

获取平台所有活动列表。

#### 请求

```http
GET /v1/admin/campaigns?page=1&page_size=20
Authorization: Bearer <admin_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | ❌ | 页码 |
| `page_size` | integer | ❌ | 每页数量 |
| `status` | string | ❌ | 状态筛选 |
| `advertiser_id` | string | ❌ | 广告主 ID 筛选 |
| `keyword` | string | ❌ | 关键词搜索 |
| `start_date` | string | ❌ | 开始日期 |
| `end_date` | string | ❌ | 结束日期 |

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "advertiser": {
          "id": "550e8400-e29b-41d4-a716-446655440100",
          "company_name": "某某科技有限公司"
        },
        "title": "春季新品推广",
        "budget": 1000000,
        "spent_amount": 300000,
        "status": "active",
        "total_kols": 10,
        "total_views": 50000,
        "created_at": "2026-03-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 200,
      "total_pages": 10,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 3.2 获取活动详情

获取单个活动的详细信息。

#### 请求

```http
GET /v1/admin/campaigns/:campaign_id
Authorization: Bearer <admin_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "advertiser": {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "company_name": "某某科技有限公司",
      "contact_person": "李四",
      "contact_email": "contact@example.com"
    },
    "title": "春季新品推广",
    "description": "推广我们的春季新品电子产品",
    "objective": "awareness",
    "budget": 1000000,
    "budget_type": "fixed",
    "spent_amount": 300000,
    "target_audience": {
      "age_range": "18-35",
      "gender": "all",
      "locations": ["US", "UK", "CA"],
      "interests": ["technology", "gadgets"]
    },
    "target_platforms": ["tiktok", "youtube"],
    "min_followers": 5000,
    "max_followers": 50000,
    "min_engagement_rate": 0.02,
    "content_requirements": "需要展示产品外观和功能",
    "required_hashtags": ["#TechReview", "#NewProduct"],
    "start_date": "2026-04-01T00:00:00Z",
    "end_date": "2026-04-30T23:59:59Z",
    "status": "active",
    "audit_status": "approved",
    "audited_at": "2026-03-24T12:00:00Z",
    "audited_by": "admin_001",
    "total_kols": 10,
    "selected_kols": 5,
    "published_videos": 3,
    "total_views": 50000,
    "total_likes": 5000,
    "total_comments": 500,
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-03-24T10:00:00Z"
  }
}
```

### 3.3 审核活动

审核广告主提交的活动。

#### 请求

```http
POST /v1/admin/campaigns/:campaign_id/audit
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `approved` | boolean | ✅ | 是否通过 |
| `rejection_reason` | string | ❌ | 拒绝原因 |
| `remark` | string | ❌ | 审核备注 |

#### 请求示例（通过）

```json
{
  "approved": true,
  "remark": "活动内容合规，预算充足"
}
```

#### 请求示例（拒绝）

```json
{
  "approved": false,
  "rejection_reason": "活动内容涉及敏感话题，需要修改"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "audit_status": "approved",
    "audited_at": "2026-03-24T10:00:00Z",
    "audited_by": "admin_001"
  },
  "message": "活动审核通过"
}
```

### 3.4 下架活动

强制下架违规活动。

#### 请求

```http
POST /v1/admin/campaigns/:campaign_id/takedown
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `reason` | string | ✅ | 下架原因 |
| `action` | string | ❌ | 后续处理措施 |

#### 请求示例

```json
{
  "reason": "活动内容违反广告法",
  "action": "冻结活动预算，退还广告主账户"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "cancelled",
    "takedown_at": "2026-03-24T10:00:00Z",
    "takedown_by": "admin_001"
  },
  "message": "活动已下架"
}
```

---

## 4. 订单管理

### 4.1 获取订单列表

获取平台所有订单列表。

#### 请求

```http
GET /v1/admin/orders?page=1&page_size=20
Authorization: Bearer <admin_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | ❌ | 页码 |
| `page_size` | integer | ❌ | 每页数量 |
| `status` | string | ❌ | 状态筛选 |
| `campaign_id` | string | ❌ | 活动 ID 筛选 |
| `advertiser_id` | string | ❌ | 广告主 ID 筛选 |
| `kol_id` | string | ❌ | KOL ID 筛选 |

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440200",
        "campaign": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "春季新品推广"
        },
        "advertiser": {
          "id": "550e8400-e29b-41d4-a716-446655440100",
          "company_name": "某某科技有限公司"
        },
        "kol": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "platform_username": "@creator"
        },
        "amount": 50000,
        "status": "completed",
        "content_url": "https://tiktok.com/@creator/video/123",
        "submitted_at": "2026-03-20T10:00:00Z",
        "completed_at": "2026-03-21T10:00:00Z",
        "created_at": "2026-03-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1000,
      "total_pages": 50,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 4.2 获取订单详情

获取单个订单的详细信息。

#### 请求

```http
GET /v1/admin/orders/:order_id
Authorization: Bearer <admin_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "campaign": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "春季新品推广"
    },
    "advertiser": {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "company_name": "某某科技有限公司"
    },
    "kol": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "platform_username": "@creator",
      "platform": "tiktok"
    },
    "amount": 50000,
    "status": "completed",
    "content_requirements": "需要展示产品外观和使用场景",
    "content_url": "https://tiktok.com/@creator/video/123",
    "content_description": "春季新品评测视频",
    "deadline": "2026-03-25T23:59:59Z",
    "submitted_at": "2026-03-20T10:00:00Z",
    "reviewed_at": "2026-03-21T10:00:00Z",
    "completed_at": "2026-03-21T10:00:00Z",
    "kol_rating": 5,
    "kol_comment": "合作愉快，广告主很专业",
    "created_at": "2026-03-15T10:00:00Z",
    "updated_at": "2026-03-21T10:00:00Z"
  }
}
```

### 4.5 仲裁订单

仲裁有争议的订单。

#### 请求

```http
POST /v1/admin/orders/:order_id/arbitrate
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `decision` | string | ✅ | 仲裁结果：`favor_advertiser`/`favor_kol`/`partial_refund` |
| `reason` | string | ✅ | 仲裁原因 |
| `refund_amount` | integer | ❌ | 退款金额（部分退款时需要） |

#### 请求示例

```json
{
  "decision": "favor_kol",
  "reason": "KOL 已按要求完成内容发布，广告主无正当理由拒绝"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "order_id": "550e8400-e29b-41d4-a716-446655440200",
    "arbitration_status": "completed",
    "decision": "favor_kol",
    "arbitrated_at": "2026-03-24T10:00:00Z",
    "arbitrated_by": "admin_001"
  },
  "message": "订单仲裁完成"
}
```

---

## 5. 财务管理

### 5.1 获取财务概览

获取平台财务概览数据。

#### 请求

```http
GET /v1/admin/finance/overview
Authorization: Bearer <admin_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `start_date` | string | ❌ | 开始日期 |
| `end_date` | string | ❌ | 结束日期 |

#### 响应

```json
{
  "success": true,
  "data": {
    "total_revenue": 10000000,
    "total_payout": 7000000,
    "platform_fee": 3000000,
    "pending_payout": 500000,
    "total_recharge": 15000000,
    "total_withdrawal": 7000000,
    "currency": "CNY",
    "period": {
      "start_date": "2026-03-01T00:00:00Z",
      "end_date": "2026-03-31T23:59:59Z"
    }
  }
}
```

### 5.2 获取充值记录

获取平台所有充值记录。

#### 请求

```http
GET /v1/admin/finance/recharges?page=1&page_size=20
Authorization: Bearer <admin_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "order_id": "550e8400-e29b-41d4-a716-446655440300",
        "advertiser": {
          "id": "550e8400-e29b-41d4-a716-446655440100",
          "company_name": "某某科技有限公司"
        },
        "amount": 1000000,
        "payment_method": "alipay",
        "status": "success",
        "paid_at": "2026-03-24T10:30:00Z",
        "created_at": "2026-03-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 500,
      "total_pages": 25,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 5.3 获取提现记录

获取平台所有提现记录。

#### 请求

```http
GET /v1/admin/finance/withdrawals?page=1&page_size=20
Authorization: Bearer <admin_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440700",
        "kol": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "platform_username": "@creator"
        },
        "amount": 100000,
        "fee": 2000,
        "net_amount": 98000,
        "payment_method": "paypal",
        "payment_account": "user@example.com",
        "status": "completed",
        "processed_at": "2026-03-25T10:00:00Z",
        "completed_at": "2026-03-26T10:00:00Z",
        "created_at": "2026-03-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 300,
      "total_pages": 15,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 5.4 审核提现

审核 KOL 提现申请。

#### 请求

```http
POST /v1/admin/finance/withdrawals/:withdrawal_id/audit
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `approved` | boolean | ✅ | 是否通过 |
| `rejection_reason` | string | ❌ | 拒绝原因 |

#### 请求示例

```json
{
  "approved": true
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "withdrawal_id": "550e8400-e29b-41d4-a716-446655440700",
    "status": "processing",
    "audited_at": "2026-03-24T10:00:00Z",
    "audited_by": "admin_001"
  },
  "message": "提现审核通过"
}
```

### 5.5 获取发票记录

获取平台发票记录。

#### 请求

```http
GET /v1/admin/finance/invoices?page=1&page_size=20
Authorization: Bearer <admin_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440400",
        "advertiser": {
          "id": "550e8400-e29b-41d4-a716-446655440100",
          "company_name": "某某科技有限公司"
        },
        "amount": 1000000,
        "invoice_type": "special",
        "title": "某某科技有限公司",
        "tax_id": "91440300MA5XXXXX",
        "status": "issued",
        "invoice_number": "440312345678",
        "issued_at": "2026-03-24T10:00:00Z",
        "created_at": "2026-03-22T10:00:00Z"
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

---

## 6. 数据报表

### 6.1 获取平台统计数据

获取平台整体统计数据。

#### 请求

```http
GET /v1/admin/stats
Authorization: Bearer <admin_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `start_date` | string | ❌ | 开始日期 |
| `end_date` | string | ❌ | 结束日期 |

#### 响应

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 5000,
      "advertisers": 1000,
      "kols": 4000,
      "new_today": 50,
      "new_this_week": 300,
      "new_this_month": 1000
    },
    "campaigns": {
      "total": 500,
      "active": 100,
      "completed": 350,
      "total_budget": 50000000,
      "total_spent": 35000000
    },
    "orders": {
      "total": 2000,
      "pending": 100,
      "in_progress": 200,
      "completed": 1600,
      "total_amount": 30000000
    },
    "finance": {
      "total_revenue": 10000000,
      "total_payout": 7000000,
      "platform_fee": 3000000,
      "pending_payout": 500000
    },
    "period": {
      "start_date": "2026-03-01T00:00:00Z",
      "end_date": "2026-03-31T23:59:59Z"
    }
  }
}
```

### 6.2 获取趋势数据

获取平台数据趋势。

#### 请求

```http
GET /v1/admin/stats/trend
Authorization: Bearer <admin_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `metric` | string | ✅ | 指标类型：`users`/`campaigns`/`revenue` |
| `granularity` | string | ❌ | 粒度：`day`/`week`/`month` |
| `start_date` | string | ❌ | 开始日期 |
| `end_date` | string | ❌ | 结束日期 |

#### 响应

```json
{
  "success": true,
  "data": {
    "metric": "revenue",
    "granularity": "day",
    "data": [
      {"date": "2026-03-01", "value": 100000},
      {"date": "2026-03-02", "value": 150000},
      {"date": "2026-03-03", "value": 200000}
    ]
  }
}
```

### 6.3 导出报表

导出平台数据报表。

#### 请求

```http
POST /v1/admin/reports/export
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `report_type` | string | ✅ | 报表类型 |
| `format` | string | ✅ | 导出格式 |
| `start_date` | string | ✅ | 开始日期 |
| `end_date` | string | ✅ | 结束日期 |
| `filters` | object | ❌ | 筛选条件 |

#### 响应

```json
{
  "success": true,
  "data": {
    "report_id": "550e8400-e29b-41d4-a716-446655440800",
    "status": "processing",
    "download_url": null,
    "expires_at": "2026-03-25T10:00:00Z"
  },
  "message": "报表生成中，请稍后查看"
}
```

---

## 7. 系统设置

### 7.1 获取系统配置

获取系统配置信息。

#### 请求

```http
GET /v1/admin/settings
Authorization: Bearer <admin_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "platform": {
      "name": "AIAds",
      "version": "1.0.0",
      "maintenance_mode": false,
      "registration_enabled": true
    },
    "fee": {
      "platform_fee_rate": 0.1,
      "min_campaign_budget": 10000,
      "min_withdrawal_amount": 5000
    },
    "audit": {
      "auto_audit_enabled": false,
      "audit_timeout_hours": 48
    }
  }
}
```

### 7.2 更新系统配置

更新系统配置。

#### 请求

```http
PATCH /v1/admin/settings
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `platform.maintenance_mode` | boolean | ❌ | 维护模式 |
| `platform.registration_enabled` | boolean | ❌ | 开放注册 |
| `fee.platform_fee_rate` | number | ❌ | 平台费率 |
| `fee.min_campaign_budget` | integer | ❌ | 最低活动预算 |
| `fee.min_withdrawal_amount` | integer | ❌ | 最低提现金额 |

#### 请求示例

```json
{
  "fee": {
    "platform_fee_rate": 0.15,
    "min_campaign_budget": 5000
  }
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "fee": {
      "platform_fee_rate": 0.15,
      "min_campaign_budget": 5000,
      "min_withdrawal_amount": 5000
    }
  },
  "message": "配置更新成功"
}
```

### 7.3 获取操作日志

获取管理员操作日志。

#### 请求

```http
GET /v1/admin/audit-logs?page=1&page_size=20
Authorization: Bearer <admin_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | ❌ | 页码 |
| `page_size` | integer | ❌ | 每页数量 |
| `admin_id` | string | ❌ | 管理员 ID |
| `action` | string | ❌ | 操作类型 |
| `start_date` | string | ❌ | 开始日期 |
| `end_date` | string | ❌ | 结束日期 |

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440900",
        "admin_id": "admin_001",
        "admin_name": "管理员 A",
        "action": "campaign_audit",
        "resource_type": "campaign",
        "resource_id": "550e8400-e29b-41d4-a716-446655440000",
        "result": "approved",
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "created_at": "2026-03-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1000,
      "total_pages": 50,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

## 附录

### A. 管理员角色

| 角色 | 权限 |
|------|------|
| `super_admin` | 所有权限 |
| `content_admin` | 内容审核、活动管理 |
| `user_admin` | 用户管理、KOL 审核 |
| `finance_admin` | 财务管理、提现审核 |
| `support_admin` | 客服支持、订单仲裁 |

### B. 操作日志类型

| 类型 | 说明 |
|------|------|
| `user_disable` | 禁用用户 |
| `kol_verify` | KOL 审核 |
| `campaign_audit` | 活动审核 |
| `campaign_takedown` | 活动下架 |
| `order_arbitrate` | 订单仲裁 |
| `withdrawal_audit` | 提现审核 |
| `setting_update` | 配置更新 |

---

**AIAds 管理后台 API 文档结束**
