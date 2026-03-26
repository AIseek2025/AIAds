# AIAds API 实现文档

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**作者**: AIAds 开发团队

---

## 1. API 概述

### 1.1 基础信息

| 项目 | 说明 |
|-----|------|
| **Base URL** | `http://localhost:3000/api/v1` |
| **认证方式** | JWT Bearer Token |
| **数据格式** | JSON |
| **字符编码** | UTF-8 |

### 1.2 响应格式

所有 API 响应遵循统一格式:

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "request_id": "req_123456789"
}
```

错误响应:

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
  "request_id": "req_123456789"
}
```

---

## 2. 认证模块 (Auth)

### 2.1 用户注册

**接口**: `POST /api/v1/auth/register`

**权限**: 公开

**请求示例**:
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "phone": "+8613800138000",
  "role": "advertiser",
  "nickname": "用户昵称"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone": "+8613800138000",
      "nickname": "用户昵称",
      "role": "advertiser",
      "status": "pending",
      "email_verified": false,
      "created_at": "2026-03-24T10:00:00Z",
      "updated_at": "2026-03-24T10:00:00Z"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 3600
    }
  },
  "message": "注册成功"
}
```

**错误码**:
| 错误码 | 说明 |
|-------|------|
| `EMAIL_EXISTS` | 邮箱已被注册 |
| `VALIDATION_ERROR` | 参数验证失败 |

---

### 2.2 用户登录

**接口**: `POST /api/v1/auth/login`

**权限**: 公开

**请求示例**:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "nickname": "用户昵称",
      "role": "advertiser",
      "status": "active",
      "email_verified": true
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 3600
    }
  },
  "message": "登录成功"
}
```

**错误码**:
| 错误码 | 说明 |
|-------|------|
| `INVALID_CREDENTIALS` | 邮箱或密码错误 |
| `USER_DELETED` | 用户已被删除 |
| `USER_SUSPENDED` | 用户已被暂停 |

**限流**: 15 分钟内最多 10 次请求

---

### 2.3 刷新 Token

**接口**: `POST /api/v1/auth/refresh`

**权限**: 公开

**请求示例**:
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

**错误码**:
| 错误码 | 说明 |
|-------|------|
| `TOKEN_INVALID` | Token 无效 |
| `USER_NOT_FOUND` | 用户不存在 |
| `USER_INVALID` | 用户状态异常 |

---

### 2.4 用户登出

**接口**: `POST /api/v1/auth/logout`

**权限**: 已认证用户

**请求示例**:
```http
POST /api/v1/auth/logout
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

### 2.5 获取当前用户信息

**接口**: `GET /api/v1/auth/me`

**权限**: 已认证用户

**请求示例**:
```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "phone": "+8613800138000",
    "nickname": "用户昵称",
    "avatar_url": "https://...",
    "real_name": "真实姓名",
    "role": "advertiser",
    "status": "active",
    "email_verified": true,
    "phone_verified": false,
    "language": "zh-CN",
    "timezone": "Asia/Shanghai",
    "currency": "CNY",
    "last_login_at": "2026-03-24T10:00:00Z",
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-03-24T10:00:00Z"
  }
}
```

---

### 2.6 发送验证码

**接口**: `POST /api/v1/auth/verification-code`

**权限**: 公开

**请求示例**:
```http
POST /api/v1/auth/verification-code
Content-Type: application/json

{
  "type": "email",
  "target": "user@example.com",
  "purpose": "register"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "验证码已发送"
}
```

**错误码**:
| 错误码 | 说明 |
|-------|------|
| `RATE_LIMITED` | 请求过于频繁 |

**限流**: 5 分钟内最多 5 次请求

---

### 2.7 验证验证码

**接口**: `POST /api/v1/auth/verify-code`

**权限**: 公开

**请求示例**:
```http
POST /api/v1/auth/verify-code
Content-Type: application/json

{
  "type": "email",
  "target": "user@example.com",
  "code": "123456"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "验证成功"
}
```

**错误码**:
| 错误码 | 说明 |
|-------|------|
| `CODE_EXPIRED` | 验证码已过期 |
| `CODE_INVALID` | 验证码不正确 |

---

### 2.8 重置密码

**接口**: `POST /api/v1/auth/reset-password`

**权限**: 公开

**请求示例**:
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "type": "email",
  "target": "user@example.com",
  "code": "123456",
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

### 2.9 修改密码

**接口**: `POST /api/v1/auth/change-password`

**权限**: 已认证用户

**请求示例**:
```http
POST /api/v1/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

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

## 3. 用户管理模块 (Users)

### 3.1 获取用户详情

**接口**: `GET /api/v1/users/:id`

**权限**: 已认证用户

**请求示例**:
```http
GET /api/v1/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "phone": "+8613800138000",
    "nickname": "用户昵称",
    "avatar_url": "https://...",
    "real_name": "真实姓名",
    "role": "advertiser",
    "status": "active",
    "email_verified": true,
    "phone_verified": false,
    "language": "zh-CN",
    "timezone": "Asia/Shanghai",
    "currency": "CNY",
    "last_login_at": "2026-03-24T10:00:00Z",
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-03-24T10:00:00Z"
  }
}
```

**错误码**:
| 错误码 | 说明 |
|-------|------|
| `NOT_FOUND` | 用户不存在 |

---

### 3.2 更新用户信息

**接口**: `PUT /api/v1/users/:id`

**权限**: 用户本人或管理员

**请求示例**:
```http
PUT /api/v1/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "nickname": "新昵称",
  "avatar_url": "https://...",
  "language": "en-US",
  "timezone": "America/New_York",
  "currency": "USD"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "nickname": "新昵称",
    "avatar_url": "https://...",
    "role": "advertiser",
    "status": "active",
    "email_verified": true,
    "phone_verified": false,
    "language": "en-US",
    "timezone": "America/New_York",
    "currency": "USD",
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-03-24T11:00:00Z"
  },
  "message": "用户信息更新成功"
}
```

**错误码**:
| 错误码 | 说明 |
|-------|------|
| `NOT_FOUND` | 用户不存在 |
| `FORBIDDEN` | 没有权限修改 |
| `VALIDATION_ERROR` | 参数验证失败 |

---

### 3.3 删除用户

**接口**: `DELETE /api/v1/users/:id`

**权限**: 用户本人或管理员

**请求示例**:
```http
DELETE /api/v1/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "用户已删除"
}
```

**说明**: 软删除，将用户状态设置为 `deleted`

---

### 3.4 修改用户密码

**接口**: `POST /api/v1/users/:id/change-password`

**权限**: 用户本人或管理员

**请求示例**:
```http
POST /api/v1/users/550e8400-e29b-41d4-a716-446655440000/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

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

### 3.5 验证用户邮箱 (管理员)

**接口**: `POST /api/v1/users/:id/verify-email`

**权限**: 管理员

**请求示例**:
```http
POST /api/v1/users/550e8400-e29b-41d4-a716-446655440000/verify-email
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "邮箱验证成功"
}
```

---

### 3.6 验证用户手机 (管理员)

**接口**: `POST /api/v1/users/:id/verify-phone`

**权限**: 管理员

**请求示例**:
```http
POST /api/v1/users/550e8400-e29b-41d4-a716-446655440000/verify-phone
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "手机验证成功"
}
```

---

### 3.7 暂停用户 (管理员)

**接口**: `POST /api/v1/users/:id/suspend`

**权限**: 管理员

**请求示例**:
```http
POST /api/v1/users/550e8400-e29b-41d4-a716-446655440000/suspend
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "违反社区规定"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "用户已暂停"
}
```

---

### 3.8 激活用户 (管理员)

**接口**: `POST /api/v1/users/:id/activate`

**权限**: 管理员

**请求示例**:
```http
POST /api/v1/users/550e8400-e29b-41d4-a716-446655440000/activate
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "用户已激活"
}
```

---

## 4. 健康检查

### 4.1 API 健康状态

**接口**: `GET /api/v1/health`

**权限**: 公开

**请求示例**:
```http
GET /api/v1/health
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-03-24T10:00:00Z",
    "uptime": 3600
  }
}
```

---

## 5. 错误码总览

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| `SUCCESS` | 200 | 成功 |
| `VALIDATION_ERROR` | 422 | 验证错误 |
| `AUTH_REQUIRED` | 401 | 需要认证 |
| `TOKEN_INVALID` | 401 | Token 无效 |
| `TOKEN_EXPIRED` | 401 | Token 过期 |
| `FORBIDDEN` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `EMAIL_EXISTS` | 409 | 邮箱已存在 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `USER_DELETED` | 401 | 用户已删除 |
| `USER_SUSPENDED` | 403 | 用户已暂停 |
| `INVALID_CREDENTIALS` | 401 | 凭证无效 |
| `CODE_EXPIRED` | 400 | 验证码过期 |
| `CODE_INVALID` | 400 | 验证码无效 |
| `RATE_LIMITED` | 429 | 请求超限 |
| `INTERNAL_ERROR` | 500 | 内部错误 |

---

## 6. 认证流程

### 6.1 完整认证流程

```
1. 用户注册/登录
   POST /api/v1/auth/register 或 POST /api/v1/auth/login
   → 获取 Access Token 和 Refresh Token

2. 存储 Token
   - Access Token: 内存/localStorage (1 小时)
   - Refresh Token: localStorage (7 天)

3. API 请求
   Header: Authorization: Bearer <access_token>

4. Token 过期处理
   - Access Token 过期 → 使用 Refresh Token 刷新
   - Refresh Token 过期 → 重新登录

5. 用户登出
   POST /api/v1/auth/logout
   → Token 加入黑名单
```

### 6.2 Token 刷新示例

```typescript
// 前端示例
async function refreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  
  const data = await response.json();
  
  // 存储新 Token
  localStorage.setItem('access_token', data.data.access_token);
  localStorage.setItem('refresh_token', data.data.refresh_token);
  
  return data.data.access_token;
}
```

---

## 7. 最佳实践

### 7.1 安全建议

1. **密码要求**: 至少 8 位，包含大小写字母、数字和特殊字符
2. **Token 存储**: Access Token 存内存，Refresh Token 存 localStorage
3. **HTTPS**: 生产环境必须使用 HTTPS
4. **限流**: 敏感接口已配置限流，不要频繁请求

### 7.2 错误处理

```typescript
// 前端错误处理示例
try {
  const response = await api.post('/auth/login', credentials);
  // 处理成功
} catch (error) {
  if (error.response?.data?.error?.code === 'INVALID_CREDENTIALS') {
    // 处理登录失败
  } else if (error.response?.status === 429) {
    // 处理限流
  } else {
    // 处理其他错误
  }
}
```

### 7.3 请求示例 (Axios)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理 Token 过期
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token 过期，尝试刷新
      try {
        await refreshToken();
        // 重试原请求
        return api.request(error.config);
      } catch {
        // 刷新失败，跳转登录
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 8. 下一步

API 实现持续更新中，后续将添加:

- 广告主模块 (Advertisers)
- KOL 模块 (KOLs)
- 活动模块 (Campaigns)
- 订单模块 (Orders)
- 支付模块 (Payments)
- 数据追踪模块 (Tracking)

---

## 9. 技术支持

如有问题，请联系:

- Email: dev@aiads.com
- API 文档：http://localhost:3000/api-docs
