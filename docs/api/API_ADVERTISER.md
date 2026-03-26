# AIAds 广告主 API

**版本**: 1.0.0
**最后更新**: 2026 年 3 月 24 日

---

## 目录

1. [广告主账户](#1-广告主账户)
2. [活动管理](#2-活动管理)
3. [KOL 发现](#3-kol-发现)
4. [订单管理](#4-订单管理)
5. [支付管理](#5-支付管理)
6. [数据分析](#6-数据分析)

---

## 1. 广告主账户

### 1.1 获取广告主信息

获取当前登录广告主的详细信息。

#### 请求

```http
GET /v1/advertisers/me
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "company_name": "某某科技有限公司",
    "business_license": "91440300MA5XXXXX",
    "business_license_url": "https://...",
    "legal_representative": "张三",
    "contact_person": "李四",
    "contact_phone": "+86-13800138000",
    "contact_email": "contact@example.com",
    "industry": "电子产品",
    "company_size": "100-500",
    "website": "https://example.com",
    "verification_status": "approved",
    "verified_at": "2026-03-24T10:00:00Z",
    "wallet_balance": 1000000,
    "frozen_balance": 200000,
    "total_recharged": 5000000,
    "total_spent": 4000000,
    "subscription_plan": "professional",
    "subscription_expires_at": "2026-12-31T23:59:59Z",
    "total_campaigns": 10,
    "active_campaigns": 3,
    "total_orders": 50,
    "created_at": "2026-03-24T10:00:00Z"
  }
}
```

**注意：** 金额单位为分（1000000 = ¥10,000.00）

### 1.2 创建广告主信息

创建广告主账户信息（注册后首次使用）。

#### 请求

```http
POST /v1/advertisers
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `company_name` | string | ✅ | 公司名称 |
| `business_license` | string | ✅ | 营业执照号 |
| `legal_representative` | string | ✅ | 法人代表姓名 |
| `contact_person` | string | ✅ | 联系人姓名 |
| `contact_phone` | string | ✅ | 联系人电话 |
| `contact_email` | string | ✅ | 联系邮箱 |
| `industry` | string | ✅ | 所属行业 |
| `company_size` | string | ✅ | 公司规模 |
| `website` | string | ❌ | 公司官网 |

#### 请求示例

```json
{
  "company_name": "某某科技有限公司",
  "business_license": "91440300MA5XXXXX",
  "legal_representative": "张三",
  "contact_person": "李四",
  "contact_phone": "+86-13800138000",
  "contact_email": "contact@example.com",
  "industry": "电子产品",
  "company_size": "100-500",
  "website": "https://example.com"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "company_name": "某某科技有限公司",
    "verification_status": "pending",
    "created_at": "2026-03-24T10:00:00Z"
  },
  "message": "广告主信息创建成功，请等待审核"
}
```

### 1.3 更新广告主信息

更新广告主账户信息。

#### 请求

```http
PATCH /v1/advertisers/me
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `contact_person` | string | ❌ | 联系人姓名 |
| `contact_phone` | string | ❌ | 联系人电话 |
| `contact_email` | string | ❌ | 联系邮箱 |
| `website` | string | ❌ | 公司官网 |

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "contact_person": "王五",
    "contact_phone": "+86-13900139000"
  }
}
```

### 1.4 上传营业执照

上传营业执照图片。

#### 请求

```http
POST /v1/advertisers/me/business-license
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | file | ✅ | 营业执照图片（JPG/PNG，≤5MB） |

#### 响应

```json
{
  "success": true,
  "data": {
    "business_license_url": "https://r2.aiads.com/business-licenses/xxx.jpg"
  },
  "message": "营业执照上传成功"
}
```

---

## 2. 活动管理

### 2.1 创建活动

创建新的广告投放活动。

#### 请求

```http
POST /v1/campaigns
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 活动标题（5-50 字符） |
| `description` | string | ✅ | 活动描述（最多 500 字符） |
| `objective` | string | ✅ | 目标：`awareness`/`consideration`/`conversion` |
| `budget` | integer | ✅ | 预算金额（分） |
| `budget_type` | string | ✅ | 预算类型：`fixed`/`dynamic` |
| `target_audience` | object | ✅ | 目标受众设置 |
| `target_platforms` | array | ✅ | 目标平台列表 |
| `min_followers` | integer | ✅ | 最低粉丝量 |
| `max_followers` | integer | ✅ | 最高粉丝量 |
| `min_engagement_rate` | number | ✅ | 最低互动率 |
| `content_requirements` | string | ❌ | 内容要求 |
| `required_hashtags` | array | ❌ | 必需标签 |
| `start_date` | string | ✅ | 开始日期（ISO 8601） |
| `end_date` | string | ✅ | 结束日期（ISO 8601） |

#### target_audience 结构

```json
{
  "age_range": "18-35",
  "gender": "all",
  "locations": ["US", "UK", "CA"],
  "interests": ["technology", "gadgets"]
}
```

#### 请求示例

```json
{
  "title": "春季新品推广",
  "description": "推广我们的春季新品电子产品",
  "objective": "awareness",
  "budget": 1000000,
  "budget_type": "fixed",
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
  "end_date": "2026-04-30T23:59:59Z"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "春季新品推广",
    "status": "draft",
    "budget": 1000000,
    "created_at": "2026-03-24T10:00:00Z"
  },
  "message": "活动创建成功"
}
```

### 2.2 获取活动列表

获取广告主的活动列表。

#### 请求

```http
GET /v1/campaigns?page=1&page_size=20&status=active
Authorization: Bearer <access_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | ❌ | 页码（默认 1） |
| `page_size` | integer | ❌ | 每页数量（默认 20，最大 100） |
| `status` | string | ❌ | 状态筛选 |
| `keyword` | string | ❌ | 关键词搜索 |
| `sort` | string | ❌ | 排序字段 |
| `order` | string | ❌ | 排序方向 |

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "春季新品推广",
        "description": "推广我们的春季新品电子产品",
        "objective": "awareness",
        "budget": 1000000,
        "spent_amount": 300000,
        "status": "active",
        "start_date": "2026-04-01T00:00:00Z",
        "end_date": "2026-04-30T23:59:59Z",
        "total_kols": 10,
        "selected_kols": 5,
        "published_videos": 3,
        "total_views": 50000,
        "created_at": "2026-03-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 10,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

### 2.3 获取活动详情

获取单个活动的详细信息。

#### 请求

```http
GET /v1/campaigns/:campaign_id
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "advertiser_id": "550e8400-e29b-41d4-a716-446655440000",
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
    "total_kols": 10,
    "applied_kols": 8,
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

### 2.4 更新活动

更新活动信息。

#### 请求

```http
PATCH /v1/campaigns/:campaign_id
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

可更新字段：
- `title`
- `description`
- `objective`
- `budget`
- `target_audience`
- `content_requirements`
- `status`（仅限 `draft`/`paused`/`cancelled`）

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "更新后的标题",
    "budget": 1500000,
    "updated_at": "2026-03-24T12:00:00Z"
  }
}
```

### 2.5 删除活动

删除活动（仅限草稿和已完成状态）。

#### 请求

```http
DELETE /v1/campaigns/:campaign_id
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "message": "活动删除成功"
}
```

### 2.6 启动活动

启动草稿状态的活动。

#### 请求

```http
POST /v1/campaigns/:campaign_id/start
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active"
  },
  "message": "活动已启动"
}
```

### 2.7 暂停活动

暂停进行中的活动。

#### 请求

```http
POST /v1/campaigns/:campaign_id/pause
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "paused"
  },
  "message": "活动已暂停"
}
```

---

## 3. KOL 发现

### 3.1 获取 KOL 列表

获取可合作的 KOL 列表。

#### 请求

```http
GET /v1/kols?page=1&page_size=20&platform=tiktok&min_followers=5000
Authorization: Bearer <access_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | ❌ | 页码 |
| `page_size` | integer | ❌ | 每页数量 |
| `platform` | string | ❌ | 平台筛选 |
| `min_followers` | integer | ❌ | 最低粉丝量 |
| `max_followers` | integer | ❌ | 最高粉丝量 |
| `min_engagement_rate` | number | ❌ | 最低互动率 |
| `category` | string | ❌ | 类别筛选 |
| `country` | string | ❌ | 国家筛选 |
| `keyword` | string | ❌ | 关键词搜索 |

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "platform": "tiktok",
        "platform_username": "@beautyguru",
        "platform_display_name": "Beauty Guru",
        "platform_avatar_url": "https://...",
        "bio": "美妆博主 | 分享美妆教程",
        "category": "beauty",
        "country": "US",
        "followers": 15000,
        "avg_views": 5000,
        "avg_likes": 500,
        "engagement_rate": 0.0333,
        "base_price": 30000,
        "currency": "USD",
        "total_orders": 20,
        "completed_orders": 18,
        "avg_rating": 4.8,
        "verified": true,
        "tags": ["美妆", "护肤", "教程"]
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

### 3.2 获取 KOL 详情

获取单个 KOL 的详细信息。

#### 请求

```http
GET /v1/kols/:kol_id
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "platform": "tiktok",
    "platform_id": "123456789",
    "platform_username": "@beautyguru",
    "platform_display_name": "Beauty Guru",
    "platform_avatar_url": "https://...",
    "bio": "美妆博主 | 分享美妆教程",
    "category": "beauty",
    "subcategory": "skincare",
    "country": "US",
    "region": "California",
    "city": "Los Angeles",
    "followers": 15000,
    "following": 500,
    "total_videos": 200,
    "total_likes": 100000,
    "avg_views": 5000,
    "avg_likes": 500,
    "avg_comments": 50,
    "avg_shares": 20,
    "engagement_rate": 0.0333,
    "base_price": 30000,
    "price_per_video": 25000,
    "currency": "USD",
    "total_orders": 20,
    "completed_orders": 18,
    "avg_rating": 4.8,
    "verified": true,
    "verified_at": "2026-03-20T10:00:00Z",
    "tags": ["美妆", "护肤", "教程"],
    "recent_videos": [
      {
        "video_id": "video_123",
        "title": "春季护肤 routine",
        "views": 8000,
        "likes": 800,
        "comments": 100,
        "published_at": "2026-03-22T10:00:00Z"
      }
    ],
    "stats_history": {
      "followers_growth_30d": 2000,
      "engagement_rate_trend": "increasing"
    }
  }
}
```

### 3.3 AI 推荐 KOL

使用 AI 推荐符合条件的 KOL。

#### 请求

```http
POST /v1/kols/recommend
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `campaign_id` | string | ❌ | 关联活动 ID（如有） |
| `criteria` | object | ✅ | 推荐条件 |
| `limit` | integer | ❌ | 返回数量（默认 20，最大 100） |

#### criteria 结构

```json
{
  "industry": "electronics",
  "target_audience": "18-35,male",
  "budget_range": [20000, 50000],
  "platforms": ["tiktok", "youtube"],
  "follower_range": [5000, 30000],
  "min_engagement_rate": 0.02,
  "countries": ["US", "UK", "CA"]
}
```

#### 请求示例

```json
{
  "criteria": {
    "industry": "electronics",
    "target_audience": "18-35,male",
    "budget_range": [20000, 50000],
    "platforms": ["tiktok", "youtube"],
    "follower_range": [5000, 30000],
    "min_engagement_rate": 0.02,
    "countries": ["US", "UK", "CA"]
  },
  "limit": 20
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "kol": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "platform_username": "@techreview",
          "followers": 25000,
          "engagement_rate": 0.045
        },
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

### 3.4 发起合作邀请

向 KOL 发起合作邀请。

#### 请求

```http
POST /v1/kols/:kol_id/invite
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `campaign_id` | string | ✅ | 关联活动 ID |
| `content_requirements` | string | ✅ | 内容要求 |
| `deadline` | string | ✅ | 期望发布日期 |
| `offer` | integer | ✅ | 报价（分） |
| `message` | string | ❌ | 备注信息 |

#### 请求示例

```json
{
  "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
  "content_requirements": "需要展示产品外观和使用场景",
  "deadline": "2026-04-15T23:59:59Z",
  "offer": 30000,
  "message": "期待您的合作！"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "invitation_id": "550e8400-e29b-41d4-a716-446655440100",
    "kol_id": "550e8400-e29b-41d4-a716-446655440001",
    "status": "sent",
    "created_at": "2026-03-24T10:00:00Z"
  },
  "message": "合作邀请已发送"
}
```

---

## 4. 订单管理

### 4.1 获取订单列表

获取广告主的订单列表。

#### 请求

```http
GET /v1/orders?page=1&page_size=20&status=in_progress
Authorization: Bearer <access_token>
```

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | ❌ | 页码 |
| `page_size` | integer | ❌ | 每页数量 |
| `status` | string | ❌ | 状态筛选 |
| `campaign_id` | string | ❌ | 活动 ID 筛选 |
| `kol_id` | string | ❌ | KOL ID 筛选 |

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
        "kol": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "platform_username": "@beautyguru",
          "platform": "tiktok"
        },
        "amount": 30000,
        "status": "in_progress",
        "content_url": null,
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

### 4.2 获取订单详情

获取单个订单的详细信息。

#### 请求

```http
GET /v1/orders/:order_id
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "kol": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "platform_username": "@beautyguru",
      "platform": "tiktok",
      "platform_display_name": "Beauty Guru"
    },
    "amount": 30000,
    "status": "in_progress",
    "content_requirements": "需要展示产品外观和使用场景",
    "deadline": "2026-04-15T23:59:59Z",
    "content_url": "https://tiktok.com/@beautyguru/video/123",
    "content_description": "春季新品评测视频",
    "submitted_at": "2026-04-10T10:00:00Z",
    "reviewed_at": null,
    "rejection_reason": null,
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-04-10T10:00:00Z"
  }
}
```

### 4.3 审核作品

审核 KOL 提交的作品。

#### 请求

```http
POST /v1/orders/:order_id/review
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `approved` | boolean | ✅ | 是否通过 |
| `rejection_reason` | string | ❌ | 拒绝原因（拒绝时必填） |

#### 请求示例（通过）

```json
{
  "approved": true
}
```

#### 请求示例（拒绝）

```json
{
  "approved": false,
  "rejection_reason": "视频中没有展示产品包装，请补充"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "order_id": "550e8400-e29b-41d4-a716-446655440200",
    "status": "completed",
    "reviewed_at": "2026-04-11T10:00:00Z"
  },
  "message": "审核成功"
}
```

### 4.4 评价 KOL

订单完成后评价 KOL。

#### 请求

```http
POST /v1/orders/:order_id/rate
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `rating` | integer | ✅ | 评分（1-5 星） |
| `comment` | string | ❌ | 评价内容 |
| `would_recommend` | boolean | ❌ | 是否推荐 |

#### 请求示例

```json
{
  "rating": 5,
  "comment": "合作非常愉快，KOL 很专业，按时发布高质量内容",
  "would_recommend": true
}
```

#### 响应

```json
{
  "success": true,
  "message": "评价成功"
}
```

---

## 5. 支付管理

### 5.1 获取账户余额

获取广告主账户余额信息。

#### 请求

```http
GET /v1/advertisers/me/balance
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "available_balance": 1000000,
    "frozen_balance": 200000,
    "total_balance": 1200000,
    "currency": "CNY"
  }
}
```

### 5.2 充值

创建充值订单。

#### 请求

```http
POST /v1/payments/recharge
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `amount` | integer | ✅ | 充值金额（分） |
| `payment_method` | string | ✅ | 支付方式 |
| `currency` | string | ❌ | 货币类型（默认 CNY） |

#### payment_method 选项

- `alipay` - 支付宝
- `wechat_pay` - 微信支付
- `union_pay` - 银联在线
- `stripe` - Stripe（国际信用卡）
- `bank_transfer` - 银行转账

#### 请求示例

```json
{
  "amount": 1000000,
  "payment_method": "alipay",
  "currency": "CNY"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "order_id": "550e8400-e29b-41d4-a716-446655440300",
    "amount": 1000000,
    "payment_method": "alipay",
    "payment_url": "https://open.alipay.com/...",
    "expires_at": "2026-03-24T11:00:00Z"
  },
  "message": "充值订单创建成功，请前往支付页面完成支付"
}
```

### 5.3 查询充值订单

查询充值订单状态。

#### 请求

```http
GET /v1/payments/recharge/:order_id
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "order_id": "550e8400-e29b-41d4-a716-446655440300",
    "amount": 1000000,
    "payment_method": "alipay",
    "status": "success",
    "paid_at": "2026-03-24T10:30:00Z",
    "created_at": "2026-03-24T10:00:00Z"
  }
}
```

### 5.4 获取充值记录

获取历史充值记录。

#### 请求

```http
GET /v1/payments/recharges?page=1&page_size=20
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "order_id": "550e8400-e29b-41d4-a716-446655440300",
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
      "total": 10,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

### 5.5 申请发票

申请开具发票。

#### 请求

```http
POST /v1/payments/invoice
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `recharge_order_ids` | array | ✅ | 充值订单 ID 列表 |
| `invoice_type` | string | ✅ | 发票类型 |
| `title` | string | ✅ | 发票抬头 |
| `tax_id` | string | ✅ | 纳税人识别号 |
| `email` | string | ✅ | 接收邮箱 |
| `address` | string | ❌ | 地址电话（专票需要） |
| `bank_info` | string | ❌ | 开户行及账号（专票需要） |

#### invoice_type 选项

- `special` - 增值税专用发票
- `normal` - 增值税普通发票
- `personal` - 个人发票

#### 请求示例

```json
{
  "recharge_order_ids": ["550e8400-e29b-41d4-a716-446655440300"],
  "invoice_type": "special",
  "title": "某某科技有限公司",
  "tax_id": "91440300MA5XXXXX",
  "email": "finance@example.com",
  "address": "深圳市南山区 xx 路 xx 号 0755-12345678",
  "bank_info": "招商银行深圳分行南山支行 7559****8888"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "invoice_id": "550e8400-e29b-41d4-a716-446655440400",
    "status": "pending",
    "created_at": "2026-03-24T10:00:00Z"
  },
  "message": "发票申请已提交，1-3 个工作日开具"
}
```

---

## 6. 数据分析

### 6.1 获取活动统计数据

获取单个活动的详细统计数据。

#### 请求

```http
GET /v1/campaigns/:campaign_id/stats
Authorization: Bearer <access_token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "overview": {
      "budget": 1000000,
      "spent": 300000,
      "budget_usage": 0.3,
      "total_views": 50000,
      "total_likes": 5000,
      "total_comments": 500,
      "total_shares": 200,
      "total_engagement": 5700,
      "ctr": 0.025,
      "engagement_rate": 0.114,
      "estimated_roi": 3.5
    },
    "trend": {
      "views": [
        {"date": "2026-04-01", "value": 5000},
        {"date": "2026-04-02", "value": 8000},
        {"date": "2026-04-03", "value": 12000}
      ],
      "engagement": [
        {"date": "2026-04-01", "value": 500},
        {"date": "2026-04-02", "value": 800},
        {"date": "2026-04-03", "value": 1200}
      ],
      "spent": [
        {"date": "2026-04-01", "value": 30000},
        {"date": "2026-04-02", "value": 50000},
        {"date": "2026-04-03", "value": 80000}
      ]
    },
    "kol_performance": [
      {
        "kol_id": "550e8400-e29b-41d4-a716-446655440001",
        "kol_name": "@beautyguru",
        "views": 20000,
        "engagement": 2000,
        "spent": 100000
      },
      {
        "kol_id": "550e8400-e29b-41d4-a716-446655440002",
        "kol_name": "@techreview",
        "views": 15000,
        "engagement": 1500,
        "spent": 80000
      }
    ]
  }
}
```

### 6.2 获取账户统计数据

获取广告主账户的整体统计数据。

#### 请求

```http
GET /v1/advertisers/me/stats
Authorization: Bearer <access_token>
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
    "overview": {
      "total_campaigns": 10,
      "active_campaigns": 3,
      "completed_campaigns": 7,
      "total_kols": 50,
      "total_orders": 100,
      "total_spent": 5000000,
      "total_views": 1000000,
      "total_engagement": 100000,
      "avg_roi": 3.2
    },
    "monthly_trend": [
      {
        "month": "2026-01",
        "spent": 1000000,
        "views": 200000,
        "engagement": 20000
      },
      {
        "month": "2026-02",
        "spent": 1500000,
        "views": 300000,
        "engagement": 30000
      },
      {
        "month": "2026-03",
        "spent": 2500000,
        "views": 500000,
        "engagement": 50000
      }
    ]
  }
}
```

### 6.3 导出报表

导出数据分析报表。

#### 请求

```http
POST /v1/reports/export
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `report_type` | string | ✅ | 报表类型 |
| `format` | string | ✅ | 导出格式 |
| `start_date` | string | ✅ | 开始日期 |
| `end_date` | string | ✅ | 结束日期 |
| `campaign_ids` | array | ❌ | 活动 ID 列表（不传则导出全部） |

#### report_type 选项

- `campaign_summary` - 活动汇总报表
- `campaign_detail` - 活动明细报表
- `kol_performance` - KOL 表现报表
- `video_detail` - 视频明细报表
- `financial` - 财务对账单

#### format 选项

- `xlsx` - Excel
- `csv` - CSV
- `pdf` - PDF

#### 请求示例

```json
{
  "report_type": "campaign_summary",
  "format": "xlsx",
  "start_date": "2026-03-01T00:00:00Z",
  "end_date": "2026-03-31T23:59:59Z"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "report_id": "550e8400-e29b-41d4-a716-446655440500",
    "status": "processing",
    "download_url": null,
    "expires_at": "2026-03-25T10:00:00Z"
  },
  "message": "报表生成中，请稍后查看。完成后将发送邮件通知。"
}
```

### 6.4 下载报表

下载已生成的报表。

#### 请求

```http
GET /v1/reports/:report_id/download
Authorization: Bearer <access_token>
```

#### 响应

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="campaign_summary_2026-03.xlsx"

<binary data>
```

---

## 附录

### A. 活动状态说明

| 状态 | 说明 | 可操作 |
|------|------|--------|
| `draft` | 草稿 | 编辑、删除、启动 |
| `pending_audit` | 待审核 | 等待审核 |
| `active` | 进行中 | 暂停、编辑 |
| `paused` | 已暂停 | 恢复、编辑 |
| `completed` | 已完成 | 查看、导出 |
| `cancelled` | 已取消 | 查看 |

### B. 订单状态说明

| 状态 | 说明 |
|------|------|
| `pending_accept` | 待 KOL 接受 |
| `accepted` | KOL 已接受 |
| `in_progress` | 创作中 |
| `pending_review` | 待审核 |
| `pending_revision` | 待修改 |
| `completed` | 已完成 |
| `cancelled` | 已取消 |
| `refunded` | 已退款 |

---

**AIAds 广告主 API 文档结束**
