# AIAds 管理后台 - 剩余模块 API 规范

**文档版本**: 1.0
**创建日期**: 2026 年 3 月 25 日
**作者**: AIAds 架构团队
**保密级别**: 内部机密
**状态**: 已审批

---

## 目录

1. [API 设计原则](#1-api-设计原则)
2. [广告主管理 API](#2-广告主管理-api)
3. [活动管理 API](#3-活动管理-api)
4. [订单管理 API](#4-订单管理-api)
5. [系统设置 API](#5-系统设置-api)
6. [错误码说明](#6-错误码说明)

---

## 1. API 设计原则

### 1.1 RESTful 规范

所有 API 遵循 RESTful 设计原则：

- **资源导向**: 使用名词表示资源，如 `/advertisers`, `/campaigns`
- **HTTP 方法**: 
  - `GET` - 获取资源
  - `POST` - 创建资源
  - `PUT` - 更新资源（全量）
  - `PATCH` - 更新资源（部分）
  - `DELETE` - 删除资源
- **状态码**: 使用标准 HTTP 状态码
- **版本控制**: URL 中包含版本号 `/api/v1/admin/`

### 1.2 认证机制

管理后台使用独立的 JWT 认证系统：

**请求头格式**:
```
Authorization: Bearer <admin_access_token>
```

**Token 类型**:
- `access_token`: 访问令牌，有效期 8 小时
- `refresh_token`: 刷新令牌，有效期 7 天

### 1.3 错误处理

**统一错误响应格式**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述信息",
    "details": [
      {
        "field": "字段名",
        "message": "字段错误信息"
      }
    ]
  },
  "request_id": "req_123456789"
}
```

### 1.4 分页规范

**统一分页响应格式**:
```json
{
  "success": true,
  "data": {
    "items": [...],
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

**分页参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码（从 1 开始） |
| `page_size` | integer | 20 | 每页数量（最大 100） |

### 1.5 响应格式

**成功响应**:
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**创建成功** (201):
```json
{
  "success": true,
  "data": {
    "id": "resource_uuid",
    ...
  },
  "message": "创建成功"
}
```

**删除成功** (204):
```
HTTP 204 No Content
```

---

## 2. 广告主管理 API

### 2.1 广告主列表

**接口**: `GET /api/v1/admin/advertisers`

**描述**: 获取广告主列表，支持分页、搜索、筛选

**权限**: `advertiser:view`

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 20 | 每页数量（最大 100） |
| `keyword` | string | 否 | - | 搜索关键词（公司名称/联系人/邮箱） |
| `verification_status` | string | 否 | - | 认证状态：pending/approved/rejected |
| `industry` | string | 否 | - | 行业类别 |
| `min_balance` | number | 否 | - | 最小余额 |
| `max_balance` | number | 否 | - | 最大余额 |
| `created_after` | string | 否 | - | 注册开始日期（ISO 8601） |
| `created_before` | string | 否 | - | 注册结束日期（ISO 8601） |
| `sort` | string | 否 | created_at | 排序字段 |
| `order` | string | 否 | desc | 排序方向：asc/desc |

**请求示例**:
```
GET /api/v1/admin/advertisers?page=1&page_size=20&verification_status=approved&sort=wallet_balance&order=desc
Authorization: Bearer <token>
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "user_uuid",
        "company_name": "某某科技有限公司",
        "contact_person": "张三",
        "contact_email": "zhang@example.com",
        "industry": "互联网科技",
        "verification_status": "approved",
        "wallet_balance": 50000.00,
        "frozen_balance": 5000.00,
        "active_campaigns": 3,
        "created_at": "2026-03-20T10:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "user_id": "user_uuid_2",
        "company_name": "某某文化有限公司",
        "contact_person": "李四",
        "contact_email": "li@example.com",
        "industry": "文化传媒",
        "verification_status": "pending",
        "wallet_balance": 30000.00,
        "frozen_balance": 0.00,
        "active_campaigns": 2,
        "created_at": "2026-03-19T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 150,
      "total_pages": 8,
      "has_next": true,
      "has_prev": false
    }
  },
  "message": null
}
```

**错误响应** (403 Forbidden):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "没有权限执行此操作"
  },
  "request_id": "req_123456789"
}
```

---

### 2.2 广告主详情

**接口**: `GET /api/v1/admin/advertisers/:id`

**描述**: 获取广告主完整信息

**权限**: `advertiser:view`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 广告主 ID (UUID) |

**请求示例**:
```
GET /api/v1/admin/advertisers/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user_uuid",
    "company_name": "某某科技有限公司",
    "company_name_en": "XX Technology Co., Ltd.",
    "business_license": "91440300MA5XXXXX",
    "business_license_url": "https://cdn.aiads.com/licenses/xxx.jpg",
    "legal_representative": "张三",
    "industry": "互联网科技",
    "company_size": "50-100 人",
    "website": "https://example.com",
    "contact_person": "张三",
    "contact_phone": "+86-138****1234",
    "contact_email": "zhang@example.com",
    "contact_address": "深圳市南山区 XX 大厦 XX 层",
    "verification_status": "approved",
    "verified_at": "2026-03-20T14:30:00Z",
    "verified_by": "admin_uuid",
    "wallet_balance": 50000.00,
    "frozen_balance": 5000.00,
    "total_recharged": 200000.00,
    "total_spent": 150000.00,
    "statistics": {
      "total_campaigns": 25,
      "active_campaigns": 3,
      "total_orders": 18,
      "completed_orders": 15
    },
    "created_at": "2026-03-20T10:00:00Z",
    "updated_at": "2026-03-25T10:00:00Z"
  }
}
```

**错误响应** (404 Not Found):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "广告主不存在"
  },
  "request_id": "req_123456789"
}
```

---

### 2.3 广告主审核

**接口**: `PUT /api/v1/admin/advertisers/:id/verify`

**描述**: 审核广告主企业认证

**权限**: `advertiser:verify`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 广告主 ID (UUID) |

**请求参数**:
```json
{
  "action": "approve",
  "note": "资料真实有效，通过审核",
  "rejection_reason": "营业执照不清晰"
}
```

**请求参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `action` | string | 是 | 操作：approve/reject |
| `note` | string | 否 | 审核备注 |
| `rejection_reason` | string | 条件必填 | 拒绝原因（拒绝时必填） |

**请求示例**:
```
PUT /api/v1/admin/advertisers/550e8400-e29b-41d4-a716-446655440000/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "approve",
  "note": "资料真实有效，通过审核"
}
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "verification_status": "approved",
    "verified_at": "2026-03-25T10:00:00Z",
    "verified_by": "admin_uuid"
  },
  "message": "广告主审核通过"
}
```

**错误响应** (422 Unprocessable Entity):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      {
        "field": "rejection_reason",
        "message": "拒绝操作时必须填写拒绝原因"
      }
    ]
  },
  "request_id": "req_123456789"
}
```

---

### 2.4 充值记录

**接口**: `GET /api/v1/admin/advertisers/:id/recharges`

**描述**: 获取广告主充值历史

**权限**: `finance:view`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 广告主 ID (UUID) |

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 20 | 每页数量 |
| `status` | string | 否 | - | 状态：pending/completed/failed |
| `payment_method` | string | 否 | - | 支付方式 |
| `created_after` | string | 否 | - | 开始日期 |
| `created_before` | string | 否 | - | 结束日期 |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "txn_uuid",
        "transaction_no": "TXN-20260325-00001",
        "amount": 10000.00,
        "payment_method": "alipay",
        "status": "completed",
        "balance_before": 40000.00,
        "balance_after": 50000.00,
        "completed_at": "2026-03-25T10:30:00Z",
        "created_at": "2026-03-25T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 50,
      "total_pages": 3
    }
  }
}
```

---

### 2.5 消费记录

**接口**: `GET /api/v1/admin/advertisers/:id/consumptions`

**描述**: 获取广告主消费历史

**权限**: `finance:view`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 广告主 ID (UUID) |

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 20 | 每页数量 |
| `type` | string | 否 | - | 类型：order_payment/campaign_boost/service_fee |
| `status` | string | 否 | - | 状态 |
| `created_after` | string | 否 | - | 开始日期 |
| `created_before` | string | 否 | - | 结束日期 |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "txn_uuid",
        "transaction_no": "TXN-20260324-00002",
        "order_id": "order_uuid",
        "campaign_id": "campaign_uuid",
        "amount": 5000.00,
        "type": "order_payment",
        "status": "completed",
        "balance_before": 55000.00,
        "balance_after": 50000.00,
        "description": "订单支付：ORD-20260324-00001",
        "completed_at": "2026-03-24T14:30:00Z",
        "created_at": "2026-03-24T14:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 30,
      "total_pages": 2
    }
  }
}
```

---

### 2.6 余额调整

**接口**: `PUT /api/v1/admin/advertisers/:id/balance`

**描述**: 调整广告主余额

**权限**: `finance:adjustment`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 广告主 ID (UUID) |

**请求参数**:
```json
{
  "amount": 1000.00,
  "type": "manual",
  "reason": "平台活动赠送",
  "notify_advertiser": true
}
```

**请求参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `amount` | number | 是 | 调整金额（正数增加，负数减少） |
| `type` | string | 是 | 类型：manual/refund/compensation/penalty |
| `reason` | string | 是 | 调整原因 |
| `notify_advertiser` | boolean | 否 | 是否通知广告主（默认 true） |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "adj_uuid",
    "advertiser_id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 1000.00,
    "type": "manual",
    "before_balance": 50000.00,
    "after_balance": 51000.00,
    "admin_id": "admin_uuid",
    "created_at": "2026-03-25T10:00:00Z"
  },
  "message": "余额调整成功"
}
```

---

### 2.7 冻结账户

**接口**: `PUT /api/v1/admin/advertisers/:id/freeze`

**描述**: 冻结广告主账户

**权限**: `advertiser:freeze`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 广告主 ID (UUID) |

**请求参数**:
```json
{
  "reason": "涉嫌违规操作，调查中",
  "freeze_amount": 5000.00
}
```

**请求参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `reason` | string | 是 | 冻结原因 |
| `freeze_amount` | number | 否 | 冻结金额（不填则冻结全部） |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "frozen_balance": 5000.00,
    "frozen_at": "2026-03-25T10:00:00Z",
    "frozen_reason": "涉嫌违规操作，调查中"
  },
  "message": "账户已冻结"
}
```

---

### 2.8 解冻账户

**接口**: `PUT /api/v1/admin/advertisers/:id/unfreeze`

**描述**: 解冻广告主账户

**权限**: `advertiser:unfreeze`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 广告主 ID (UUID) |

**请求参数**:
```json
{
  "reason": "调查完成，解除冻结",
  "unfreeze_amount": 5000.00
}
```

**请求参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `reason` | string | 是 | 解冻原因 |
| `unfreeze_amount` | number | 否 | 解冻金额（不填则解冻全部） |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "frozen_balance": 0.00,
    "unfrozen_at": "2026-03-25T10:00:00Z"
  },
  "message": "账户已解冻"
}
```

---

## 3. 活动管理 API

### 3.1 活动列表

**接口**: `GET /api/v1/admin/campaigns`

**描述**: 获取活动列表

**权限**: `campaign:view`

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 20 | 每页数量 |
| `keyword` | string | 否 | - | 搜索关键词 |
| `status` | string | 否 | - | 活动状态 |
| `advertiser_id` | string | 否 | - | 广告主 ID |
| `industry` | string | 否 | - | 行业类别 |
| `start_date_after` | string | 否 | - | 开始日期 |
| `start_date_before` | string | 否 | - | 结束日期 |
| `min_budget` | number | 否 | - | 最小预算 |
| `max_budget` | number | 否 | - | 最大预算 |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "campaign_uuid",
        "advertiser_id": "advertiser_uuid",
        "advertiser_name": "某某科技有限公司",
        "title": "夏季促销活动",
        "description": "针对夏季产品的促销活动",
        "budget": 10000.00,
        "spent_amount": 6500.00,
        "status": "active",
        "objective": "awareness",
        "start_date": "2026-03-25",
        "end_date": "2026-04-25",
        "total_orders": 15,
        "completed_orders": 10,
        "total_impressions": 250000,
        "total_clicks": 12500,
        "performance_score": "excellent",
        "created_at": "2026-03-20T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 856,
      "total_pages": 43
    }
  }
}
```

---

### 3.2 活动详情

**接口**: `GET /api/v1/admin/campaigns/:id`

**描述**: 获取活动详情

**权限**: `campaign:view`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 活动 ID (UUID) |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "campaign_uuid",
    "advertiser_id": "advertiser_uuid",
    "advertiser_name": "某某科技有限公司",
    "title": "夏季促销活动",
    "description": "针对夏季产品的促销活动，目标提升品牌知名度",
    "objective": "awareness",
    "budget": 10000.00,
    "budget_type": "fixed",
    "spent_amount": 6500.00,
    "pricing_model": "cpm",
    "target_audience": {
      "age_range": "18-35",
      "gender": ["female"],
      "locations": ["CN", "US"],
      "interests": ["beauty", "fashion"]
    },
    "target_platforms": ["tiktok", "instagram"],
    "min_followers": 5000,
    "max_followers": 50000,
    "min_engagement_rate": 0.03,
    "required_categories": ["beauty", "lifestyle"],
    "target_countries": ["CN", "US", "SG"],
    "start_date": "2026-03-25",
    "end_date": "2026-04-25",
    "status": "active",
    "reviewed_by": "admin_uuid",
    "reviewed_at": "2026-03-20T14:30:00Z",
    "review_notes": "活动内容符合规范",
    "statistics": {
      "total_kols": 20,
      "applied_kols": 35,
      "selected_kols": 20,
      "published_videos": 15,
      "total_impressions": 250000,
      "total_clicks": 12500,
      "total_likes": 8000,
      "total_comments": 500,
      "total_shares": 300,
      "estimated_reach": 300000,
      "actual_reach": 280000
    },
    "created_at": "2026-03-20T10:00:00Z",
    "updated_at": "2026-03-25T10:00:00Z"
  }
}
```

---

### 3.3 活动审核

**接口**: `PUT /api/v1/admin/campaigns/:id/verify`

**描述**: 审核活动

**权限**: `campaign:review`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 活动 ID (UUID) |

**请求参数**:
```json
{
  "action": "approve",
  "note": "活动内容符合规范，通过审核",
  "rejection_reason": "预算过低，无法达到预期效果"
}
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "campaign_uuid",
    "status": "approved",
    "reviewed_at": "2026-03-25T10:00:00Z",
    "reviewed_by": "admin_uuid"
  },
  "message": "活动审核通过"
}
```

---

### 3.4 活动状态

**接口**: `PUT /api/v1/admin/campaigns/:id/status`

**描述**: 更新活动状态

**权限**: `campaign:manage`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 活动 ID (UUID) |

**请求参数**:
```json
{
  "status": "paused",
  "reason": "广告主申请暂停"
}
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "campaign_uuid",
    "status": "paused",
    "updated_at": "2026-03-25T10:00:00Z"
  },
  "message": "活动状态已更新"
}
```

---

### 3.5 活动统计

**接口**: `GET /api/v1/admin/campaigns/:id/stats`

**描述**: 获取活动统计数据

**权限**: `campaign:view`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 活动 ID (UUID) |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "campaign_id": "campaign_uuid",
    "overview": {
      "total_impressions": 250000,
      "total_clicks": 12500,
      "ctr": 0.05,
      "total_engagements": 8800,
      "engagement_rate": 0.0352,
      "total_conversions": 250,
      "conversion_rate": 0.02,
      "total_cost": 6500.00,
      "total_revenue": 25000.00,
      "roi": 3.85
    },
    "trends": {
      "impressions": [
        {"date": "2026-03-25", "value": 50000},
        {"date": "2026-03-26", "value": 55000}
      ],
      "clicks": [
        {"date": "2026-03-25", "value": 2500},
        {"date": "2026-03-26", "value": 2800}
      ]
    },
    "kol_performance": [
      {
        "kol_id": "kol_uuid",
        "kol_name": "@john_doe",
        "impressions": 50000,
        "clicks": 3000,
        "engagements": 2000,
        "conversions": 50,
        "performance_score": 95
      }
    ]
  }
}
```

---

### 3.6 异常活动

**接口**: `GET /api/v1/admin/campaigns/abnormal`

**描述**: 获取异常活动列表

**权限**: `campaign:view`

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 20 | 每页数量 |
| `severity` | string | 否 | - | 严重程度：low/medium/high/critical |
| `status` | string | 否 | - | 处理状态：pending/investigating/confirmed/false_positive/resolved |
| `type` | string | 否 | - | 异常类型 |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "anomaly_uuid",
        "campaign_id": "campaign_uuid",
        "kol_id": "kol_uuid",
        "order_id": "order_uuid",
        "anomaly_type": "fake_impressions",
        "description": "检测到异常曝光数据，偏离正常值 300%",
        "severity": "high",
        "expected_value": 10000,
        "actual_value": 50000,
        "deviation_rate": 4.0,
        "detected_at": "2026-03-25T10:00:00Z",
        "detection_method": "ai_model",
        "status": "pending",
        "handled_by": null,
        "handled_at": null
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 15,
      "total_pages": 1
    }
  }
}
```

---

## 4. 订单管理 API

### 4.1 订单列表

**接口**: `GET /api/v1/admin/orders`

**描述**: 获取订单列表

**权限**: `order:view`

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 20 | 每页数量 |
| `keyword` | string | 否 | - | 搜索关键词（订单号/活动名称/KOL） |
| `status` | string | 否 | - | 订单状态 |
| `campaign_id` | string | 否 | - | 活动 ID |
| `advertiser_id` | string | 否 | - | 广告主 ID |
| `kol_id` | string | 否 | - | KOL ID |
| `platform` | string | 否 | - | 平台 |
| `amount_min` | number | 否 | - | 最小金额 |
| `amount_max` | number | 否 | - | 最大金额 |
| `created_after` | string | 否 | - | 开始日期 |
| `created_before` | string | 否 | - | 结束日期 |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "order_uuid",
        "order_no": "ORD-20260325-00001",
        "campaign_id": "campaign_uuid",
        "campaign_name": "夏季促销活动",
        "advertiser_id": "advertiser_uuid",
        "advertiser_name": "某某科技有限公司",
        "kol_id": "kol_uuid",
        "kol_name": "@john_doe",
        "kol_platform": "tiktok",
        "amount": 500.00,
        "status": "in_progress",
        "created_at": "2026-03-25T10:30:00Z",
        "updated_at": "2026-03-25T11:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 2458,
      "total_pages": 123
    }
  }
}
```

---

### 4.2 订单详情

**接口**: `GET /api/v1/admin/orders/:id`

**描述**: 获取订单详情

**权限**: `order:view`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 订单 ID (UUID) |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "order_uuid",
    "order_no": "ORD-20260325-00001",
    "campaign_id": "campaign_uuid",
    "campaign_name": "夏季促销活动",
    "advertiser_id": "advertiser_uuid",
    "advertiser_name": "某某科技有限公司",
    "kol_id": "kol_uuid",
    "kol_name": "@john_doe",
    "kol_platform": "tiktok",
    "title": "夏季产品推广视频",
    "description": "制作一条 30-60 秒的夏季产品推广视频",
    "deliverables": {
      "content_type": "video",
      "quantity": 1,
      "requirements": "视频时长 30-60 秒，展示产品特点和优势"
    },
    "amount": 500.00,
    "platform_fee": 50.00,
    "platform_fee_rate": 0.10,
    "kol_earnings": 450.00,
    "status": "in_progress",
    "accepted_at": "2026-03-25T11:00:00Z",
    "submitted_at": null,
    "reviewed_at": null,
    "approved_at": null,
    "published_at": null,
    "completed_at": null,
    "advertiser": {
      "id": "advertiser_uuid",
      "company_name": "某某科技有限公司",
      "contact_person": "张三",
      "contact_email": "zhang@example.com"
    },
    "kol": {
      "id": "kol_uuid",
      "platform_username": "@john_doe",
      "platform_display_name": "John Doe",
      "followers": 25300,
      "engagement_rate": 0.045,
      "contact_email": "john@example.com"
    },
    "created_at": "2026-03-25T10:30:00Z",
    "updated_at": "2026-03-25T11:00:00Z"
  }
}
```

---

### 4.3 订单状态

**接口**: `PUT /api/v1/admin/orders/:id/status`

**描述**: 更新订单状态

**权限**: `order:manage`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 订单 ID (UUID) |

**请求参数**:
```json
{
  "status": "completed",
  "reason": "广告主确认收货"
}
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "order_uuid",
    "status": "completed",
    "completed_at": "2026-03-25T10:00:00Z"
  },
  "message": "订单状态已更新"
}
```

---

### 4.4 纠纷订单

**接口**: `GET /api/v1/admin/orders/disputes`

**描述**: 获取纠纷订单列表

**权限**: `order:view`

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 20 | 每页数量 |
| `status` | string | 否 | - | 处理状态：open/under_review/resolved/closed |
| `priority` | string | 否 | - | 优先级：low/medium/high/critical |
| `dispute_type` | string | 否 | - | 纠纷类型 |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "dispute_uuid",
        "order_id": "order_uuid",
        "order_no": "ORD-20260325-00001",
        "raised_by": "advertiser",
        "dispute_type": "quality",
        "reason": "内容质量不符合要求",
        "status": "open",
        "priority": "high",
        "assigned_to": "admin_uuid",
        "created_at": "2026-03-25T15:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

---

### 4.5 订单纠纷处理

**接口**: `PUT /api/v1/admin/orders/:id/dispute`

**描述**: 处理订单纠纷

**权限**: `order:manage`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 订单 ID (UUID) |

**请求参数**:
```json
{
  "resolution": "partial_refund",
  "refund_amount": 250.00,
  "ruling": "split",
  "resolution_notes": "经仲裁，双方各承担 50% 责任"
}
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "dispute_uuid",
    "order_id": "order_uuid",
    "status": "resolved",
    "ruling": "split",
    "refund_amount": 250.00,
    "resolved_at": "2026-03-25T16:00:00Z",
    "resolved_by": "admin_uuid"
  },
  "message": "纠纷已处理"
}
```

---

### 4.6 订单导出

**接口**: `POST /api/v1/admin/orders/export`

**描述**: 导出订单数据

**权限**: `order:export`

**请求参数**:
```json
{
  "format": "excel",
  "filters": {
    "status": ["completed"],
    "created_after": "2026-03-01",
    "created_before": "2026-03-31"
  },
  "fields": ["order_no", "campaign_name", "advertiser_name", "kol_name", "amount", "status", "created_at"]
}
```

**响应示例** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "export_id": "export_uuid",
    "status": "processing",
    "download_url": null,
    "expires_at": null,
    "created_at": "2026-03-25T10:00:00Z"
  },
  "message": "导出任务已创建，完成后将通知您"
}
```

---

## 5. 系统设置 API

### 5.1 系统配置

**接口**: `GET /api/v1/admin/settings/system`

**描述**: 获取系统配置

**权限**: `settings:view`

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "basic": {
      "platform_name": "AIAds 影响者营销平台",
      "platform_logo": "https://...",
      "platform_url": "https://aiads.com",
      "customer_service_email": "support@aiads.com",
      "customer_service_phone": "400-XXX-XXXX",
      "timezone": "Asia/Shanghai",
      "default_language": "zh-CN"
    },
    "email": {
      "smtp_server": "smtp.example.com",
      "smtp_port": 587,
      "encryption": "TLS",
      "sender_email": "noreply@aiads.com",
      "sender_name": "AIAds 平台"
    },
    "sms": {
      "provider": "aliyun",
      "signature": "AIAds 平台",
      "template_id": "SMS_123456789"
    },
    "storage": {
      "provider": "aws_s3",
      "bucket": "aiads-assets",
      "region": "ap-southeast-1",
      "cdn_domain": "https://cdn.aiads.com"
    },
    "security": {
      "password_min_length": 8,
      "password_complexity": {
        "require_uppercase": true,
        "require_lowercase": true,
        "require_number": true,
        "require_special": true
      },
      "login_lockout": {
        "max_attempts": 5,
        "lockout_duration_minutes": 30
      },
      "session_timeout_minutes": 120,
      "require_mfa": false
    }
  }
}
```

---

### 5.2 更新系统配置

**接口**: `PUT /api/v1/admin/settings/system`

**描述**: 更新系统配置

**权限**: `settings:edit`

**请求参数**:
```json
{
  "basic": {
    "platform_name": "AIAds 影响者营销平台",
    "timezone": "Asia/Shanghai"
  },
  "security": {
    "password_min_length": 10
  }
}
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "message": "系统配置已更新"
}
```

---

### 5.3 管理员列表

**接口**: `GET /api/v1/admin/settings/admins`

**描述**: 获取管理员列表

**权限**: `admin:manage`

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "admin_uuid",
        "email": "admin@aiads.com",
        "name": "系统管理员",
        "avatar_url": "https://...",
        "role": {
          "id": "role_uuid",
          "name": "Super Admin"
        },
        "status": "active",
        "last_login_at": "2026-03-25T10:00:00Z",
        "last_login_ip": "192.168.1.1",
        "created_at": "2026-03-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 10,
      "total_pages": 1
    }
  }
}
```

---

### 5.4 创建管理员

**接口**: `POST /api/v1/admin/settings/admins`

**描述**: 创建管理员

**权限**: `admin:manage`

**请求参数**:
```json
{
  "email": "newadmin@aiads.com",
  "password": "SecurePass123!",
  "name": "新管理员",
  "role_id": "role_uuid"
}
```

**响应示例** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "new_admin_uuid",
    "email": "newadmin@aiads.com",
    "name": "新管理员",
    "role_id": "role_uuid",
    "status": "active",
    "created_at": "2026-03-25T10:00:00Z"
  },
  "message": "管理员创建成功"
}
```

---

### 5.5 更新管理员

**接口**: `PUT /api/v1/admin/settings/admins/:id`

**描述**: 更新管理员信息

**权限**: `admin:manage`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 管理员 ID (UUID) |

**请求参数**:
```json
{
  "name": "更新后的姓名",
  "role_id": "new_role_uuid",
  "status": "active"
}
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "admin_uuid",
    "name": "更新后的姓名",
    "role_id": "new_role_uuid",
    "updated_at": "2026-03-25T10:00:00Z"
  },
  "message": "管理员信息已更新"
}
```

---

### 5.6 删除管理员

**接口**: `DELETE /api/v1/admin/settings/admins/:id`

**描述**: 删除管理员

**权限**: `admin:manage`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 管理员 ID (UUID) |

**响应示例** (200 OK):
```json
{
  "success": true,
  "message": "管理员已删除"
}
```

---

### 5.7 角色列表

**接口**: `GET /api/v1/admin/settings/roles`

**描述**: 获取角色列表

**权限**: `role:manage`

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "role_uuid",
        "name": "Super Admin",
        "description": "超级管理员",
        "permissions": ["*"],
        "is_system": true,
        "created_at": "2026-03-01T10:00:00Z"
      }
    ]
  }
}
```

---

### 5.8 创建角色

**接口**: `POST /api/v1/admin/settings/roles`

**描述**: 创建角色

**权限**: `role:manage`

**请求参数**:
```json
{
  "name": "Custom Role",
  "description": "自定义角色",
  "permissions": ["dashboard:view", "user:view", "order:view"]
}
```

**响应示例** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "new_role_uuid",
    "name": "Custom Role",
    "description": "自定义角色",
    "permissions": ["dashboard:view", "user:view", "order:view"],
    "is_system": false,
    "created_at": "2026-03-25T10:00:00Z"
  },
  "message": "角色创建成功"
}
```

---

### 5.9 更新角色

**接口**: `PUT /api/v1/admin/settings/roles/:id`

**描述**: 更新角色

**权限**: `role:manage`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 角色 ID (UUID) |

**请求参数**:
```json
{
  "name": "Updated Role",
  "description": "更新描述",
  "permissions": ["dashboard:view", "user:view"]
}
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "role_uuid",
    "name": "Updated Role",
    "permissions": ["dashboard:view", "user:view"],
    "updated_at": "2026-03-25T10:00:00Z"
  },
  "message": "角色已更新"
}
```

---

### 5.10 删除角色

**接口**: `DELETE /api/v1/admin/settings/roles/:id`

**描述**: 删除角色

**权限**: `role:manage`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 角色 ID (UUID) |

**响应示例** (200 OK):
```json
{
  "success": true,
  "message": "角色已删除"
}
```

---

### 5.11 审计日志

**接口**: `GET /api/v1/admin/settings/audit-logs`

**描述**: 获取审计日志

**权限**: `audit:view`

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 20 | 每页数量 |
| `admin_id` | string | 否 | - | 管理员 ID |
| `action` | string | 否 | - | 操作类型 |
| `resource_type` | string | 否 | - | 资源类型 |
| `status` | string | 否 | - | 操作结果 |
| `created_after` | string | 否 | - | 开始日期 |
| `created_before` | string | 否 | - | 结束日期 |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "audit_uuid",
        "admin_id": "admin_uuid",
        "admin_email": "admin@aiads.com",
        "admin_name": "系统管理员",
        "admin_role": "Super Admin",
        "action": "update",
        "resource_type": "user",
        "resource_id": "user_uuid",
        "resource_name": "用户昵称",
        "request_method": "PUT",
        "request_path": "/api/v1/admin/users/user_uuid",
        "response_status": 200,
        "status": "success",
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "geo_location": {"country": "CN", "region": "Guangdong", "city": "Shenzhen"},
        "created_at": "2026-03-25T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 500,
      "total_pages": 25
    }
  }
}
```

---

### 5.12 敏感词列表

**接口**: `GET /api/v1/admin/settings/sensitive-words`

**描述**: 获取敏感词列表

**权限**: `settings:view`

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 20 | 每页数量 |
| `keyword` | string | 否 | - | 搜索关键词 |
| `category` | string | 否 | - | 分类 |
| `status` | string | 否 | - | 状态 |

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "word_uuid",
        "word": "敏感词",
        "category": "political",
        "severity": "high",
        "status": "active",
        "created_at": "2026-03-01T10:00:00Z"
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

---

### 5.13 添加敏感词

**接口**: `POST /api/v1/admin/settings/sensitive-words`

**描述**: 添加敏感词

**权限**: `settings:edit`

**请求参数**:
```json
{
  "word": "新敏感词",
  "category": "illegal",
  "severity": "medium"
}
```

**响应示例** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "new_word_uuid",
    "word": "新敏感词",
    "category": "illegal",
    "severity": "medium",
    "status": "active",
    "created_at": "2026-03-25T10:00:00Z"
  },
  "message": "敏感词添加成功"
}
```

---

### 5.14 删除敏感词

**接口**: `DELETE /api/v1/admin/settings/sensitive-words/:id`

**描述**: 删除敏感词

**权限**: `settings:edit`

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | string | 是 | 敏感词 ID (UUID) |

**响应示例** (200 OK):
```json
{
  "success": true,
  "message": "敏感词已删除"
}
```

---

### 5.15 系统监控

**接口**: `GET /api/v1/admin/settings/monitoring`

**描述**: 获取系统监控信息

**权限**: `settings:view`

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "server": {
      "status": "healthy",
      "uptime": 864000,
      "cpu_usage": 0.35,
      "memory_usage": 0.62,
      "disk_usage": 0.45,
      "last_check": "2026-03-25T10:00:00Z"
    },
    "database": {
      "status": "healthy",
      "connections": {"active": 15, "max": 100},
      "query_per_second": 120,
      "slow_queries": 3
    },
    "cache": {
      "status": "healthy",
      "hit_rate": 0.85,
      "memory_usage": 0.40
    },
    "services": [
      {"name": "API Gateway", "status": "healthy", "response_time_ms": 50},
      {"name": "Email Service", "status": "healthy", "response_time_ms": 200},
      {"name": "SMS Service", "status": "healthy", "response_time_ms": 150}
    ],
    "alerts": [
      {
        "id": "alert_uuid",
        "level": "warning",
        "message": "数据库慢查询数量增加",
        "created_at": "2026-03-25T09:00:00Z"
      }
    ]
  }
}
```

---

### 5.16 创建备份

**接口**: `POST /api/v1/admin/settings/backup/create`

**描述**: 创建系统备份

**权限**: `settings:edit`

**请求参数**:
```json
{
  "type": "full",
  "description": "定期备份"
}
```

**响应示例** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "backup_id": "backup_uuid",
    "type": "full",
    "status": "processing",
    "size": null,
    "created_at": "2026-03-25T10:00:00Z"
  },
  "message": "备份任务已创建"
}
```

---

### 5.17 备份列表

**接口**: `GET /api/v1/admin/settings/backup/list`

**描述**: 获取备份列表

**权限**: `settings:edit`

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "backup_id": "backup_uuid",
        "type": "full",
        "description": "定期备份",
        "status": "completed",
        "size": 1073741824,
        "download_url": "https://...",
        "expires_at": "2026-04-25T10:00:00Z",
        "created_at": "2026-03-01T10:00:00Z"
      }
    ]
  }
}
```

---

### 5.18 恢复备份

**接口**: `POST /api/v1/admin/settings/backup/restore`

**描述**: 恢复系统备份

**权限**: `settings:edit`

**请求参数**:
```json
{
  "backup_id": "backup_uuid",
  "confirm": true
}
```

**响应示例** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "restore_id": "restore_uuid",
    "backup_id": "backup_uuid",
    "status": "processing",
    "created_at": "2026-03-25T10:00:00Z"
  },
  "message": "恢复任务已创建，系统将重启"
}
```

---

## 6. 错误码说明

### 6.1 通用错误码

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| `SUCCESS` | 200 | 成功 |
| `VALIDATION_ERROR` | 422 | 请求参数验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `RATE_LIMITED` | 429 | 请求过于频繁 |

### 6.2 认证错误码

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| `AUTH_REQUIRED` | 401 | 需要认证 |
| `TOKEN_INVALID` | 401 | Token 无效 |
| `TOKEN_EXPIRED` | 401 | Token 过期 |

### 6.3 权限错误码

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| `FORBIDDEN` | 403 | 无权限 |
| `MFA_REQUIRED` | 403 | 需要 MFA 验证 |
| `IP_NOT_WHITELISTED` | 403 | IP 不在白名单 |

### 6.4 资源错误码

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 资源冲突 |

### 6.5 业务错误码

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| `ADVERTISER_NOT_FOUND` | 404 | 广告主不存在 |
| `CAMPAIGN_NOT_FOUND` | 404 | 活动不存在 |
| `ORDER_NOT_FOUND` | 404 | 订单不存在 |
| `INSUFFICIENT_BALANCE` | 400 | 余额不足 |
| `INVALID_OPERATION` | 400 | 无效操作 |

---

**文档结束**
