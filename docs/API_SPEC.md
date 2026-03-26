# AIAds API 接口规范

**版本**: 1.0  
**创建日期**: 2026 年 3 月 24 日  
**作者**: AIAds 架构团队  
**保密级别**: 内部机密

---

## 1. API 设计概述

### 1.1 设计风格

```
• RESTful API 设计原则
• 资源导向的 URL 结构
• 标准的 HTTP 方法
• JSON 请求/响应格式
• JWT Token 认证
• 版本控制 (URL Path)
```

### 1.2 基础信息

| 项目 | 说明 |
|-----|------|
| **Base URL (生产)** | `https://api.aiads.com/v1` |
| **Base URL (测试)** | `https://api-staging.aiads.com/v1` |
| **认证方式** | JWT Bearer Token |
| **数据格式** | JSON (UTF-8) |
| **字符编码** | UTF-8 |
| **时间格式** | ISO 8601 (UTC) |

### 1.3 API 版本控制

```
URL Path 版本控制:
• /v1/ - 第一版 API (当前)
• /v2/ - 第二版 API (未来)

版本策略:
• 向后兼容的变更不升级版本号
• 破坏性变更需要升级版本号
• 旧版本至少维护 6 个月
```

---

## 2. 通用规范

### 2.1 HTTP 方法

| 方法 | 说明 | 幂等性 |
|-----|------|-------|
| `GET` | 获取资源 | 是 |
| `POST` | 创建资源 | 否 |
| `PUT` | 全量更新资源 | 是 |
| `PATCH` | 部分更新资源 | 否 |
| `DELETE` | 删除资源 | 是 |

### 2.2 状态码

| 状态码 | 说明 |
|-------|------|
| **2xx 成功** | |
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功 (无内容) |
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

### 2.3 响应格式

#### 2.3.1 成功响应

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "created_at": "2026-03-24T10:00:00Z"
  },
  "message": "操作成功"
}
```

#### 2.3.2 列表响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Item 1"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Item 2"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  },
  "message": null
}
```

#### 2.3.3 错误响应

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
      }
    ]
  },
  "request_id": "req_123456789"
}
```

### 2.4 错误码定义

| 错误码 | 说明 | HTTP 状态码 |
|-------|------|-----------|
| `SUCCESS` | 成功 | 200 |
| `VALIDATION_ERROR` | 验证错误 | 422 |
| `AUTH_REQUIRED` | 需要认证 | 401 |
| `TOKEN_INVALID` | Token 无效 | 401 |
| `TOKEN_EXPIRED` | Token 过期 | 401 |
| `FORBIDDEN` | 无权限 | 403 |
| `NOT_FOUND` | 资源不存在 | 404 |
| `CONFLICT` | 资源冲突 | 409 |
| `RATE_LIMITED` | 请求超限 | 429 |
| `INTERNAL_ERROR` | 内部错误 | 500 |
| `SERVICE_UNAVAILABLE` | 服务不可用 | 503 |

---

## 3. 认证规范

### 3.1 JWT Token 结构

```
Header:
{
  "alg": "RS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "user_id",
  "role": "advertiser",
  "iat": 1679644800,
  "exp": 1679648400,
  "jti": "unique_token_id"
}

Signature:
RS256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  private_key
)
```

### 3.2 认证流程

```
1. 用户登录
   POST /auth/login
   → Access Token + Refresh Token

2. API 请求
   Header: Authorization: Bearer <access_token>

3. Token 刷新 (Access Token 过期时)
   POST /auth/refresh
   Body: { "refresh_token": "xxx" }
   → New Access Token + Refresh Token

4. 用户登出
   POST /auth/logout
   → Token 加入黑名单
```

### 3.3 Token 有效期

| Token 类型 | 有效期 | 用途 |
|-----------|-------|------|
| **Access Token** | 1 小时 | API 请求认证 |
| **Refresh Token** | 7 天 | 刷新 Access Token |

---

## 4. 分页和过滤

### 4.1 分页参数

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 (从 1 开始) |
| `page_size` | integer | 20 | 每页数量 (最大 100) |
| `sort` | string | `created_at` | 排序字段 |
| `order` | string | `desc` | 排序方向 (asc/desc) |

### 4.2 过滤参数

| 参数 | 类型 | 说明 |
|-----|------|------|
| `status` | string | 状态过滤 |
| `keyword` | string | 关键词搜索 |
| `start_date` | string | 开始日期 (ISO 8601) |
| `end_date` | string | 结束日期 (ISO 8601) |
| `{field}` | string | 字段精确匹配 |
| `{field}_in` | string | 字段 IN 查询 (逗号分隔) |
| `{field}_gt` | number | 字段大于 |
| `{field}_gte` | number | 字段大于等于 |
| `{field}_lt` | number | 字段小于 |
| `{field}_lte` | number | 字段小于等于 |

### 4.3 分页响应

```json
{
  "success": true,
  "data": {
    "items": [...],
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

---

## 5. API 接口定义

### 5.1 认证模块 (Auth)

#### 5.1.1 用户注册

```http
POST /v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "phone": "+86-13800138000",
  "role": "advertiser",
  "verification_code": "123456"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "role": "advertiser",
      "status": "pending"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 3600
    }
  },
  "message": "注册成功"
}
```

#### 5.1.2 用户登录

```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "role": "advertiser",
      "nickname": "用户昵称",
      "avatar_url": "https://..."
    },
    "tokens": {
      "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 3600
    }
  },
  "message": "登录成功"
}
```

#### 5.1.3 刷新 Token

```http
POST /v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应:**
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

#### 5.1.4 用户登出

```http
POST /v1/auth/logout
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "message": "登出成功"
}
```

#### 5.1.5 发送验证码

```http
POST /v1/auth/verification-code
Content-Type: application/json

{
  "type": "email",
  "target": "user@example.com",
  "purpose": "register"
}
```

**响应:**
```json
{
  "success": true,
  "message": "验证码已发送"
}
```

#### 5.1.6 验证验证码

```http
POST /v1/auth/verify-code
Content-Type: application/json

{
  "type": "email",
  "target": "user@example.com",
  "code": "123456"
}
```

**响应:**
```json
{
  "success": true,
  "message": "验证成功"
}
```

#### 5.1.7 重置密码

```http
POST /v1/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "verification_code": "123456",
  "new_password": "NewSecurePass123!"
}
```

**响应:**
```json
{
  "success": true,
  "message": "密码重置成功"
}
```

---

### 5.2 用户模块 (Users)

#### 5.2.1 获取当前用户信息

```http
GET /v1/users/me
Authorization: Bearer <access_token>
```

**响应:**
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
    "language": "zh-CN",
    "timezone": "Asia/Shanghai",
    "created_at": "2026-03-24T10:00:00Z"
  }
}
```

#### 5.2.2 更新用户信息

```http
PATCH /v1/users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "nickname": "新昵称",
  "avatar_url": "https://...",
  "language": "en-US"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nickname": "新昵称",
    "avatar_url": "https://...",
    "language": "en-US"
  }
}
```

#### 5.2.3 修改密码

```http
POST /v1/users/me/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "current_password": "OldPass123!",
  "new_password": "NewPass123!"
}
```

**响应:**
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

---

### 5.3 广告主模块 (Advertisers)

#### 5.3.1 获取广告主信息

```http
GET /v1/advertisers/me
Authorization: Bearer <access_token>
```

**响应:**
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
    "wallet_balance": 10000.00,
    "frozen_balance": 2000.00,
    "total_recharged": 50000.00,
    "total_spent": 40000.00,
    "subscription_plan": "professional",
    "subscription_expires_at": "2026-12-31T23:59:59Z",
    "total_campaigns": 10,
    "active_campaigns": 3,
    "total_orders": 50,
    "created_at": "2026-03-24T10:00:00Z"
  }
}
```

#### 5.3.2 创建广告主信息

```http
POST /v1/advertisers
Authorization: Bearer <access_token>
Content-Type: application/json

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

**响应:**
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

#### 5.3.3 更新广告主信息

```http
PATCH /v1/advertisers/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "contact_person": "王五",
  "contact_phone": "+86-13900139000"
}
```

**响应:**
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

#### 5.3.4 上传营业执照

```http
POST /v1/advertisers/me/business-license
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file: <营业执照图片文件>
```

**响应:**
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

### 5.4 KOL 模块 (KOLs)

#### 5.4.1 获取 KOL 列表 (公开)

```http
GET /v1/kols?page=1&page_size=20&platform=tiktok&min_followers=5000&max_followers=50000&category=beauty&country=US
Authorization: Bearer <access_token>
```

**响应:**
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
        "base_price": 300.00,
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

#### 5.4.2 获取 KOL 详情

```http
GET /v1/kols/{kol_id}
Authorization: Bearer <access_token>
```

**响应:**
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
    "base_price": 300.00,
    "price_per_video": 250.00,
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

#### 5.4.3 AI 推荐 KOL

```http
POST /v1/kols/recommend
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
  "criteria": {
    "industry": "electronics",
    "target_audience": "18-35,male",
    "budget_range": [200, 500],
    "platforms": ["tiktok", "youtube"],
    "follower_range": [5000, 30000],
    "min_engagement_rate": 0.02,
    "countries": ["US", "UK", "CA"]
  },
  "limit": 20
}
```

**响应:**
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

#### 5.4.4 KOL 认证 (KOL 端)

```http
POST /v1/kols/verify
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "platform": "tiktok",
  "platform_username": "@myaccount",
  "authorization_code": "auth_code_from_tiktok"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "kol_id": "550e8400-e29b-41d4-a716-446655440001",
    "platform": "tiktok",
    "platform_username": "@myaccount",
    "followers": 10000,
    "status": "pending",
    "message": "认证申请已提交，请等待审核"
  }
}
```

#### 5.4.5 更新 KOL 信息 (KOL 端)

```http
PATCH /v1/kols/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "bio": "科技博主 | 产品评测",
  "category": "technology",
  "base_price": 500.00,
  "tags": ["科技", "评测", "数码"]
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "bio": "科技博主 | 产品评测",
    "category": "technology",
    "base_price": 500.00,
    "tags": ["科技", "评测", "数码"]
  }
}
```

---

### 5.5 活动模块 (Campaigns)

#### 5.5.1 创建活动

```http
POST /v1/campaigns
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "春季新品推广",
  "description": "推广我们的春季新品电子产品",
  "objective": "awareness",
  "budget": 10000.00,
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
  "required_categories": ["technology"],
  "target_countries": ["US", "UK", "CA"],
  "content_requirements": "需要展示产品外观和功能",
  "required_hashtags": ["#TechReview", "#NewProduct"],
  "start_date": "2026-04-01",
  "end_date": "2026-04-30",
  "deadline": "2026-04-25T23:59:59Z"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "春季新品推广",
    "status": "draft",
    "budget": 10000.00,
    "created_at": "2026-03-24T10:00:00Z"
  },
  "message": "活动创建成功"
}
```

#### 5.5.2 获取活动列表

```http
GET /v1/campaigns?page=1&status=active&sort=created_at&order=desc
Authorization: Bearer <access_token>
```

**响应:**
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
        "budget": 10000.00,
        "spent_amount": 3000.00,
        "status": "active",
        "start_date": "2026-04-01",
        "end_date": "2026-04-30",
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
      "total_pages": 1
    }
  }
}
```

#### 5.5.3 获取活动详情

```http
GET /v1/campaigns/{campaign_id}
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "advertiser_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "春季新品推广",
    "description": "推广我们的春季新品电子产品",
    "objective": "awareness",
    "budget": 10000.00,
    "budget_type": "fixed",
    "spent_amount": 3000.00,
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
    "required_categories": ["technology"],
    "target_countries": ["US", "UK", "CA"],
    "content_requirements": "需要展示产品外观和功能",
    "required_hashtags": ["#TechReview", "#NewProduct"],
    "start_date": "2026-04-01",
    "end_date": "2026-04-30",
    "deadline": "2026-04-25T23:59:59Z",
    "status": "active",
    "total_kols": 10,
    "applied_kols": 8,
    "selected_kols": 5,
    "published_videos": 3,
    "total_views": 50000,
    "total_likes": 5000,
    "total_comments": 500,
    "reviewed_at": "2026-03-24T12:00:00Z",
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-03-24T12:00:00Z",
    "assets": [
      {
        "id": "asset_id",
        "type": "brief",
        "name": "产品简报.pdf",
        "file_url": "https://..."
      }
    ],
    "orders": [
      {
        "id": "order_id",
        "kol_username": "@techreview",
        "status": "published",
        "price": 500.00
      }
    ]
  }
}
```

#### 5.5.4 更新活动

```http
PATCH /v1/campaigns/{campaign_id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "春季新品推广 - 更新",
  "budget": 15000.00,
  "deadline": "2026-04-30T23:59:59Z"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "春季新品推广 - 更新",
    "budget": 15000.00,
    "deadline": "2026-04-30T23:59:59Z"
  }
}
```

#### 5.5.5 删除活动

```http
DELETE /v1/campaigns/{campaign_id}
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "message": "活动已删除"
}
```

#### 5.5.6 提交活动审核

```http
POST /v1/campaigns/{campaign_id}/submit
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending_review"
  },
  "message": "活动已提交审核"
}
```

#### 5.5.7 上传活动素材

```http
POST /v1/campaigns/{campaign_id}/assets
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

type: brief
file: <文件>
name: 产品简报.pdf
description: 产品详细介绍
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "asset_id",
    "type": "brief",
    "name": "产品简报.pdf",
    "file_url": "https://r2.aiads.com/campaigns/xxx/brief.pdf"
  }
}
```

---

### 5.6 订单模块 (Orders)

#### 5.6.1 发起合作 (广告主)

```http
POST /v1/campaigns/{campaign_id}/orders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "kol_id": "550e8400-e29b-41d4-a716-446655440001",
  "price": 500.00,
  "content_type": "video",
  "content_count": 1,
  "content_description": "请制作一个产品评测视频",
  "deadline": "2026-04-20T23:59:59Z"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "order_no": "ORD-20260324-00001",
    "status": "pending",
    "price": 500.00,
    "platform_fee": 75.00,
    "kol_earning": 425.00,
    "created_at": "2026-03-24T10:00:00Z"
  },
  "message": "合作邀请已发送，等待 KOL 确认"
}
```

#### 5.6.2 获取订单列表

```http
GET /v1/orders?page=1&status=in_progress&type=advertiser
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "order_no": "ORD-20260324-00001",
        "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
        "campaign_title": "春季新品推广",
        "kol": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "platform_username": "@techreview",
          "platform": "tiktok"
        },
        "status": "in_progress",
        "price": 500.00,
        "content_type": "video",
        "deadline": "2026-04-20T23:59:59Z",
        "created_at": "2026-03-24T10:00:00Z"
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

#### 5.6.3 获取订单详情

```http
GET /v1/orders/{order_id}
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "order_no": "ORD-20260324-00001",
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "kol_id": "550e8400-e29b-41d4-a716-446655440001",
    "advertiser_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "in_progress",
    "price": 500.00,
    "platform_fee": 75.00,
    "kol_earning": 425.00,
    "content_type": "video",
    "content_count": 1,
    "content_description": "请制作一个产品评测视频",
    "draft_urls": [],
    "published_urls": [],
    "deadline": "2026-04-20T23:59:59Z",
    "accepted_at": "2026-03-24T11:00:00Z",
    "submitted_at": null,
    "approved_at": null,
    "published_at": null,
    "completed_at": null,
    "review_notes": null,
    "revision_count": 0,
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-03-24T11:00:00Z"
  }
}
```

#### 5.6.4 接受合作 (KOL)

```http
POST /v1/orders/{order_id}/accept
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "accepted",
    "accepted_at": "2026-03-24T11:00:00Z"
  },
  "message": "已接受合作"
}
```

#### 5.6.5 拒绝合作 (KOL)

```http
POST /v1/orders/{order_id}/reject
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "时间冲突，无法按时完成"
}
```

**响应:**
```json
{
  "success": true,
  "message": "已拒绝合作"
}
```

#### 5.6.6 提交内容 (KOL)

```http
POST /v1/orders/{order_id}/submit
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "draft_urls": ["https://tiktok.com/@user/video/123"],
  "content_description": "视频已完成，请审核"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "submitted",
    "submitted_at": "2026-03-24T15:00:00Z"
  },
  "message": "内容已提交，等待审核"
}
```

#### 5.6.7 审核内容 (广告主)

```http
POST /v1/orders/{order_id}/approve
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "approved": true,
  "notes": "内容很好，可以发布"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "approved",
    "approved_at": "2026-03-24T16:00:00Z"
  },
  "message": "内容已批准"
}
```

#### 5.6.8 要求修改 (广告主)

```http
POST /v1/orders/{order_id}/request-revision
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "需要增加产品展示时间"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "revision",
    "revision_count": 1
  },
  "message": "已要求修改"
}
```

#### 5.6.9 确认发布 (广告主)

```http
POST /v1/orders/{order_id}/confirm-publish
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "published_urls": ["https://tiktok.com/@user/video/123"]
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "published",
    "published_at": "2026-03-24T18:00:00Z"
  },
  "message": "发布已确认"
}
```

#### 5.6.10 完成订单 (广告主)

```http
POST /v1/orders/{order_id}/complete
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "completed_at": "2026-03-25T10:00:00Z"
  },
  "message": "订单已完成，KOL 收益已发放"
}
```

#### 5.6.11 评价订单

```http
POST /v1/orders/{order_id}/review
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 5,
  "review": "合作非常愉快，KOL 很专业"
}
```

**响应:**
```json
{
  "success": true,
  "message": "评价已提交"
}
```

---

### 5.7 支付模块 (Payments)

#### 5.7.1 创建充值订单

```http
POST /v1/payments/recharge
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 10000.00,
  "currency": "CNY",
  "payment_method": "alipay"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
    "transaction_no": "TXN-20260324-00001",
    "amount": 10000.00,
    "payment_method": "alipay",
    "status": "pending",
    "payment_url": "https://openapi.alipay.com/gateway.do?xxx",
    "qr_code": "data:image/png;base64,xxx",
    "expires_at": "2026-03-24T11:00:00Z"
  },
  "message": "充值订单创建成功，请扫码支付"
}
```

#### 5.7.2 查询支付状态

```http
GET /v1/payments/transactions/{transaction_id}
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "transaction_no": "TXN-20260324-00001",
    "type": "recharge",
    "amount": 10000.00,
    "currency": "CNY",
    "payment_method": "alipay",
    "payment_ref": "alipay_trade_no_xxx",
    "status": "completed",
    "balance_before": 5000.00,
    "balance_after": 15000.00,
    "completed_at": "2026-03-24T10:30:00Z",
    "created_at": "2026-03-24T10:00:00Z"
  }
}
```

#### 5.7.3 获取交易列表

```http
GET /v1/payments/transactions?type=recharge&page=1
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "transaction_no": "TXN-20260324-00001",
        "type": "recharge",
        "amount": 10000.00,
        "status": "completed",
        "payment_method": "alipay",
        "created_at": "2026-03-24T10:00:00Z"
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

#### 5.7.4 创建提现申请 (KOL)

```http
POST /v1/payments/withdrawals
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 1000.00,
  "method": "paypal",
  "recipient_name": "John Doe",
  "recipient_account": "john@example.com"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "withdrawal_no": "WD-20260324-00001",
    "amount": 1000.00,
    "fee": 10.00,
    "net_amount": 990.00,
    "status": "pending",
    "created_at": "2026-03-24T10:00:00Z"
  },
  "message": "提现申请已提交，请等待审核"
}
```

#### 5.7.5 获取提现记录 (KOL)

```http
GET /v1/payments/withdrawals?page=1
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "withdrawal_no": "WD-20260324-00001",
        "amount": 1000.00,
        "fee": 10.00,
        "net_amount": 990.00,
        "method": "paypal",
        "status": "completed",
        "completed_at": "2026-03-25T10:00:00Z",
        "created_at": "2026-03-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 3,
      "total_pages": 1
    }
  }
}
```

---

### 5.8 数据追踪模块 (Tracking)

#### 5.8.1 获取订单效果数据

```http
GET /v1/tracking/orders/{order_id}
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "summary": {
      "views": 50000,
      "likes": 5000,
      "comments": 500,
      "shares": 200,
      "engagement_rate": 0.114,
      "estimated_reach": 45000
    },
    "timeline": [
      {
        "date": "2026-03-24",
        "views": 20000,
        "likes": 2000,
        "comments": 200
      },
      {
        "date": "2026-03-25",
        "views": 30000,
        "likes": 3000,
        "comments": 300
      }
    ],
    "demographics": {
      "countries": [
        {"country": "US", "percentage": 0.6},
        {"country": "UK", "percentage": 0.25},
        {"country": "CA", "percentage": 0.15}
      ],
      "age_groups": [
        {"range": "18-24", "percentage": 0.4},
        {"range": "25-34", "percentage": 0.45},
        {"range": "35-44", "percentage": 0.15}
      ],
      "gender": {
        "male": 0.55,
        "female": 0.45
      }
    }
  }
}
```

#### 5.8.2 获取活动效果数据

```http
GET /v1/tracking/campaigns/{campaign_id}
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "summary": {
      "total_orders": 10,
      "completed_orders": 8,
      "total_views": 500000,
      "total_likes": 50000,
      "total_comments": 5000,
      "total_shares": 2000,
      "avg_engagement_rate": 0.114,
      "total_spent": 5000.00,
      "cost_per_view": 0.01,
      "cost_per_engagement": 0.088
    },
    "top_performers": [
      {
        "order_id": "order_1",
        "kol_username": "@techreview",
        "views": 100000,
        "engagement_rate": 0.15
      }
    ],
    "timeline": [...]
  }
}
```

#### 5.8.3 上报追踪事件

```http
POST /v1/tracking/events
Content-Type: application/json

{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "impression",
  "event_data": {
    "source": "tiktok",
    "device": "mobile"
  },
  "event_time": "2026-03-24T10:00:00Z"
}
```

**响应:**
```json
{
  "success": true,
  "message": "事件已记录"
}
```

---

### 5.9 通知模块 (Notifications)

#### 5.9.1 获取通知列表

```http
GET /v1/notifications?page=1&unread_only=true
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "type": "order",
        "title": "新的合作邀请",
        "content": "您收到一个新的合作邀请，请查看",
        "is_read": false,
        "action_url": "/orders/550e8400-e29b-41d4-a716-446655440000",
        "action_text": "查看详情",
        "created_at": "2026-03-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 5,
      "unread_count": 3
    }
  }
}
```

#### 5.9.2 标记通知为已读

```http
PATCH /v1/notifications/{notification_id}/read
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "is_read": true,
    "read_at": "2026-03-24T11:00:00Z"
  }
}
```

#### 5.9.3 全部标记为已读

```http
POST /v1/notifications/read-all
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "message": "所有通知已标记为已读"
}
```

---

### 5.10 管理后台模块 (Admin)

#### 5.10.1 获取用户列表

```http
GET /v1/admin/users?page=1&role=advertiser&status=active
Authorization: Bearer <admin_access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "role": "advertiser",
        "status": "active",
        "created_at": "2026-03-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100
    }
  }
}
```

#### 5.10.2 审核广告主

```http
POST /v1/admin/advertisers/{advertiser_id}/verify
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "approved": true,
  "notes": "资料审核通过"
}
```

**响应:**
```json
{
  "success": true,
  "message": "广告主认证已通过"
}
```

#### 5.10.3 审核 KOL

```http
POST /v1/admin/kols/{kol_id}/verify
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "approved": true,
  "notes": "账号验证通过"
}
```

**响应:**
```json
{
  "success": true,
  "message": "KOL 认证已通过"
}
```

#### 5.10.4 审核活动

```http
POST /v1/admin/campaigns/{campaign_id}/review
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "approved": true,
  "notes": "活动内容符合规范"
}
```

**响应:**
```json
{
  "success": true,
  "message": "活动审核已通过"
}
```

#### 5.10.5 获取平台统计数据

```http
GET /v1/admin/stats
Authorization: Bearer <admin_access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 5000,
      "advertisers": 1000,
      "kols": 3500,
      "new_today": 50
    },
    "campaigns": {
      "total": 500,
      "active": 100,
      "completed": 350
    },
    "orders": {
      "total": 2000,
      "pending": 50,
      "in_progress": 100,
      "completed": 1800
    },
    "financial": {
      "total_recharge": 1000000.00,
      "total_withdrawal": 500000.00,
      "total_commission": 150000.00,
      "gmv": 1500000.00
    },
    "period": {
      "start": "2026-03-01",
      "end": "2026-03-24"
    }
  }
}
```

---

## 6. 限流策略

### 6.1 限流规则

| 端点类型 | 限制 | 说明 |
|---------|------|------|
| **认证接口** | 10 次/分钟 | 防止暴力破解 |
| **普通 API** | 100 次/分钟 | 一般请求 |
| **搜索接口** | 30 次/分钟 | 资源密集型 |
| **上传接口** | 10 次/分钟 | 文件上传 |
| **管理接口** | 50 次/分钟 | 管理操作 |

### 6.2 限流响应

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "请求过于频繁，请稍后再试",
    "retry_after": 60
  }
}
```

---

## 7. Webhook 事件

### 7.1 支持的事件类型

| 事件 | 说明 | 触发时机 |
|-----|------|---------|
| `order.created` | 订单创建 | 广告主发起合作 |
| `order.accepted` | 订单接受 | KOL 接受合作 |
| `order.submitted` | 内容提交 | KOL 提交内容 |
| `order.approved` | 内容批准 | 广告主批准内容 |
| `order.published` | 内容发布 | KOL 发布内容 |
| `order.completed` | 订单完成 | 订单完成结算 |
| `payment.completed` | 支付完成 | 充值成功 |
| `withdrawal.completed` | 提现完成 | 提现到账 |

### 7.2 Webhook 格式

```json
{
  "id": "evt_123456789",
  "type": "order.completed",
  "created_at": "2026-03-24T10:00:00Z",
  "data": {
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "order_no": "ORD-20260324-00001",
    "status": "completed",
    "kol_id": "550e8400-e29b-41d4-a716-446655440001",
    "advertiser_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## 8. 附录

### 8.1 OpenAPI/Swagger 规范

完整的 OpenAPI 3.0 规范文件位于：
- `/docs/openapi.yaml` - OpenAPI 规范文件
- `https://api.aiads.com/v1/docs` - Swagger UI

### 8.2 SDK 和客户端

| 语言 | 仓库 | 状态 |
|-----|------|------|
| JavaScript/TypeScript | @aiads/sdk-js | 开发中 |
| Python | aiads-sdk-python | 计划中 |
| PHP | aiads-sdk-php | 计划中 |

### 8.3 参考文档

- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - 系统架构
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - 数据库设计
- [TECH_STACK.md](./TECH_STACK.md) - 技术选型

---

*本文档由 AIAds 架构团队编写，仅供内部技术参考*
*保密级别：内部机密*
