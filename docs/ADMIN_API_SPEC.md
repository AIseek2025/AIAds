# AIAds 管理后台 API 规范

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**作者**: AIAds 架构团队
**保密级别**: 内部机密

---

## 1. API 概述

### 1.1 基础信息

| 项目 | 说明 |
|-----|------|
| **Base URL (生产)** | `https://api.aiads.com/api/v1/admin` |
| **Base URL (测试)** | `https://api-staging.aiads.com/api/v1/admin` |
| **认证方式** | JWT Bearer Token (管理员独立认证) |
| **数据格式** | JSON (UTF-8) |
| **字符编码** | UTF-8 |
| **时间格式** | ISO 8601 (UTC) |

### 1.2 认证说明

管理后台使用独立的管理员认证系统，与用户后台完全隔离。

**请求头格式**:
```
Authorization: Bearer <admin_access_token>
```

### 1.3 通用响应格式

#### 1.3.1 成功响应

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

#### 1.3.2 列表响应

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
  },
  "message": null
}
```

#### 1.3.3 错误响应

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

### 1.4 状态码

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

### 1.5 错误码

| 错误码 | 说明 | HTTP 状态码 |
|-------|------|-----------|
| `SUCCESS` | 成功 | 200 |
| `AUTH_REQUIRED` | 需要认证 | 401 |
| `TOKEN_INVALID` | Token 无效 | 401 |
| `TOKEN_EXPIRED` | Token 过期 | 401 |
| `FORBIDDEN` | 无权限 | 403 |
| `NOT_FOUND` | 资源不存在 | 404 |
| `VALIDATION_ERROR` | 验证错误 | 422 |
| `RATE_LIMITED` | 请求超限 | 429 |
| `INTERNAL_ERROR` | 内部错误 | 500 |
| `MFA_REQUIRED` | 需要 MFA 验证 | 403 |
| `IP_NOT_WHITELISTED` | IP 不在白名单 | 403 |

---

## 2. 管理员认证模块 (Auth)

### 2.1 管理员登录

**接口**: `POST /api/v1/admin/auth/login`

**描述**: 管理员登录，获取 Access Token 和 Refresh Token

**请求参数**:
```json
{
  "email": "admin@aiads.com",
  "password": "SecurePass123!",
  "mfa_code": "123456"  // 可选，启用了 MFA 时必需
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@aiads.com",
      "name": "系统管理员",
      "role": "super_admin",
      "avatar_url": "https://..."
    },
    "tokens": {
      "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 28800
    }
  },
  "message": "登录成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "邮箱或密码错误"
  }
}
```

---

### 2.2 刷新 Token

**接口**: `POST /api/v1/admin/auth/refresh`

**描述**: 使用 Refresh Token 刷新 Access Token

**请求参数**:
```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 28800
  }
}
```

---

### 2.3 获取当前管理员信息

**接口**: `GET /api/v1/admin/auth/me`

**描述**: 获取当前登录管理员的信息和权限

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@aiads.com",
      "name": "系统管理员",
      "role": "super_admin",
      "avatar_url": "https://...",
      "status": "active",
      "last_login_at": "2026-03-24T10:00:00Z",
      "last_login_ip": "192.168.1.1"
    },
    "role": {
      "id": "role_uuid",
      "name": "Super Admin",
      "description": "超级管理员"
    },
    "permissions": [
      "user:view",
      "user:create",
      "user:edit",
      "user:delete",
      "user:ban",
      "kol:view",
      "kol:review",
      "kol:approve",
      "finance:view",
      "finance:export",
      "dashboard:view",
      "settings:edit",
      "role:manage",
      "admin:manage",
      "audit:view"
    ]
  }
}
```

---

### 2.4 管理员登出

**接口**: `POST /api/v1/admin/auth/logout`

**描述**: 管理员登出，Token 加入黑名单

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

---

### 2.5 修改密码

**接口**: `POST /api/v1/admin/auth/change-password`

**描述**: 修改管理员密码（需要当前密码验证）

**请求参数**:
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewSecurePass123!"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

---

### 2.6 重置密码（管理员后台操作）

**接口**: `POST /api/v1/admin/auth/reset-password`

**描述**: 超级管理员重置其他管理员的密码

**权限**: `admin:reset_password`

**请求参数**:
```json
{
  "admin_id": "550e8400-e29b-41d4-a716-446655440000",
  "new_password": "NewSecurePass123!"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "密码重置成功"
}
```

---

## 3. 用户管理模块 (Users)

### 3.1 获取用户列表

**接口**: `GET /api/v1/admin/users`

**描述**: 获取平台用户列表（支持分页、过滤、搜索）

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 (最大 100) |
| `keyword` | string | - | 搜索关键词 (邮箱/手机/昵称) |
| `role` | string | - | 用户角色 (advertiser/kol) |
| `status` | string | - | 用户状态 (active/suspended/banned) |
| `email_verified` | boolean | - | 邮箱是否验证 |
| `created_after` | string | - | 注册开始日期 (ISO 8601) |
| `created_before` | string | - | 注册结束日期 (ISO 8601) |
| `sort` | string | created_at | 排序字段 |
| `order` | string | desc | 排序方向 (asc/desc) |

**请求示例**:
```
GET /api/v1/admin/users?page=1&page_size=20&role=advertiser&status=active&keyword=test
```

**响应示例**:
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
        "last_login_at": "2026-03-24T10:00:00Z",
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

---

### 3.2 获取用户详情

**接口**: `GET /api/v1/admin/users/:id`

**描述**: 获取指定用户的详细信息

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 用户 ID (UUID) |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "phone": "+86-13800138000",
    "nickname": "用户昵称",
    "avatar_url": "https://...",
    "real_name": "真实姓名",
    "role": "advertiser",
    "status": "active",
    "email_verified": true,
    "email_verified_at": "2026-03-20T10:05:00Z",
    "phone_verified": true,
    "phone_verified_at": "2026-03-20T10:06:00Z",
    "language": "zh-CN",
    "timezone": "Asia/Shanghai",
    "currency": "CNY",
    "last_login_at": "2026-03-24T10:00:00Z",
    "last_login_ip": "192.168.1.100",
    "failed_login_attempts": 0,
    "created_at": "2026-03-20T10:00:00Z",
    "updated_at": "2026-03-24T10:00:00Z",
    
    "advertiser_profile": {
      "id": "adv_uuid",
      "company_name": "某某科技有限公司",
      "business_license": "91440300MA5XXXXX",
      "verification_status": "approved",
      "wallet_balance": 10000.00,
      "frozen_balance": 2000.00,
      "total_spent": 5000.00
    },
    
    "kol_profile": null,
    
    "statistics": {
      "total_campaigns": 5,
      "active_campaigns": 2,
      "total_orders": 10,
      "total_transactions": 25
    }
  }
}
```

---

### 3.3 封禁用户

**接口**: `POST /api/v1/admin/users/:id/ban`

**描述**: 封禁违规用户

**权限**: `user:ban`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 用户 ID (UUID) |

**请求参数**:
```json
{
  "reason": "发布违规内容",
  "duration_days": 30,  // 封禁天数，null 表示永久封禁
  "note": "内部备注信息"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "banned",
    "banned_at": "2026-03-24T10:00:00Z",
    "banned_until": "2026-04-23T10:00:00Z",
    "ban_reason": "发布违规内容"
  },
  "message": "用户已封禁"
}
```

---

### 3.4 解封用户

**接口**: `POST /api/v1/admin/users/:id/unban`

**描述**: 解封被封禁的用户

**权限**: `user:unban`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 用户 ID (UUID) |

**请求参数**:
```json
{
  "note": "申诉成功，解封用户"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "unbanned_at": "2026-03-24T10:00:00Z"
  },
  "message": "用户已解封"
}
```

---

### 3.5 冻结用户账号

**接口**: `POST /api/v1/admin/users/:id/suspend`

**描述**: 临时冻结用户账号（用于调查期间）

**权限**: `user:suspend`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 用户 ID (UUID) |

**请求参数**:
```json
{
  "reason": "涉嫌欺诈，调查中",
  "duration_hours": 72
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "suspended",
    "suspended_at": "2026-03-24T10:00:00Z",
    "suspended_until": "2026-03-27T10:00:00Z"
  },
  "message": "用户已冻结"
}
```

---

### 3.6 重置用户密码

**接口**: `POST /api/v1/admin/users/:id/reset-password`

**描述**: 管理员重置用户密码

**权限**: `user:reset_password`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 用户 ID (UUID) |

**请求参数**:
```json
{
  "new_password": "TempPass123!",
  "send_email": true  // 是否发送邮件通知
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "密码已重置，通知邮件已发送"
}
```

---

## 4. KOL 审核模块 (KOLs)

### 4.1 获取待审核 KOL 列表

**接口**: `GET /api/v1/admin/kols/pending`

**描述**: 获取待审核的 KOL 认证申请列表

**权限**: `kol:review`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `platform` | string | - | 平台 (tiktok/youtube/instagram) |
| `sort` | string | created_at | 排序字段 |
| `order` | string | desc | 排序方向 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "user_id": "user_uuid",
        "user": {
          "email": "kol@example.com",
          "nickname": "博主昵称"
        },
        "platform": "tiktok",
        "platform_id": "123456789",
        "platform_username": "@beautyguru",
        "platform_display_name": "Beauty Guru",
        "followers": 15000,
        "engagement_rate": 0.0333,
        "category": "beauty",
        "country": "US",
        "status": "pending",
        "submitted_at": "2026-03-24T09:00:00Z",
        "created_at": "2026-03-24T09:00:00Z"
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

### 4.2 获取 KOL 详情

**接口**: `GET /api/v1/admin/kols/:id`

**描述**: 获取 KOL 详细信息（包括统计数据历史）

**权限**: `kol:view`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | KOL ID (UUID) |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "user_uuid",
    "platform": "tiktok",
    "platform_id": "123456789",
    "platform_username": "@beautyguru",
    "platform_display_name": "Beauty Guru",
    "platform_avatar_url": "https://...",
    "bio": "美妆博主 | 分享美妆教程",
    "category": "beauty",
    "subcategory": "skincare",
    "country": "US",
    "followers": 15000,
    "following": 500,
    "total_videos": 200,
    "avg_views": 5000,
    "avg_likes": 500,
    "avg_comments": 50,
    "engagement_rate": 0.0333,
    "base_price": 300.00,
    "status": "pending",
    "verified": false,
    "total_orders": 0,
    "completed_orders": 0,
    "tags": ["美妆", "护肤"],
    "stats_history": [
      {
        "date": "2026-03-01",
        "followers": 13000,
        "engagement_rate": 0.0320
      },
      {
        "date": "2026-03-15",
        "followers": 14000,
        "engagement_rate": 0.0325
      },
      {
        "date": "2026-03-24",
        "followers": 15000,
        "engagement_rate": 0.0333
      }
    ],
    "created_at": "2026-03-20T10:00:00Z"
  }
}
```

---

### 4.3 通过 KOL 审核

**接口**: `POST /api/v1/admin/kols/:id/approve`

**描述**: 审核通过 KOL 认证申请

**权限**: `kol:approve`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | KOL ID (UUID) |

**请求参数**:
```json
{
  "note": "资料真实有效，通过审核",
  "set_verified": true  // 是否同时设置为已认证
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "status": "active",
    "verified": true,
    "verified_at": "2026-03-24T10:00:00Z",
    "verified_by": "admin_uuid"
  },
  "message": "KOL 审核通过"
}
```

---

### 4.4 拒绝 KOL 审核

**接口**: `POST /api/v1/admin/kols/:id/reject`

**描述**: 拒绝 KOL 认证申请

**权限**: `kol:reject`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | KOL ID (UUID) |

**请求参数**:
```json
{
  "reason": "粉丝数据造假",
  "note": "内部备注"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "status": "rejected",
    "rejected_at": "2026-03-24T10:00:00Z",
    "rejected_by": "admin_uuid",
    "rejection_reason": "粉丝数据造假"
  },
  "message": "KOL 审核拒绝"
}
```

---

### 4.5 暂停 KOL 资格

**接口**: `POST /api/v1/admin/kols/:id/suspend`

**描述**: 暂停 KOL 的接单资格

**权限**: `kol:suspend`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | KOL ID (UUID) |

**请求参数**:
```json
{
  "reason": "多次未按时交付",
  "duration_days": 30
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "KOL 资格已暂停"
}
```

---

### 4.6 获取 KOL 列表

**接口**: `GET /api/v1/admin/kols`

**描述**: 获取所有 KOL 列表（支持过滤）

**权限**: `kol:view`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `status` | string | - | 状态 (pending/active/verified/suspended/banned) |
| `platform` | string | - | 平台 |
| `category` | string | - | 分类 |
| `min_followers` | integer | - | 最小粉丝数 |
| `max_followers` | integer | - | 最大粉丝数 |
| `verified` | boolean | - | 是否认证 |

---

## 5. 内容审核模块 (Content)

### 5.1 获取待审核内容列表

**接口**: `GET /api/v1/admin/content/pending`

**描述**: 获取待审核的用户提交内容列表

**权限**: `content:review`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `content_type` | string | - | 内容类型 (video/image/post) |
| `source_type` | string | - | 来源类型 (kol_profile/campaign_content/user_report) |
| `priority` | string | - | 优先级 (high/normal/low) |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "content_type": "video",
        "source_type": "campaign_content",
        "title": "产品评测视频",
        "thumbnail_url": "https://...",
        "content_url": "https://...",
        "duration": 120,
        "submitter": {
          "id": "kol_uuid",
          "name": "博主名称",
          "platform": "tiktok"
        },
        "related_order_id": "order_uuid",
        "priority": "normal",
        "status": "pending",
        "submitted_at": "2026-03-24T09:00:00Z",
        "ai_score": 85,
        "ai_flags": []
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 35
    }
  }
}
```

---

### 5.2 获取内容详情

**接口**: `GET /api/v1/admin/content/:id`

**描述**: 获取内容详细信息

**权限**: `content:view`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 内容 ID (UUID) |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "content_type": "video",
    "source_type": "campaign_content",
    "title": "产品评测视频",
    "description": "详细的产品使用体验分享",
    "thumbnail_url": "https://...",
    "content_url": "https://...",
    "duration": 120,
    "submitter": {
      "id": "kol_uuid",
      "name": "博主名称",
      "platform": "tiktok"
    },
    "related_order": {
      "id": "order_uuid",
      "order_no": "ORD-20260324-00001",
      "campaign_title": "春季新品推广"
    },
    "ai_review": {
      "score": 85,
      "flags": [],
      "suggestions": ["内容质量良好，建议通过"]
    },
    "status": "pending",
    "submitted_at": "2026-03-24T09:00:00Z",
    "created_at": "2026-03-24T09:00:00Z"
  }
}
```

---

### 5.3 通过内容审核

**接口**: `POST /api/v1/admin/content/:id/approve`

**描述**: 审核通过内容

**权限**: `content:approve`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 内容 ID (UUID) |

**请求参数**:
```json
{
  "note": "内容符合规范，审核通过"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "内容审核通过"
}
```

---

### 5.4 拒绝内容审核

**接口**: `POST /api/v1/admin/content/:id/reject`

**描述**: 拒绝内容审核

**权限**: `content:reject`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 内容 ID (UUID) |

**请求参数**:
```json
{
  "reason": "内容包含虚假信息",
  "require_revision": true,
  "revision_note": "请修改产品效果描述，避免夸大"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "内容审核拒绝，已要求修改"
}
```

---

### 5.5 删除违规内容

**接口**: `DELETE /api/v1/admin/content/:id`

**描述**: 删除违规内容

**权限**: `content:delete`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 内容 ID (UUID) |

**请求参数**:
```json
{
  "reason": "包含违法违规内容",
  "notify_user": true,
  "ban_user": false
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "内容已删除"
}
```

---

## 6. 财务管理模块 (Finance)

### 6.1 获取交易列表

**接口**: `GET /api/v1/admin/finance/transactions`

**描述**: 获取平台所有交易记录

**权限**: `finance:view`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `type` | string | - | 交易类型 (recharge/order_payment/withdrawal/refund) |
| `status` | string | - | 交易状态 (pending/completed/failed/cancelled) |
| `payment_method` | string | - | 支付方式 |
| `user_id` | string | - | 用户 ID |
| `min_amount` | number | - | 最小金额 |
| `max_amount` | number | - | 最大金额 |
| `created_after` | string | - | 开始日期 |
| `created_before` | string | - | 结束日期 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440020",
        "transaction_no": "TXN-20260324-00001",
        "type": "recharge",
        "amount": 10000.00,
        "currency": "CNY",
        "payment_method": "alipay",
        "payment_ref": "alipay_ref_123",
        "status": "completed",
        "user": {
          "id": "advertiser_uuid",
          "email": "advertiser@example.com",
          "company_name": "某某公司"
        },
        "balance_before": 5000.00,
        "balance_after": 15000.00,
        "description": "广告主充值",
        "completed_at": "2026-03-24T10:00:00Z",
        "created_at": "2026-03-24T09:55:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 500
    }
  }
}
```

---

### 6.2 获取待审核提现列表

**接口**: `GET /api/v1/admin/finance/withdrawals/pending`

**描述**: 获取待审核的 KOL 提现申请

**权限**: `withdrawal:review`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 |
| `min_amount` | number | - | 最小金额 |
| `max_amount` | number | - | 最大金额 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440030",
        "withdrawal_no": "WD-20260324-00001",
        "kol": {
          "id": "kol_uuid",
          "name": "博主名称",
          "platform": "tiktok",
          "platform_username": "@beautyguru"
        },
        "amount": 5000.00,
        "currency": "USD",
        "payment_method": "paypal",
        "payment_account": "kol@paypal.com",
        "status": "pending",
        "available_balance": 8000.00,
        "note": "KOL 备注信息",
        "submitted_at": "2026-03-24T09:00:00Z",
        "created_at": "2026-03-24T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 15
    }
  }
}
```

---

### 6.3 获取提现详情

**接口**: `GET /api/v1/admin/finance/withdrawals/:id`

**描述**: 获取提现申请详细信息

**权限**: `withdrawal:review`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 提现 ID (UUID) |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440030",
    "withdrawal_no": "WD-20260324-00001",
    "kol": {
      "id": "kol_uuid",
      "user_id": "user_uuid",
      "name": "博主名称",
      "email": "kol@example.com",
      "platform": "tiktok",
      "platform_username": "@beautyguru"
    },
    "amount": 5000.00,
    "currency": "USD",
    "payment_method": "paypal",
    "payment_account": "kol@paypal.com",
    "payment_account_name": "Account Name",
    "bank_info": {
      "bank_name": "Bank Name",
      "account_number": "****1234",
      "routing_number": "****5678",
      "swift_code": "XXXXXX"
    },
    "status": "pending",
    "available_balance": 8000.00,
    "pending_balance": 1000.00,
    "total_earnings": 15000.00,
    "note": "KOL 备注信息",
    "admin_note": null,
    "submitted_at": "2026-03-24T09:00:00Z",
    "created_at": "2026-03-24T09:00:00Z",
    "transaction_history": [
      {
        "action": "submitted",
        "admin_email": null,
        "note": "KOL 提交提现申请",
        "created_at": "2026-03-24T09:00:00Z"
      }
    ]
  }
}
```

---

### 6.4 通过提现申请

**接口**: `POST /api/v1/admin/finance/withdrawals/:id/approve`

**描述**: 审核通过提现申请

**权限**: `withdrawal:approve`

**敏感操作**: 需要二次验证 (MFA)

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 提现 ID (UUID) |

**请求参数**:
```json
{
  "note": "审核通过，已安排打款",
  "mfa_code": "123456"  // 二次验证
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "提现申请已批准，款项将在 1-3 个工作日内到账"
}
```

---

### 6.5 拒绝提现申请

**接口**: `POST /api/v1/admin/finance/withdrawals/:id/reject`

**描述**: 拒绝提现申请

**权限**: `withdrawal:reject`

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| `id` | string | 提现 ID (UUID) |

**请求参数**:
```json
{
  "reason": "账户信息不正确",
  "note": "请核对 PayPal 账户后重新提交"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "提现申请已拒绝，金额已退回可用余额"
}
```

---

### 6.6 导出财务报表

**接口**: `POST /api/v1/admin/finance/transactions/export`

**描述**: 导出交易记录为 CSV/Excel 文件

**权限**: `finance:export`

**请求参数**:
```json
{
  "format": "csv",
  "filters": {
    "type": "recharge",
    "status": "completed",
    "created_after": "2026-03-01T00:00:00Z",
    "created_before": "2026-03-31T23:59:59Z"
  },
  "fields": ["transaction_no", "type", "amount", "status", "created_at"]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "download_url": "https://r2.aiads.com/exports/transactions_20260324.csv",
    "expires_at": "2026-03-25T10:00:00Z",
    "record_count": 500
  },
  "message": "报表生成成功，下载链接 24 小时后过期"
}
```

---

## 7. 数据看板模块 (Dashboard)

### 7.1 获取平台统计数据

**接口**: `GET /api/v1/admin/dashboard/stats`

**描述**: 获取平台核心统计数据（实时）

**权限**: `dashboard:view`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `period` | string | today | 统计周期 (today/week/month/quarter/year/custom) |
| `start_date` | string | - | 自定义开始日期 |
| `end_date` | string | - | 自定义结束日期 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2026-03-24T00:00:00Z",
      "end": "2026-03-24T23:59:59Z"
    },
    "users": {
      "total": 5000,
      "new_today": 150,
      "active_today": 800,
      "advertisers": 2000,
      "kols": 3000
    },
    "campaigns": {
      "total": 500,
      "active": 100,
      "completed_today": 15,
      "total_budget": 500000.00,
      "spent_amount": 350000.00
    },
    "orders": {
      "total": 2000,
      "pending": 50,
      "in_progress": 100,
      "completed_today": 30
    },
    "finance": {
      "total_revenue": 100000.00,
      "today_revenue": 5000.00,
      "total_payout": 80000.00,
      "today_payout": 3000.00,
      "pending_withdrawals": 15000.00
    },
    "content": {
      "pending_review": 35,
      "approved_today": 50,
      "rejected_today": 5
    }
  }
}
```

---

### 7.2 获取数据分析数据

**接口**: `GET /api/v1/admin/dashboard/analytics`

**描述**: 获取详细数据分析数据（用于图表展示）

**权限**: `analytics:view`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `metric` | string | - | 指标类型 (user_growth/revenue/trends/platform_distribution) |
| `period` | string | month | 统计周期 |
| `group_by` | string | day | 分组维度 (day/week/month) |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user_growth": {
      "labels": ["2026-03-01", "2026-03-02", ..., "2026-03-24"],
      "series": {
        "new_users": [50, 60, 55, ..., 150],
        "active_users": [300, 320, 310, ..., 800],
        "advertisers": [20, 25, 22, ..., 60],
        "kols": [30, 35, 33, ..., 90]
      }
    },
    "revenue_trend": {
      "labels": ["2026-03-01", "2026-03-02", ..., "2026-03-24"],
      "series": {
        "revenue": [1000, 1200, 1100, ..., 5000],
        "payout": [800, 900, 850, ..., 3000]
      }
    },
    "platform_distribution": {
      "tiktok": 60,
      "youtube": 25,
      "instagram": 10,
      "xiaohongshu": 3,
      "weibo": 2
    },
    "category_distribution": {
      "beauty": 30,
      "fashion": 25,
      "technology": 20,
      "lifestyle": 15,
      "others": 10
    }
  }
}
```

---

### 7.3 获取 KOL 排行榜

**接口**: `GET /api/v1/admin/dashboard/kol-rankings`

**描述**: 获取 KOL 排行榜数据

**权限**: `dashboard:view`

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `metric` | string | earnings | 排序指标 (earnings/orders/followers/engagement) |
| `limit` | integer | 10 | 返回数量 |
| `platform` | string | - | 平台过滤 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "metric": "earnings",
    "period": "month",
    "rankings": [
      {
        "rank": 1,
        "kol": {
          "id": "kol_uuid",
          "name": "Top KOL 1",
          "platform": "tiktok",
          "avatar_url": "https://..."
        },
        "value": 50000.00,
        "change": "+15%"
      },
      {
        "rank": 2,
        "kol": {
          "id": "kol_uuid",
          "name": "Top KOL 2",
          "platform": "youtube",
          "avatar_url": "https://..."
        },
        "value": 45000.00,
        "change": "+8%"
      }
    ]
  }
}
```

---

## 8. 系统设置模块 (Settings)

### 8.1 获取系统配置

**接口**: `GET /api/v1/admin/settings`

**描述**: 获取系统配置信息

**权限**: `settings:view`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "platform": {
      "name": "AIAds",
      "logo_url": "https://...",
      "support_email": "support@aiads.com",
      "maintenance_mode": false
    },
    "commission": {
      "default_rate": 0.20,
      "min_rate": 0.10,
      "max_rate": 0.30
    },
    "withdrawal": {
      "min_amount": 100,
      "max_amount": 50000,
      "processing_days": 3,
      "auto_approve_threshold": 1000
    },
    "kyc": {
      "enabled": true,
      "required_for_withdrawal": true,
      "min_withdrawal_amount": 500
    }
  }
}
```

---

### 8.2 更新系统配置

**接口**: `PATCH /api/v1/admin/settings`

**描述**: 更新系统配置

**权限**: `settings:edit`

**敏感操作**: 需要二次验证

**请求参数**:
```json
{
  "commission": {
    "default_rate": 0.25
  },
  "withdrawal": {
    "min_amount": 200
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

---

### 8.3 获取角色列表

**接口**: `GET /api/v1/admin/settings/roles`

**描述**: 获取管理员角色列表

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
        "is_system": true,
        "permissions": ["user:view", "user:create", ...],
        "admin_count": 2,
        "created_at": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 8.4 创建角色

**接口**: `POST /api/v1/admin/settings/roles`

**描述**: 创建新的管理员角色

**权限**: `role:manage`

**请求参数**:
```json
{
  "name": "Custom Admin",
  "description": "自定义管理员",
  "permissions": ["user:view", "kol:view", "dashboard:view"]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "new_role_uuid",
    "name": "Custom Admin",
    "permissions": ["user:view", "kol:view", "dashboard:view"]
  },
  "message": "角色创建成功"
}
```

---

### 8.5 获取审计日志

**接口**: `GET /api/v1/admin/settings/audit-logs`

**描述**: 获取管理员操作审计日志

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
| `ip_address` | string | - | IP 地址 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "log_uuid",
        "admin": {
          "id": "admin_uuid",
          "email": "admin@aiads.com",
          "name": "系统管理员"
        },
        "action": "approve",
        "resource_type": "withdrawal",
        "resource_id": "withdrawal_uuid",
        "resource_name": "WD-20260324-00001",
        "request_method": "POST",
        "request_path": "/api/v1/admin/finance/withdrawals/xxx/approve",
        "ip_address": "192.168.1.1",
        "geo_location": {
          "country": "CN",
          "region": "Beijing",
          "city": "Beijing"
        },
        "status": "success",
        "created_at": "2026-03-24T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1000
    }
  }
}
```

---

### 8.6 获取管理员列表

**接口**: `GET /api/v1/admin/settings/admins`

**描述**: 获取管理员账号列表

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
        "role": {
          "id": "role_uuid",
          "name": "Super Admin"
        },
        "status": "active",
        "last_login_at": "2026-03-24T10:00:00Z",
        "last_login_ip": "192.168.1.1",
        "created_at": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 8.7 创建管理员

**接口**: `POST /api/v1/admin/settings/admins`

**描述**: 创建新的管理员账号

**权限**: `admin:manage`

**敏感操作**: 需要二次验证

**请求参数**:
```json
{
  "email": "newadmin@aiads.com",
  "name": "新管理员",
  "password": "SecurePass123!",
  "role_id": "role_uuid",
  "mfa_enabled": true
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
    "role_id": "role_uuid"
  },
  "message": "管理员创建成功"
}
```

---

## 9. 附录

### 9.1 通用查询参数

所有列表接口支持以下通用参数：

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `page` | integer | 1 | 页码 |
| `page_size` | integer | 20 | 每页数量 (最大 100) |
| `sort` | string | created_at | 排序字段 |
| `order` | string | desc | 排序方向 (asc/desc) |

### 9.2 通用响应字段

**分页字段**:
- `page`: 当前页码
- `page_size`: 每页数量
- `total`: 总记录数
- `total_pages`: 总页数
- `has_next`: 是否有下一页
- `has_prev`: 是否有上一页

### 9.3 速率限制

| 接口类型 | 限制 | 说明 |
|---------|------|------|
| 认证接口 | 10 请求/15 分钟 | 防止暴力破解 |
| 普通接口 | 100 请求/分钟 | 一般业务接口 |
| 导出接口 | 10 请求/小时 | 防止资源滥用 |
| 敏感操作 | 30 请求/分钟 | 财务/审核接口 |

### 9.4 运维脚本与批量订单指标（与实现同步）

| 能力 | 说明 |
|-----|------|
| **HTTP** | `PUT /orders/metrics/batch`，请求体 `{ "items": [ { "order_id", "views"?, ... } ] }`，最多 200 条；须 `Authorization: Bearer` 且具备相应订单权限。 |
| **Shell** | 仓库 `scripts/cron-order-metrics-batch.sh`：传入 JSON 文件；支持 `--dry-run`、`AIADS_CURL_MAX_TIME`。 |
| **DB → JSON** | `npm run metrics:batch-payload`（`src/backend`），由 `src/scripts/lib/orderMetricsBatchPayload.ts` 组装与 `generate` 脚本一致。 |
| **DB → API** | `npm run metrics:batch-sync`（`sync-order-metrics-batch-once.ts`）：无临时文件；环境变量 `AIADS_ADMIN_TOKEN`、`AIADS_ADMIN_API`、`AIADS_HTTP_TIMEOUT_MS`；可选 `--dry-run`。 |
| **Crontab 示例** | `scripts/examples/crontab-order-metrics.example` |

### 9.5 Playwright 管理端 API 回归（可选集成）

在仓库 `tests/` 或**仓库根**执行 `npm run test:e2e:api`（根目录脚本转发到 `tests/`）。`tests/global-setup.ts` 会加载根目录与 `tests/.env`，并可由管理员邮箱密码注入 `AIADS_E2E_ADMIN_TOKEN`、自动选取 `AIADS_E2E_ORDER_ID`（见 `tests/.env.example`）。以下为常用环境变量：

| 变量 | 说明 |
|-----|------|
| `AIADS_E2E_API_BASE` | 后端根 URL，如 `http://localhost:8080`（无尾斜杠） |
| `AIADS_E2E_ADMIN_TOKEN` | 管理端 `Authorization: Bearer` |
| `AIADS_E2E_ADMIN_EMAIL` / `AIADS_E2E_ADMIN_PASSWORD` | `admin-api-login.spec.ts`；亦可用于 global-setup 换 Token |
| `AIADS_E2E_ORDER_ID` | 可选，真实订单 UUID，`admin-api-order-by-id.spec.ts` |
| `AIADS_E2E_ADVERTISER_EMAIL` / `AIADS_E2E_ADVERTISER_PASSWORD` | `integration-order-lifecycle-api.spec.ts`（广告主须已建档且 `wallet_balance ≥ 100`） |
| `AIADS_E2E_KOL_EMAIL` / `AIADS_E2E_KOL_PASSWORD` | 同上（KOL 须已建档） |

草案索引见 `docs/drafts/README.md`。演练前可执行 `scripts/check-e2e-api-env.sh`（掩码打印 Token，缺省时退出码 1）。

### 9.6 版本历史

| 版本 | 日期 | 变更说明 |
|-----|------|---------|
| 1.0 | 2026-03-24 | 初始版本 |
| 1.1 | 2026-03-27 | 附录 9.4：批量指标运维脚本与脚本入口 |
| 1.2 | 2026-03-27 | 附录 9.5：Playwright E2E 环境变量与 `docs/drafts` 索引 |
| 1.3 | 2026-03-27 | 附录 9.5：根目录 `npm run test:e2e:api`、`check-e2e-api-env.sh` |
| 1.4 | 2026-03-27 | 附录 9.5：`integration-order-lifecycle-api` 与广告主/KOL 环境变量 |
