# AIAds 管理后台 - 剩余模块技术架构文档

**文档版本**: 1.0
**创建日期**: 2026 年 3 月 25 日
**作者**: AIAds 架构团队
**保密级别**: 内部机密
**状态**: 已审批

---

## 目录

1. [广告主管理模块](#1-广告主管理模块)
2. [活动管理模块](#2-活动管理模块)
3. [订单管理模块](#3-订单管理模块)
4. [系统设置模块](#4-系统设置模块)
5. [数据库变更](#5-数据库变更)

---

## 1. 广告主管理模块

### 1.1 技术架构

#### 1.1.1 模块概述

广告主管理模块是管理后台的核心功能之一，为运营人员和财务人员提供广告主全生命周期管理能力。

**核心功能**:
- 广告主信息管理
- 企业认证审核
- 充值/消费记录查询
- 余额管理（调整/冻结/解冻）

#### 1.1.2 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    广告主管理模块架构                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        前端层 (React)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 广告主列表页 │  │ 广告主详情页│  │ 广告主审核页 │             │
│  │ AdvertiserList│  │AdvertiserDetail│ │AdvertiserReview │     │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 余额调整弹窗 │  │ 充值记录页  │  │ 消费记录页  │             │
│  │BalanceAdjust │  │RechargeList │  │ConsumptionList│          │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API 网关层 (Express)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  /api/v1/admin/advertisers                              │   │
│  │  ├── GET    - 广告主列表                                 │   │
│  │  ├── GET    /:id - 广告主详情                            │   │
│  │  ├── PUT    /:id/verify - 广告主审核                     │   │
│  │  ├── GET    /:id/recharges - 充值记录                    │   │
│  │  ├── GET    /:id/consumptions - 消费记录                 │   │
│  │  ├── PUT    /:id/balance - 余额调整                      │   │
│  │  ├── PUT    /:id/freeze - 冻结账户                       │   │
│  │  └── PUT    /:id/unfreeze - 解冻账户                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      业务逻辑层 (Service)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │AdvertiserSvc│  │VerificationSvc│ │TransactionSvc│            │
│  │             │  │             │  │            │             │
│  │ - getList   │  │ - submit    │  │ - getRecharge│            │
│  │ - getById   │  │ - approve   │  │ - getConsumption│         │
│  │ - verify    │  │ - reject    │  │ - adjustBalance│          │
│  │ - freeze    │  │             │  │ - freeze    │             │
│  │ - unfreeze  │  │             │  │ - unfreeze  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      数据访问层 (Repository)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │AdvertiserRepo│  │VerificationRepo│ │TransactionRepo│         │
│  │             │  │             │  │            │             │
│  │ - findMany  │  │ - create    │  │ - findMany │             │
│  │ - findById  │  │ - findById  │  │ - create   │             │
│  │ - update    │  │ - update    │  │ - update   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据库层 (PostgreSQL)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ advertisers  │  │advertiser_   │  │ transactions │          │
│  │              │  │verifications │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

#### 1.1.3 技术栈

| 层级 | 技术选型 | 说明 |
|-----|---------|------|
| 前端框架 | React 18 + TypeScript | 组件化开发 |
| UI 组件库 | MUI 5.x | Material Design |
| 状态管理 | Zustand + React Query | 全局状态 + 服务端状态 |
| 后端框架 | Express + TypeScript | RESTful API |
| ORM | Prisma | 类型安全的数据库访问 |
| 数据库 | PostgreSQL 15 | 关系型数据库 |
| 缓存 | Redis | 热点数据缓存 |

#### 1.1.4 权限设计

| API | 所需权限 | 角色 |
|-----|---------|------|
| GET /advertisers | `advertiser:view` | Admin, Finance |
| GET /advertisers/:id | `advertiser:view` | Admin, Finance |
| PUT /advertisers/:id/verify | `advertiser:verify` | Admin |
| GET /advertisers/:id/recharges | `finance:view` | Admin, Finance |
| GET /advertisers/:id/consumptions | `finance:view` | Admin, Finance |
| PUT /advertisers/:id/balance | `finance:adjustment` | Super Admin, Finance |
| PUT /advertisers/:id/freeze | `advertiser:freeze` | Super Admin |
| PUT /advertisers/:id/unfreeze | `advertiser:unfreeze` | Super Admin |

### 1.2 API 设计

#### 1.2.1 广告主列表

**接口**: `GET /api/v1/admin/advertisers`

**描述**: 获取广告主列表，支持分页、搜索、筛选

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 (最大 100) |
| `keyword` | string | - | 搜索关键词 (公司名称/联系人/邮箱) |
| `verification_status` | string | - | 认证状态 (pending/approved/rejected) |
| `industry` | string | - | 行业类别 |
| `min_balance` | number | - | 最小余额 |
| `max_balance` | number | - | 最大余额 |
| `created_after` | string | - | 注册开始日期 |
| `created_before` | string | - | 注册结束日期 |
| `sort` | string | created_at | 排序字段 |
| `order` | string | desc | 排序方向 |

**响应示例**:
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
  }
}
```

#### 1.2.2 广告主详情

**接口**: `GET /api/v1/admin/advertisers/:id`

**描述**: 获取广告主完整信息

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 广告主 ID (UUID) |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user_uuid",
    "company_name": "某某科技有限公司",
    "company_name_en": "XX Technology Co., Ltd.",
    "business_license": "91440300MA5XXXXX",
    "business_license_url": "https://...",
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

#### 1.2.3 广告主审核

**接口**: `PUT /api/v1/admin/advertisers/:id/verify`

**描述**: 审核广告主企业认证

**权限**: `advertiser:verify`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 广告主 ID (UUID) |

**请求参数**:
```json
{
  "action": "approve",
  "note": "资料真实有效，通过审核",
  "rejection_reason": "营业执照不清晰"
}
```

**响应示例**:
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

#### 1.2.4 充值记录

**接口**: `GET /api/v1/admin/advertisers/:id/recharges`

**描述**: 获取广告主充值历史

**权限**: `finance:view`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 广告主 ID (UUID) |

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `status` | string | - | 状态 (pending/completed/failed) |
| `payment_method` | string | - | 支付方式 |
| `created_after` | string | - | 开始日期 |
| `created_before` | string | - | 结束日期 |

**响应示例**:
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

#### 1.2.5 消费记录

**接口**: `GET /api/v1/admin/advertisers/:id/consumptions`

**描述**: 获取广告主消费历史

**权限**: `finance:view`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 广告主 ID (UUID) |

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `type` | string | - | 类型 (order_payment/campaign_boost) |
| `status` | string | - | 状态 |
| `created_after` | string | - | 开始日期 |
| `created_before` | string | - | 结束日期 |

**响应示例**:
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

#### 1.2.6 余额调整

**接口**: `PUT /api/v1/admin/advertisers/:id/balance`

**描述**: 调整广告主余额

**权限**: `finance:adjustment`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 广告主 ID (UUID) |

**请求参数**:
```json
{
  "amount": 1000.00,
  "type": "manual",
  "reason": "平台活动赠送",
  "notify_advertiser": true
}
```

**响应示例**:
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

#### 1.2.7 冻结账户

**接口**: `PUT /api/v1/admin/advertisers/:id/freeze`

**描述**: 冻结广告主账户

**权限**: `advertiser:freeze`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 广告主 ID (UUID) |

**请求参数**:
```json
{
  "reason": "涉嫌违规操作，调查中",
  "freeze_amount": 5000.00
}
```

**响应示例**:
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

#### 1.2.8 解冻账户

**接口**: `PUT /api/v1/admin/advertisers/:id/unfreeze`

**描述**: 解冻广告主账户

**权限**: `advertiser:unfreeze`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 广告主 ID (UUID) |

**请求参数**:
```json
{
  "reason": "调查完成，解除冻结",
  "unfreeze_amount": 5000.00
}
```

**响应示例**:
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

### 1.3 数据库设计

#### 1.3.1 广告主认证表 (advertiser_verifications)

```sql
CREATE TABLE advertiser_verifications (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 广告主关联
    advertiser_id UUID NOT NULL UNIQUE REFERENCES advertisers(id) ON DELETE CASCADE,

    -- 企业信息
    company_name VARCHAR(255) NOT NULL,
    company_name_en VARCHAR(255),
    business_license VARCHAR(100) NOT NULL,
    business_license_url VARCHAR(512),
    tax_id VARCHAR(100),
    legal_representative VARCHAR(100) NOT NULL,

    -- 认证资料
    business_license_images TEXT[],
    legal_representative_id_front VARCHAR(512),
    legal_representative_id_back VARCHAR(512),
    authorization_letter_url VARCHAR(512),

    -- 审核信息
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES admins(id),
    rejection_reason TEXT,
    review_notes TEXT,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_advertiser_verifications_advertiser_id ON advertiser_verifications(advertiser_id);
CREATE INDEX idx_advertiser_verifications_status ON advertiser_verifications(status);
CREATE INDEX idx_advertiser_verifications_submitted_at ON advertiser_verifications(submitted_at);

-- 注释
COMMENT ON TABLE advertiser_verifications IS '广告主认证表';
COMMENT ON COLUMN advertiser_verifications.status IS '认证状态';
COMMENT ON COLUMN advertiser_verifications.business_license_images IS '营业执照图片 (URL 数组)';
```

#### 1.3.2 广告主消费表 (advertiser_consumptions)

```sql
CREATE TABLE advertiser_consumptions (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 交易号
    transaction_no VARCHAR(50) NOT NULL UNIQUE,

    -- 广告主关联
    advertiser_id UUID NOT NULL REFERENCES advertisers(id),
    user_id UUID NOT NULL REFERENCES users(id),

    -- 订单/活动关联
    order_id UUID REFERENCES orders(id),
    campaign_id UUID REFERENCES campaigns(id),

    -- 消费信息
    amount DECIMAL(12, 2) NOT NULL,
    type VARCHAR(30) NOT NULL
        CHECK (type IN ('order_payment', 'campaign_boost', 'service_fee', 'refund')),

    -- 余额变更
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,

    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

    -- 描述
    description TEXT,

    -- 时间信息
    completed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_advertiser_consumptions_transaction_no ON advertiser_consumptions(transaction_no);
CREATE INDEX idx_advertiser_consumptions_advertiser_id ON advertiser_consumptions(advertiser_id);
CREATE INDEX idx_advertiser_consumptions_user_id ON advertiser_consumptions(user_id);
CREATE INDEX idx_advertiser_consumptions_order_id ON advertiser_consumptions(order_id);
CREATE INDEX idx_advertiser_consumptions_campaign_id ON advertiser_consumptions(campaign_id);
CREATE INDEX idx_advertiser_consumptions_type ON advertiser_consumptions(type);
CREATE INDEX idx_advertiser_consumptions_status ON advertiser_consumptions(status);
CREATE INDEX idx_advertiser_consumptions_created_at ON advertiser_consumptions(created_at DESC);

-- 注释
COMMENT ON TABLE advertiser_consumptions IS '广告主消费表';
COMMENT ON COLUMN advertiser_consumptions.type IS '消费类型';
```

---

## 2. 活动管理模块

### 2.1 技术架构

#### 2.1.1 模块概述

活动管理模块为运营人员提供完整的活动生命周期管理能力。

**核心功能**:
- 活动列表和详情
- 活动审核
- 活动状态管理
- 活动数据统计
- 异常活动监控

#### 2.1.2 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    活动管理模块架构                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        前端层 (React)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 活动列表页  │  │ 活动详情页  │  │ 活动审核页  │             │
│  │CampaignList │  │CampaignDetail│ │CampaignReview│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 活动统计页  │  │ 异常活动页  │  │ 活动状态管理│             │
│  │CampaignStats│  │AbnormalCamp │  │CampaignStatus│            │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API 网关层 (Express)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  /api/v1/admin/campaigns                                │   │
│  │  ├── GET    - 活动列表                                   │   │
│  │  ├── GET    /:id - 活动详情                              │   │
│  │  ├── PUT    /:id/verify - 活动审核                       │   │
│  │  ├── PUT    /:id/status - 活动状态                       │   │
│  │  ├── GET    /:id/stats - 活动统计                        │   │
│  │  └── GET    /abnormal - 异常活动                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      业务逻辑层 (Service)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │CampaignSvc  │  │CampaignStatsSvc│ │AnomalyDetectionSvc│     │
│  │             │  │             │  │            │             │
│  │ - getList   │  │ - getMetrics│  │ - detect   │             │
│  │ - getById   │  │ - getTrend  │  │ - flag     │             │
│  │ - verify    │  │ - export    │  │ - alert    │             │
│  │ - updateStatus│ │             │  │            │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      数据访问层 (Repository)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │CampaignRepo │  │CampaignStatsRepo│ │CampaignKolRepo│        │
│  │             │  │             │  │            │             │
│  │ - findMany  │  │ - upsert    │  │ - findMany │             │
│  │ - findById  │  │ - findById  │  │ - create   │             │
│  │ - update    │  │ - update    │  │ - update   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据库层 (PostgreSQL)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ campaigns    │  │campaign_stats│  │ campaign_kols│          │
│  │              │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.1.3 权限设计

| API | 所需权限 | 角色 |
|-----|---------|------|
| GET /campaigns | `campaign:view` | All Admins |
| GET /campaigns/:id | `campaign:view` | All Admins |
| PUT /campaigns/:id/verify | `campaign:review` | Admin, Moderator |
| PUT /campaigns/:id/status | `campaign:manage` | Admin |
| GET /campaigns/:id/stats | `campaign:view` | All Admins |
| GET /campaigns/abnormal | `campaign:view` | Admin |

### 2.2 API 设计

#### 2.2.1 活动列表

**接口**: `GET /api/v1/admin/campaigns`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `keyword` | string | - | 搜索关键词 |
| `status` | string | - | 活动状态 |
| `advertiser_id` | string | - | 广告主 ID |
| `industry` | string | - | 行业类别 |
| `start_date_after` | string | - | 开始日期 |
| `start_date_before` | string | - | 结束日期 |
| `min_budget` | number | - | 最小预算 |
| `max_budget` | number | - | 最大预算 |

**响应示例**:
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

#### 2.2.2 活动详情

**接口**: `GET /api/v1/admin/campaigns/:id`

**响应示例**:
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

#### 2.2.3 活动审核

**接口**: `PUT /api/v1/admin/campaigns/:id/verify`

**权限**: `campaign:review`

**请求参数**:
```json
{
  "action": "approve",
  "note": "活动内容符合规范，通过审核",
  "rejection_reason": "预算过低，无法达到预期效果"
}
```

**响应示例**:
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

#### 2.2.4 活动状态

**接口**: `PUT /api/v1/admin/campaigns/:id/status`

**权限**: `campaign:manage`

**请求参数**:
```json
{
  "status": "paused",
  "reason": "广告主申请暂停"
}
```

**响应示例**:
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

#### 2.2.5 活动统计

**接口**: `GET /api/v1/admin/campaigns/:id/stats`

**响应示例**:
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

#### 2.2.6 异常活动

**接口**: `GET /api/v1/admin/campaigns/abnormal`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `severity` | string | - | 严重程度 |
| `status` | string | - | 处理状态 |
| `type` | string | - | 异常类型 |

**响应示例**:
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

### 2.3 数据库设计

#### 2.3.1 活动统计表 (campaign_stats)

```sql
CREATE TABLE campaign_stats (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 活动关联
    campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,

    -- 曝光数据
    total_impressions INTEGER NOT NULL DEFAULT 0,
    total_clicks INTEGER NOT NULL DEFAULT 0,
    click_through_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,

    -- 互动数据
    total_likes INTEGER NOT NULL DEFAULT 0,
    total_comments INTEGER NOT NULL DEFAULT 0,
    total_shares INTEGER NOT NULL DEFAULT 0,
    engagement_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,

    -- 转化数据
    total_conversions INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,

    -- ROI 数据
    total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    roi DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- 覆盖数据
    estimated_reach INTEGER NOT NULL DEFAULT 0,
    actual_reach INTEGER NOT NULL DEFAULT 0,

    -- KOL 数据
    total_kols INTEGER NOT NULL DEFAULT 0,
    applied_kols INTEGER NOT NULL DEFAULT 0,
    selected_kols INTEGER NOT NULL DEFAULT 0,
    published_videos INTEGER NOT NULL DEFAULT 0,

    -- 效果评分
    performance_score VARCHAR(20)
        CHECK (performance_score IN ('excellent', 'good', 'average', 'poor')),

    -- 数据日期
    stats_date DATE NOT NULL,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_campaign_stats_campaign_id ON campaign_stats(campaign_id);
CREATE INDEX idx_campaign_stats_stats_date ON campaign_stats(stats_date);
CREATE INDEX idx_campaign_stats_performance_score ON campaign_stats(performance_score);

-- 注释
COMMENT ON TABLE campaign_stats IS '活动统计表';
COMMENT ON COLUMN campaign_stats.click_through_rate IS '点击率 (CTR)';
COMMENT ON COLUMN campaign_stats.engagement_rate IS '互动率';
COMMENT ON COLUMN campaign_stats.roi IS '投资回报率';
```

#### 2.3.2 活动 KOL 关联表 (campaign_kols)

已有表结构（在现有数据库中），这里补充说明：

```sql
-- 已有表，用于记录活动与 KOL 的关联关系
-- 包含字段：id, campaign_id, kol_id, status, applied_at, selected_at, published_at, performance_score, etc.
```

---

## 3. 订单管理模块

### 3.1 技术架构

#### 3.1.1 模块概述

订单管理模块为运营人员和财务人员提供完整的订单生命周期管理能力。

**核心功能**:
- 订单列表和详情
- 订单状态管理
- 订单纠纷处理
- 订单导出

#### 3.1.2 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    订单管理模块架构                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        前端层 (React)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 订单列表页  │  │ 订单详情页  │  │ 纠纷处理页  │             │
│  │ OrderList   │  │ OrderDetail │  │DisputeHandle│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │ 订单导出页  │  │ 订单状态管理│                              │
│  │ OrderExport │  │ OrderStatus │                              │
│  └─────────────┘  └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API 网关层 (Express)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  /api/v1/admin/orders                                   │   │
│  │  ├── GET    - 订单列表                                   │   │
│  │  ├── GET    /:id - 订单详情                              │   │
│  │  ├── PUT    /:id/status - 订单状态                       │   │
│  │  ├── GET    /disputes - 纠纷订单                         │   │
│  │  ├── PUT    /:id/dispute - 订单纠纷处理                   │   │
│  │  └── POST   /export - 订单导出                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      业务逻辑层 (Service)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ OrderSvc    │  │DisputeSvc   │  │ ExportSvc   │             │
│  │             │  │             │  │            │             │
│  │ - getList   │  │ - getDisputes│ │ - export   │             │
│  │ - getById   │  │ - handle    │  │ - generate │             │
│  │ - updateStatus│ │ - arbitrate │  │ - download │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      数据访问层 (Repository)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │OrderRepo    │  │DisputeRepo  │  │ExportRepo   │             │
│  │             │  │             │  │            │             │
│  │ - findMany  │  │ - findDisputes│ │ - query    │             │
│  │ - findById  │  │ - findById  │  │ - export   │             │
│  │ - update    │  │ - update    │  │            │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据库层 (PostgreSQL)                     │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ orders       │  │order_disputes│                             │
│  │              │  │              │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.1.3 权限设计

| API | 所需权限 | 角色 |
|-----|---------|------|
| GET /orders | `order:view` | All Admins |
| GET /orders/:id | `order:view` | All Admins |
| PUT /orders/:id/status | `order:manage` | Admin |
| GET /orders/disputes | `order:view` | Admin, Finance |
| PUT /orders/:id/dispute | `order:manage` | Admin |
| POST /orders/export | `order:export` | Admin, Finance |

### 3.2 API 设计

#### 3.2.1 订单列表

**接口**: `GET /api/v1/admin/orders`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `keyword` | string | - | 搜索关键词 (订单号/活动名称/KOL) |
| `status` | string | - | 订单状态 |
| `campaign_id` | string | - | 活动 ID |
| `advertiser_id` | string | - | 广告主 ID |
| `kol_id` | string | - | KOL ID |
| `platform` | string | - | 平台 |
| `amount_min` | number | - | 最小金额 |
| `amount_max` | number | - | 最大金额 |
| `created_after` | string | - | 开始日期 |
| `created_before` | string | - | 结束日期 |

**响应示例**:
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

#### 3.2.2 订单详情

**接口**: `GET /api/v1/admin/orders/:id`

**响应示例**:
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

#### 3.2.3 订单状态

**接口**: `PUT /api/v1/admin/orders/:id/status`

**权限**: `order:manage`

**请求参数**:
```json
{
  "status": "completed",
  "reason": "广告主确认收货"
}
```

**响应示例**:
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

#### 3.2.4 纠纷订单

**接口**: `GET /api/v1/admin/orders/disputes`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `status` | string | - | 处理状态 |
| `priority` | string | - | 优先级 |
| `dispute_type` | string | - | 纠纷类型 |

**响应示例**:
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

#### 3.2.5 订单纠纷处理

**接口**: `PUT /api/v1/admin/orders/:id/dispute`

**权限**: `order:manage`

**请求参数**:
```json
{
  "resolution": "partial_refund",
  "refund_amount": 250.00,
  "ruling": "split",
  "resolution_notes": "经仲裁，双方各承担 50% 责任"
}
```

**响应示例**:
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

#### 3.2.6 订单导出

**接口**: `POST /api/v1/admin/orders/export`

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

**响应示例**:
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

### 3.3 数据库设计

订单管理模块使用的 `orders` 和 `order_disputes` 表已在现有数据库中定义，无需新增表。

---

## 4. 系统设置模块

### 4.1 技术架构

#### 4.1.1 模块概述

系统设置模块为超级管理员提供完整的系统配置和管理功能。

**核心功能**:
- 系统配置管理
- 管理员管理
- 角色权限管理
- 审计日志查看
- 敏感词管理
- 系统监控
- 备份管理

#### 4.1.2 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    系统设置模块架构                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        前端层 (React)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 系统配置页  │  │ 管理员管理  │  │ 角色权限管理│             │
│  │SysConfig    │  │AdminManage  │  │RolePermission│            │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 审计日志页  │  │ 敏感词管理  │  │ 系统监控页  │             │
│  │AuditLog     │  │SensitiveWord│  │SysMonitor   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐                                              │
│  │ 备份管理页  │                                              │
│  │BackupManage │                                              │
│  └─────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API 网关层 (Express)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  /api/v1/admin/settings                                 │   │
│  │  ├── GET    /system - 系统配置                           │   │
│  │  ├── PUT    /system - 更新配置                           │   │
│  │  ├── GET    /admins - 管理员列表                         │   │
│  │  ├── POST   /admins - 创建管理员                         │   │
│  │  ├── PUT    /admins/:id - 更新管理员                     │   │
│  │  ├── DELETE /admins/:id - 删除管理员                     │   │
│  │  ├── GET    /roles - 角色列表                            │   │
│  │  ├── POST   /roles - 创建角色                            │   │
│  │  ├── PUT    /roles/:id - 更新角色                        │   │
│  │  ├── DELETE /roles/:id - 删除角色                        │   │
│  │  ├── GET    /audit-logs - 审计日志                        │   │
│  │  ├── GET    /sensitive-words - 敏感词列表                 │   │
│  │  ├── POST   /sensitive-words - 添加敏感词                 │   │
│  │  ├── DELETE /sensitive-words/:id - 删除敏感词             │   │
│  │  ├── GET    /monitoring - 系统监控                        │   │
│  │  ├── POST   /backup/create - 创建备份                     │   │
│  │  ├── GET    /backup/list - 备份列表                       │   │
│  │  └── POST   /backup/restore - 恢复备份                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      业务逻辑层 (Service)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │SettingsSvc  │  │AdminSvc     │  │RoleSvc      │             │
│  │             │  │             │  │            │             │
│  │ - getConfig │  │ - getList   │  │ - getList  │             │
│  │ - updateConfig│ │ - create    │  │ - create   │             │
│  │             │  │ - update    │  │ - update   │             │
│  │             │  │ - delete    │  │ - delete   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │AuditLogSvc  │  │SensitiveWordSvc│ │MonitoringSvc│           │
│  │             │  │             │  │            │             │
│  │ - getLogs   │  │ - getList   │  │ - getStatus│             │
│  │ - export    │  │ - add       │  │ - getMetrics│            │
│  │             │  │ - delete    │  │ - getAlerts│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐                                              │
│  │BackupSvc    │                                              │
│  │             │                                              │
│  │ - create    │                                              │
│  │ - list      │                                              │
│  │ - restore   │                                              │
│  └─────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据库层 (PostgreSQL)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ settings     │  │sensitive_words│  │admin_audit_  │          │
│  │              │  │              │  │logs          │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ admins       │  │admin_roles   │                             │
│  │              │  │              │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.1.3 权限设计

| API | 所需权限 | 角色 |
|-----|---------|------|
| GET /settings/system | `settings:view` | Super Admin |
| PUT /settings/system | `settings:edit` | Super Admin |
| GET /settings/admins | `admin:manage` | Super Admin |
| POST /settings/admins | `admin:manage` | Super Admin |
| PUT /settings/admins/:id | `admin:manage` | Super Admin |
| DELETE /settings/admins/:id | `admin:manage` | Super Admin |
| GET /settings/roles | `role:manage` | Super Admin |
| POST /settings/roles | `role:manage` | Super Admin |
| PUT /settings/roles/:id | `role:manage` | Super Admin |
| DELETE /settings/roles/:id | `role:manage` | Super Admin |
| GET /settings/audit-logs | `audit:view` | Super Admin, Admin |
| GET /settings/sensitive-words | `settings:view` | Super Admin, Admin |
| POST /settings/sensitive-words | `settings:edit` | Super Admin |
| DELETE /settings/sensitive-words/:id | `settings:edit` | Super Admin |
| GET /settings/monitoring | `settings:view` | Super Admin |
| POST /settings/backup/* | `settings:edit` | Super Admin |

### 4.2 API 设计

#### 4.2.1 系统配置

**接口**: `GET /api/v1/admin/settings/system`

**权限**: `settings:view`

**响应示例**:
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

#### 4.2.2 更新系统配置

**接口**: `PUT /api/v1/admin/settings/system`

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

**响应示例**:
```json
{
  "success": true,
  "message": "系统配置已更新"
}
```

#### 4.2.3 管理员列表

**接口**: `GET /api/v1/admin/settings/admins`

**权限**: `admin:manage`

**响应示例**:
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

#### 4.2.4 创建管理员

**接口**: `POST /api/v1/admin/settings/admins`

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

**响应示例**:
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

#### 4.2.5 更新管理员

**接口**: `PUT /api/v1/admin/settings/admins/:id`

**权限**: `admin:manage`

**请求参数**:
```json
{
  "name": "更新后的姓名",
  "role_id": "new_role_uuid",
  "status": "active"
}
```

**响应示例**:
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

#### 4.2.6 删除管理员

**接口**: `DELETE /api/v1/admin/settings/admins/:id`

**权限**: `admin:manage`

**响应示例**:
```json
{
  "success": true,
  "message": "管理员已删除"
}
```

#### 4.2.7 角色列表

**接口**: `GET /api/v1/admin/settings/roles`

**权限**: `role:manage`

**响应示例**:
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

#### 4.2.8 创建角色

**接口**: `POST /api/v1/admin/settings/roles`

**权限**: `role:manage`

**请求参数**:
```json
{
  "name": "Custom Role",
  "description": "自定义角色",
  "permissions": ["dashboard:view", "user:view", "order:view"]
}
```

**响应示例**:
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

#### 4.2.9 更新角色

**接口**: `PUT /api/v1/admin/settings/roles/:id`

**权限**: `role:manage`

**请求参数**:
```json
{
  "name": "Updated Role",
  "description": "更新描述",
  "permissions": ["dashboard:view", "user:view"]
}
```

**响应示例**:
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

#### 4.2.10 删除角色

**接口**: `DELETE /api/v1/admin/settings/roles/:id`

**权限**: `role:manage`

**响应示例**:
```json
{
  "success": true,
  "message": "角色已删除"
}
```

#### 4.2.11 审计日志

**接口**: `GET /api/v1/admin/settings/audit-logs`

**权限**: `audit:view`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `admin_id` | string | - | 管理员 ID |
| `action` | string | - | 操作类型 |
| `resource_type` | string | - | 资源类型 |
| `status` | string | - | 操作结果 |
| `created_after` | string | - | 开始日期 |
| `created_before` | string | - | 结束日期 |

**响应示例**:
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

#### 4.2.12 敏感词列表

**接口**: `GET /api/v1/admin/settings/sensitive-words`

**权限**: `settings:view`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `keyword` | string | - | 搜索关键词 |
| `category` | string | - | 分类 |
| `status` | string | - | 状态 |

**响应示例**:
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

#### 4.2.13 添加敏感词

**接口**: `POST /api/v1/admin/settings/sensitive-words`

**权限**: `settings:edit`

**请求参数**:
```json
{
  "word": "新敏感词",
  "category": "illegal",
  "severity": "medium"
}
```

**响应示例**:
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

#### 4.2.14 删除敏感词

**接口**: `DELETE /api/v1/admin/settings/sensitive-words/:id`

**权限**: `settings:edit`

**响应示例**:
```json
{
  "success": true,
  "message": "敏感词已删除"
}
```

#### 4.2.15 系统监控

**接口**: `GET /api/v1/admin/settings/monitoring`

**权限**: `settings:view`

**响应示例**:
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

#### 4.2.16 创建备份

**接口**: `POST /api/v1/admin/settings/backup/create`

**权限**: `settings:edit`

**请求参数**:
```json
{
  "type": "full",
  "description": "定期备份"
}
```

**响应示例**:
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

#### 4.2.17 备份列表

**接口**: `GET /api/v1/admin/settings/backup/list`

**权限**: `settings:edit`

**响应示例**:
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

#### 4.2.18 恢复备份

**接口**: `POST /api/v1/admin/settings/backup/restore`

**权限**: `settings:edit`

**请求参数**:
```json
{
  "backup_id": "backup_uuid",
  "confirm": true
}
```

**响应示例**:
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

### 4.3 数据库设计

#### 4.3.1 系统配置表 (settings)

```sql
CREATE TABLE settings (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 配置键
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_group VARCHAR(50) NOT NULL,  -- basic, email, sms, storage, security

    -- 配置值 (JSONB 存储复杂配置)
    config_value JSONB NOT NULL,

    -- 配置描述
    description TEXT,

    -- 是否可修改
    is_editable BOOLEAN DEFAULT TRUE,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES admins(id)
);

-- 索引
CREATE INDEX idx_settings_config_group ON settings(config_group);
CREATE INDEX idx_settings_config_key ON settings(config_key);

-- 注释
COMMENT ON TABLE settings IS '系统配置表';
COMMENT ON COLUMN settings.config_value IS '配置值 (JSONB)';

-- 初始化配置数据
INSERT INTO settings (config_key, config_group, config_value, description) VALUES
('platform_name', 'basic', '"AIAds 影响者营销平台"', '平台名称'),
('platform_url', 'basic', '"https://aiads.com"', '平台 URL'),
('timezone', 'basic', '"Asia/Shanghai"', '时区'),
('default_language', 'basic', '"zh-CN"', '默认语言'),
('password_min_length', 'security', '8', '密码最小长度'),
('login_lockout_attempts', 'security', '5', '登录失败锁定次数'),
('session_timeout_minutes', 'security', '120', 'Session 超时时间 (分钟)');
```

#### 4.3.2 敏感词表 (sensitive_words)

```sql
CREATE TABLE sensitive_words (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 敏感词
    word VARCHAR(255) NOT NULL,

    -- 分类
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('political', 'illegal', 'pornographic', 'violent', 'spam', 'other')),

    -- 严重程度
    severity VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    -- 匹配模式
    match_type VARCHAR(20) NOT NULL DEFAULT 'exact'
        CHECK (match_type IN ('exact', 'fuzzy', 'regex')),

    -- 替换词
    replacement VARCHAR(255) DEFAULT '***',

    -- 描述
    description TEXT,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admins(id),
    updated_by UUID REFERENCES admins(id)
);

-- 索引
CREATE INDEX idx_sensitive_words_word ON sensitive_words(word);
CREATE INDEX idx_sensitive_words_category ON sensitive_words(category);
CREATE INDEX idx_sensitive_words_status ON sensitive_words(status);
CREATE INDEX idx_sensitive_words_severity ON sensitive_words(severity);

-- 注释
COMMENT ON TABLE sensitive_words IS '敏感词表';
COMMENT ON COLUMN sensitive_words.match_type IS '匹配类型：exact-精确，fuzzy-模糊，regex-正则';
```

---

## 5. 数据库变更

### 5.1 新增表结构

#### 5.1.1 广告主认证表 (advertiser_verifications)

详见 [1.3.1](#131-广告主认证表-advertiser_verifications)

#### 5.1.2 广告主消费表 (advertiser_consumptions)

详见 [1.3.2](#132-广告主消费表-advertiser_consumptions)

#### 5.1.3 活动统计表 (campaign_stats)

详见 [2.3.1](#231-活动统计表-campaign_stats)

#### 5.1.4 系统配置表 (settings)

详见 [4.3.1](#431-系统配置表-settings)

#### 5.1.5 敏感词表 (sensitive_words)

详见 [4.3.2](#432-敏感词表-sensitive_words)

### 5.2 索引设计

#### 5.2.1 广告主模块索引

```sql
-- 广告主认证表索引
CREATE INDEX idx_advertiser_verifications_advertiser_id ON advertiser_verifications(advertiser_id);
CREATE INDEX idx_advertiser_verifications_status ON advertiser_verifications(status);
CREATE INDEX idx_advertiser_verifications_submitted_at ON advertiser_verifications(submitted_at);

-- 广告主消费表索引
CREATE INDEX idx_advertiser_consumptions_transaction_no ON advertiser_consumptions(transaction_no);
CREATE INDEX idx_advertiser_consumptions_advertiser_id ON advertiser_consumptions(advertiser_id);
CREATE INDEX idx_advertiser_consumptions_user_id ON advertiser_consumptions(user_id);
CREATE INDEX idx_advertiser_consumptions_order_id ON advertiser_consumptions(order_id);
CREATE INDEX idx_advertiser_consumptions_campaign_id ON advertiser_consumptions(campaign_id);
CREATE INDEX idx_advertiser_consumptions_type ON advertiser_consumptions(type);
CREATE INDEX idx_advertiser_consumptions_status ON advertiser_consumptions(status);
CREATE INDEX idx_advertiser_consumptions_created_at ON advertiser_consumptions(created_at DESC);
```

#### 5.2.2 活动模块索引

```sql
-- 活动统计表索引
CREATE INDEX idx_campaign_stats_campaign_id ON campaign_stats(campaign_id);
CREATE INDEX idx_campaign_stats_stats_date ON campaign_stats(stats_date);
CREATE INDEX idx_campaign_stats_performance_score ON campaign_stats(performance_score);
```

#### 5.2.3 系统设置模块索引

```sql
-- 系统配置表索引
CREATE INDEX idx_settings_config_group ON settings(config_group);
CREATE INDEX idx_settings_config_key ON settings(config_key);

-- 敏感词表索引
CREATE INDEX idx_sensitive_words_word ON sensitive_words(word);
CREATE INDEX idx_sensitive_words_category ON sensitive_words(category);
CREATE INDEX idx_sensitive_words_status ON sensitive_words(status);
CREATE INDEX idx_sensitive_words_severity ON sensitive_words(severity);
```

### 5.3 数据迁移

#### 5.3.1 迁移脚本

```sql
-- 迁移现有广告主数据到认证表
INSERT INTO advertiser_verifications (
    advertiser_id,
    company_name,
    business_license,
    legal_representative,
    status,
    submitted_at,
    reviewed_at,
    reviewed_by
)
SELECT
    id,
    company_name,
    business_license,
    legal_representative,
    CASE
        WHEN verification_status = 'approved' THEN 'approved'
        WHEN verification_status = 'rejected' THEN 'rejected'
        ELSE 'submitted'
    END,
    created_at,
    verified_at,
    verified_by
FROM advertisers
WHERE verification_status IS NOT NULL;

-- 迁移现有交易数据到消费表
INSERT INTO advertiser_consumptions (
    transaction_no,
    advertiser_id,
    user_id,
    order_id,
    campaign_id,
    amount,
    type,
    balance_before,
    balance_after,
    status,
    description,
    completed_at,
    created_at
)
SELECT
    transaction_no,
    advertiser_id,
    user_id,
    order_id,
    campaign_id,
    amount,
    type,
    balance_before,
    balance_after,
    status,
    description,
    completed_at,
    created_at
FROM transactions
WHERE type IN ('order_payment', 'campaign_boost', 'service_fee');

-- 初始化活动统计数据
INSERT INTO campaign_stats (
    campaign_id,
    total_impressions,
    total_clicks,
    total_likes,
    total_comments,
    total_shares,
    total_cost,
    stats_date
)
SELECT
    c.id,
    COALESCE(SUM(o.views), 0),
    COALESCE(SUM(o.clicks), 0),
    COALESCE(SUM(o.likes), 0),
    COALESCE(SUM(o.comments), 0),
    COALESCE(SUM(o.shares), 0),
    c.spent_amount,
    CURRENT_DATE
FROM campaigns c
LEFT JOIN orders o ON o.campaign_id = c.id
GROUP BY c.id, c.spent_amount;

-- 初始化系统配置
INSERT INTO settings (config_key, config_group, config_value, description) VALUES
('platform_name', 'basic', '"AIAds 影响者营销平台"', '平台名称'),
('platform_url', 'basic', '"https://aiads.com"', '平台 URL'),
('timezone', 'basic', '"Asia/Shanghai"', '时区'),
('default_language', 'basic', '"zh-CN"', '默认语言'),
('password_min_length', 'security', '8', '密码最小长度'),
('login_lockout_attempts', 'security', '5', '登录失败锁定次数'),
('session_timeout_minutes', 'security', '120', 'Session 超时时间 (分钟)')
ON CONFLICT (config_key) DO NOTHING;
```

#### 5.3.2 回滚脚本

```sql
-- 回滚脚本（仅在迁移失败时使用）
DROP TABLE IF EXISTS advertiser_verifications;
DROP TABLE IF EXISTS advertiser_consumptions;
DROP TABLE IF EXISTS campaign_stats;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS sensitive_words;
```

### 5.4 表结构变更总结

| 表名 | 变更类型 | 说明 |
|-----|---------|------|
| advertiser_verifications | 新增 | 广告主认证信息 |
| advertiser_consumptions | 新增 | 广告主消费记录 |
| campaign_stats | 新增 | 活动统计数据 |
| settings | 新增 | 系统配置 |
| sensitive_words | 新增 | 敏感词库 |
| advertisers | 不变 | 已有表 |
| campaigns | 不变 | 已有表 |
| orders | 不变 | 已有表 |
| order_disputes | 不变 | 已有表 |
| transactions | 不变 | 已有表 |

---

## 6. 总结

本文档详细设计了 AIAds 管理后台剩余模块的技术架构，包括：

1. **广告主管理模块**: 提供广告主信息管理、认证审核、资金管理能力
2. **活动管理模块**: 提供活动全生命周期管理、数据统计、异常监控能力
3. **订单管理模块**: 提供订单管理、纠纷处理能力
4. **系统设置模块**: 提供系统配置、管理员管理、权限管理、审计日志、敏感词管理、系统监控、备份管理能力

### 6.1 技术特点

- **前后端分离**: React 前端 + Express 后端
- **类型安全**: TypeScript 全栈类型安全
- **权限控制**: 基于 RBAC 的细粒度权限控制
- **数据安全**: 敏感操作审计日志，数据变更可追溯
- **性能优化**: 数据库索引优化，缓存策略

### 6.2 下一步工作

1. 根据本文档实现后端 API
2. 根据本文档实现前端页面
3. 编写单元测试和集成测试
4. 进行数据库迁移
5. 部署上线

---

**文档结束**
