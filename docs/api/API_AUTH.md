# AIAds 认证 API

**版本**: 1.0.0
**最后更新**: 2026 年 3 月 24 日

---

## 目录

1. [用户注册](#1-用户注册)
2. [用户登录](#2-用户登录)
3. [刷新 Token](#3-刷新-token)
4. [用户登出](#4-用户登出)
5. [发送验证码](#5-发送验证码)
6. [验证验证码](#6-验证验证码)
7. [重置密码](#7-重置密码)
8. [获取用户信息](#8-获取用户信息)
9. [更新用户信息](#9-更新用户信息)
10. [修改密码](#10-修改密码)

---

## 1. 用户注册

注册新用户账号。

### 请求

```http
POST /v1/auth/register
Content-Type: application/json
```

### 请求参数

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `email` | string | ✅ | 邮箱地址 | `user@example.com` |
| `password` | string | ✅ | 密码（8-20 位，含大小写字母和数字） | `SecurePass123!` |
| `phone` | string | ✅ | 手机号（带国际区号） | `+86-13800138000` |
| `role` | string | ✅ | 用户角色：`advertiser`/`kol` | `advertiser` |
| `verification_code` | string | ✅ | 邮箱/手机验证码 | `123456` |
| `nickname` | string | ❌ | 昵称 | `用户昵称` |
| `invite_code` | string | ❌ | 邀请码（可选） | `INVITE123` |

### 请求示例

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "phone": "+86-13800138000",
  "role": "advertiser",
  "verification_code": "123456",
  "nickname": "用户昵称"
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone": "+86-13800138000",
      "role": "advertiser",
      "status": "pending",
      "email_verified": true,
      "phone_verified": true,
      "created_at": "2026-03-24T10:00:00Z"
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

### 错误响应

#### 邮箱已存在

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "该邮箱已被注册"
  }
}
```

#### 验证码错误

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "验证码错误或已过期"
  }
}
```

---

## 2. 用户登录

用户登录获取访问令牌。

### 请求

```http
POST /v1/auth/login
Content-Type: application/json
```

### 请求参数

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `email` | string | ✅ | 邮箱地址 | `user@example.com` |
| `password` | string | ✅ | 密码 | `SecurePass123!` |
| `two_factor_code` | string | ❌ | 两步验证码（如开启） | `123456` |

### 请求示例

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "role": "advertiser",
      "nickname": "用户昵称",
      "avatar_url": "https://...",
      "email_verified": true,
      "phone_verified": true
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

### 错误响应

#### 凭证错误

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "邮箱或密码错误"
  }
}
```

#### 需要两步验证

```json
{
  "success": false,
  "error": {
    "code": "TWO_FACTOR_REQUIRED",
    "message": "需要提供两步验证码",
    "details": {
      "two_factor_required": true
    }
  }
}
```

#### 账号被禁用

```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_DISABLED",
    "message": "账号已被禁用，请联系客服"
  }
}
```

---

## 3. 刷新 Token

使用 Refresh Token 获取新的 Access Token。

### 请求

```http
POST /v1/auth/refresh
Content-Type: application/json
```

### 请求参数

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `refresh_token` | string | ✅ | Refresh Token | `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...` |

### 请求示例

```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 响应

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

### 错误响应

#### Token 无效

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_INVALID",
    "message": "Refresh Token 无效"
  }
}
```

#### Token 过期

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Refresh Token 已过期"
  }
}
```

---

## 4. 用户登出

用户登出，使 Token 失效。

### 请求

```http
POST /v1/auth/logout
Authorization: Bearer <access_token>
```

### 请求参数

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `refresh_token` | string | ❌ | Refresh Token（可选，用于使 Refresh Token 也失效） | `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...` |

### 响应

```json
{
  "success": true,
  "message": "登出成功"
}
```

---

## 5. 发送验证码

发送邮箱或手机验证码。

### 请求

```http
POST /v1/auth/verification-code
Content-Type: application/json
```

### 请求参数

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `type` | string | ✅ | 验证类型：`email`/`phone` | `email` |
| `target` | string | ✅ | 邮箱或手机号 | `user@example.com` |
| `purpose` | string | ✅ | 用途：`register`/`login`/`reset_password`/`bind` | `register` |
| `language` | string | ❌ | 验证码语言：`zh-CN`/`en-US` | `zh-CN` |

### 请求示例

```json
{
  "type": "email",
  "target": "user@example.com",
  "purpose": "register"
}
```

### 响应

```json
{
  "success": true,
  "message": "验证码已发送，5 分钟内有效"
}
```

### 错误响应

#### 发送过于频繁

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "发送过于频繁，请 60 秒后再试",
    "details": {
      "retry_after": 60
    }
  }
}
```

---

## 6. 验证验证码

验证邮箱或手机验证码。

### 请求

```http
POST /v1/auth/verify-code
Content-Type: application/json
```

### 请求参数

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `type` | string | ✅ | 验证类型：`email`/`phone` | `email` |
| `target` | string | ✅ | 邮箱或手机号 | `user@example.com` |
| `code` | string | ✅ | 6 位验证码 | `123456` |

### 请求示例

```json
{
  "type": "email",
  "target": "user@example.com",
  "code": "123456"
}
```

### 响应

```json
{
  "success": true,
  "message": "验证成功"
}
```

### 错误响应

#### 验证码错误

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "验证码错误"
  }
}
```

#### 验证码过期

```json
{
  "success": false,
  "error": {
    "code": "CODE_EXPIRED",
    "message": "验证码已过期，请重新获取"
  }
}
```

---

## 7. 重置密码

通过验证码重置密码。

### 请求

```http
POST /v1/auth/reset-password
Content-Type: application/json
```

### 请求参数

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `email` | string | ✅ | 邮箱地址 | `user@example.com` |
| `verification_code` | string | ✅ | 验证码 | `123456` |
| `new_password` | string | ✅ | 新密码 | `NewSecurePass123!` |

### 请求示例

```json
{
  "email": "user@example.com",
  "verification_code": "123456",
  "new_password": "NewSecurePass123!"
}
```

### 响应

```json
{
  "success": true,
  "message": "密码重置成功"
}
```

---

## 8. 获取用户信息

获取当前登录用户的详细信息。

### 请求

```http
GET /v1/users/me
Authorization: Bearer <access_token>
```

### 响应

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
    "two_factor_enabled": false,
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-03-24T10:00:00Z"
  }
}
```

---

## 9. 更新用户信息

更新当前用户的信息。

### 请求

```http
PATCH /v1/users/me
Authorization: Bearer <access_token>
Content-Type: application/json
```

### 请求参数

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `nickname` | string | ❌ | 昵称 | `新昵称` |
| `avatar_url` | string | ❌ | 头像 URL | `https://...` |
| `language` | string | ❌ | 语言：`zh-CN`/`en-US` | `en-US` |
| `timezone` | string | ❌ | 时区 | `Asia/Shanghai` |

### 请求示例

```json
{
  "nickname": "新昵称",
  "avatar_url": "https://...",
  "language": "en-US"
}
```

### 响应

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

---

## 10. 修改密码

修改当前用户的密码。

### 请求

```http
POST /v1/users/me/change-password
Authorization: Bearer <access_token>
Content-Type: application/json
```

### 请求参数

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `current_password` | string | ✅ | 当前密码 | `OldPass123!` |
| `new_password` | string | ✅ | 新密码 | `NewPass123!` |

### 请求示例

```json
{
  "current_password": "OldPass123!",
  "new_password": "NewPass123!"
}
```

### 响应

```json
{
  "success": true,
  "message": "密码修改成功"
}
```

### 错误响应

#### 当前密码错误

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "当前密码错误"
  }
}
```

#### 新密码与旧密码相同

```json
{
  "success": false,
  "error": {
    "code": "SAME_PASSWORD",
    "message": "新密码不能与旧密码相同"
  }
}
```

---

## 附录

### A. Token 结构

#### Access Token Payload

```json
{
  "sub": "user_id",
  "role": "advertiser",
  "iat": 1679644800,
  "exp": 1679648400,
  "jti": "unique_token_id"
}
```

#### Refresh Token Payload

```json
{
  "sub": "user_id",
  "type": "refresh",
  "iat": 1679644800,
  "exp": 1680249600,
  "jti": "unique_token_id"
}
```

### B. 安全建议

1. **Token 存储**：
   - Access Token 存储在内存中
   - Refresh Token 存储在 HttpOnly Cookie 中
   - 不要将 Token 存储在 localStorage

2. **Token 刷新**：
   - Access Token 过期前 5 分钟自动刷新
   - Refresh Token 使用一次后轮换

3. **密码安全**：
   - 密码长度至少 8 位
   - 包含大小写字母、数字和特殊字符
   - 定期更换密码

---

**AIAds 认证 API 文档结束**
