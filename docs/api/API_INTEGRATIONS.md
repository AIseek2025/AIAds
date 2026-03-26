# AIAds 第三方集成 API

**版本**: 1.0.0
**最后更新**: 2026 年 3 月 24 日

---

## 目录

1. [社交平台集成](#1-社交平台集成)
2. [支付集成](#2-支付集成)
3. [通讯服务集成](#3-通讯服务集成)
4. [云服务集成](#4-云服务集成)
5. [Webhook](#5-webhook)

---

## 1. 社交平台集成

### 1.1 TikTok 集成

#### 1.1.1 获取授权 URL

获取 TikTok 账号绑定授权 URL。

**请求**

```http
POST /v1/integrations/tiktok/auth-url
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `redirect_uri` | string | ✅ | 回调地址 |
| `state` | string | ✅ | 状态参数（防 CSRF） |

**请求示例**

```json
{
  "redirect_uri": "https://aiads.com/kol/accounts/callback",
  "state": "random_state_string"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "authorization_url": "https://www.tiktok.com/auth/authorize?client_id=xxx&redirect_uri=xxx&state=xxx",
    "state": "random_state_string",
    "expires_in": 600
  }
}
```

#### 1.1.2 处理授权回调

处理 TikTok 授权回调，获取访问令牌。

**请求**

```http
POST /v1/integrations/tiktok/callback
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | ✅ | 授权码 |
| `state` | string | ✅ | 状态参数 |

**响应**

```json
{
  "success": true,
  "data": {
    "account_id": "550e8400-e29b-41d4-a716-446655440100",
    "platform": "tiktok",
    "platform_username": "@myaccount",
    "platform_display_name": "My Account",
    "followers": 15000,
    "status": "active"
  },
  "message": "TikTok 账号绑定成功"
}
```

#### 1.1.3 同步数据

手动同步 TikTok 账号数据。

**请求**

```http
POST /v1/integrations/tiktok/sync
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account_id` | string | ✅ | 账号 ID |
| `sync_type` | string | ❌ | 同步类型：`full`/`incremental` |

**响应**

```json
{
  "success": true,
  "data": {
    "account_id": "550e8400-e29b-41d4-a716-446655440100",
    "last_sync_at": "2026-03-24T10:00:00Z",
    "followers": 15500,
    "followers_change": 500,
    "status": "success"
  }
}
```

#### 1.1.4 发布视频

通过 TikTok API 发布视频（需要额外权限）。

**请求**

```http
POST /v1/integrations/tiktok/publish
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account_id` | string | ✅ | 账号 ID |
| `video_file` | file | ✅ | 视频文件 |
| `description` | string | ✅ | 视频描述 |
| `privacy_level` | string | ❌ | 隐私级别 |

**响应**

```json
{
  "success": true,
  "data": {
    "publish_id": "pub_123456789",
    "video_id": "7123456789012345678",
    "video_url": "https://tiktok.com/@myaccount/video/7123456789012345678",
    "status": "processing"
  },
  "message": "视频发布中，请稍后查看"
}
```

---

### 1.2 YouTube 集成

#### 1.2.1 获取授权 URL

获取 YouTube 账号绑定授权 URL。

**请求**

```http
POST /v1/integrations/youtube/auth-url
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `redirect_uri` | string | ✅ | 回调地址 |
| `state` | string | ✅ | 状态参数 |

**响应**

```json
{
  "success": true,
  "data": {
    "authorization_url": "https://accounts.google.com/o/oauth2/auth?client_id=xxx&redirect_uri=xxx&scope=xxx",
    "state": "random_state_string",
    "expires_in": 600
  }
}
```

#### 1.2.2 处理授权回调

**请求**

```http
POST /v1/integrations/youtube/callback
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | ✅ | 授权码 |
| `state` | string | ✅ | 状态参数 |

**响应**

```json
{
  "success": true,
  "data": {
    "account_id": "550e8400-e29b-41d4-a716-446655440101",
    "platform": "youtube",
    "channel_id": "UCxxxxxxxxxxxxxxxxx",
    "channel_title": "My Channel",
    "subscribers": 10000,
    "status": "active"
  },
  "message": "YouTube 账号绑定成功"
}
```

#### 1.2.3 同步数据

同步 YouTube 频道数据。

**请求**

```http
POST /v1/integrations/youtube/sync
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account_id` | string | ✅ | 账号 ID |

**响应**

```json
{
  "success": true,
  "data": {
    "account_id": "550e8400-e29b-41d4-a716-446655440101",
    "last_sync_at": "2026-03-24T10:00:00Z",
    "subscribers": 10200,
    "subscribers_change": 200,
    "total_views": 500000,
    "total_videos": 50,
    "status": "success"
  }
}
```

---

### 1.3 Instagram 集成

#### 1.3.1 获取授权 URL

获取 Instagram 账号绑定授权 URL。

**请求**

```http
POST /v1/integrations/instagram/auth-url
Authorization: Bearer <access_token>
Content-Type: application/json
```

**响应**

```json
{
  "success": true,
  "data": {
    "authorization_url": "https://api.instagram.com/oauth/authorize?client_id=xxx&redirect_uri=xxx",
    "state": "random_state_string",
    "expires_in": 600
  }
}
```

#### 1.3.2 处理授权回调

**请求**

```http
POST /v1/integrations/instagram/callback
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | ✅ | 授权码 |
| `state` | string | ✅ | 状态参数 |

**响应**

```json
{
  "success": true,
  "data": {
    "account_id": "550e8400-e29b-41d4-a716-446655440102",
    "platform": "instagram",
    "instagram_user_id": "17841400000000000",
    "username": "myaccount",
    "followers": 8000,
    "status": "active"
  },
  "message": "Instagram 账号绑定成功"
}
```

#### 1.3.3 同步数据

同步 Instagram 账号数据。

**请求**

```http
POST /v1/integrations/instagram/sync
Authorization: Bearer <access_token>
Content-Type: application/json
```

**响应**

```json
{
  "success": true,
  "data": {
    "account_id": "550e8400-e29b-41d4-a716-446655440102",
    "last_sync_at": "2026-03-24T10:00:00Z",
    "followers": 8200,
    "followers_change": 200,
    "media_count": 100,
    "status": "success"
  }
}
```

---

## 2. 支付集成

### 2.1 支付宝集成

#### 2.1.1 创建充值订单

创建支付宝充值订单。

**请求**

```http
POST /v1/integrations/alipay/recharge
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `amount` | integer | ✅ | 充值金额（分） |
| `out_trade_no` | string | ✅ | 商户订单号 |
| `subject` | string | ✅ | 订单标题 |
| `body` | string | ❌ | 订单描述 |

**请求示例**

```json
{
  "amount": 100000,
  "out_trade_no": "RCH202603240001",
  "subject": "AIAds 账户充值",
  "body": "在线充值"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "order_id": "550e8400-e29b-41d4-a716-446655440300",
    "trade_no": "alipay_trade_xxx",
    "pay_url": "https://open.alipay.com/...",
    "qr_code": "data:image/png;base64,xxx",
    "expires_in": 900
  }
}
```

#### 2.1.2 处理支付回调

处理支付宝异步通知。

**请求**

```http
POST /v1/integrations/alipay/notify
Content-Type: application/x-www-form-urlencoded
```

**请求参数**（表单格式）

| 字段 | 类型 | 说明 |
|------|------|------|
| `out_trade_no` | string | 商户订单号 |
| `trade_no` | string | 支付宝交易号 |
| `trade_status` | string | 交易状态 |
| `total_amount` | string | 交易金额 |
| `sign` | string | 签名 |

**响应**

```
SUCCESS
```

---

### 2.2 微信支付集成

#### 2.2.1 创建充值订单

创建微信支付充值订单。

**请求**

```http
POST /v1/integrations/wechat-pay/recharge
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `amount` | integer | ✅ | 充值金额（分） |
| `out_trade_no` | string | ✅ | 商户订单号 |
| `description` | string | ✅ | 订单描述 |

**响应**

```json
{
  "success": true,
  "data": {
    "order_id": "550e8400-e29b-41d4-a716-446655440300",
    "transaction_id": "wechat_transaction_xxx",
    "code_url": "weixin://wxpay/bizpayurl?pr=xxx",
    "qr_code": "data:image/png;base64,xxx"
  }
}
```

---

### 2.3 Stripe 集成

#### 2.3.1 创建支付 Intent

创建 Stripe 支付 Intent。

**请求**

```http
POST /v1/integrations/stripe/payment-intent
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `amount` | integer | ✅ | 支付金额（美分） |
| `currency` | string | ✅ | 货币类型 |
| `payment_method_types` | array | ❌ | 支付方式 |

**请求示例**

```json
{
  "amount": 10000,
  "currency": "usd",
  "payment_method_types": ["card"]
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "payment_intent_id": "pi_xxxxxxxxxxxxx",
    "client_secret": "pi_xxx_secret_xxx",
    "amount": 10000,
    "currency": "usd",
    "status": "requires_payment_method"
  }
}
```

#### 2.3.2 处理支付 webhook

处理 Stripe webhook 事件。

**请求**

```http
POST /v1/integrations/stripe/webhook
Content-Type: application/json
Stripe-Signature: sig_xxx
```

**响应**

```json
{
  "success": true,
  "received": true
}
```

---

### 2.4 PayPal 集成

#### 2.4.1 创建提现订单

创建 PayPal 提现订单。

**请求**

```http
POST /v1/integrations/paypal/payout
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `withdrawal_id` | string | ✅ | 提现 ID |
| `recipient_email` | string | ✅ | 收款邮箱 |
| `amount` | number | ✅ | 金额（美元） |
| `note` | string | ❌ | 备注 |

**请求示例**

```json
{
  "withdrawal_id": "550e8400-e29b-41d4-a716-446655440700",
  "recipient_email": "user@example.com",
  "amount": 100.00,
  "note": "AIAds 收益提现"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "payout_id": "PAYOUT_ID_xxx",
    "transaction_id": "PAYPAL_TRANSACTION_xxx",
    "status": "processing",
    "amount": 100.00,
    "fee": 2.00
  }
}
```

#### 2.4.2 查询提现状态

查询 PayPal 提现状态。

**请求**

```http
GET /v1/integrations/paypal/payout/:payout_id
Authorization: Bearer <admin_token>
```

**响应**

```json
{
  "success": true,
  "data": {
    "payout_id": "PAYOUT_ID_xxx",
    "transaction_id": "PAYPAL_TRANSACTION_xxx",
    "status": "success",
    "amount": 100.00,
    "fee": 2.00,
    "completed_at": "2026-03-26T10:00:00Z"
  }
}
```

---

## 3. 通讯服务集成

### 3.1 SendGrid 邮件集成

#### 3.1.1 发送验证码邮件

**请求**

```http
POST /v1/integrations/sendgrid/verification-code
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | ✅ | 收件邮箱 |
| `code` | string | ✅ | 验证码 |
| `purpose` | string | ✅ | 用途 |
| `language` | string | ❌ | 语言 |

**请求示例**

```json
{
  "email": "user@example.com",
  "code": "123456",
  "purpose": "register",
  "language": "zh-CN"
}
```

**响应**

```json
{
  "success": true,
  "message": "验证码邮件已发送"
}
```

#### 3.1.2 发送通知邮件

**请求**

```http
POST /v1/integrations/sendgrid/notification
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `template_id` | string | ✅ | 邮件模板 ID |
| `recipient` | string | ✅ | 收件邮箱 |
| `data` | object | ✅ | 模板数据 |

**响应**

```json
{
  "success": true,
  "data": {
    "message_id": "msg_xxxxxxxxxxxxx"
  }
}
```

---

### 3.2 Twilio 短信集成

#### 3.2.1 发送验证码短信

**请求**

```http
POST /v1/integrations/twilio/verification-code
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `phone` | string | ✅ | 收件手机号 |
| `code` | string | ✅ | 验证码 |
| `language` | string | ❌ | 语言 |

**请求示例**

```json
{
  "phone": "+8613800138000",
  "code": "123456",
  "language": "zh-CN"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "sid": "SMxxxxxxxxxxxxxxxxx"
  },
  "message": "验证码短信已发送"
}
```

---

## 4. 云服务集成

### 4.1 Cloudflare R2 存储

#### 4.1.1 获取上传凭证

获取 R2 文件上传凭证。

**请求**

```http
POST /v1/integrations/r2/upload-url
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file_type` | string | ✅ | 文件类型：`image`/`video` |
| `file_size` | integer | ✅ | 文件大小（字节） |
| `purpose` | string | ✅ | 用途：`avatar`/`business_license`/`content` |

**请求示例**

```json
{
  "file_type": "image",
  "file_size": 1024000,
  "purpose": "avatar"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "upload_url": "https://xxx.r2.cloudflarestorage.com/xxx?X-Amz-xxx",
    "file_url": "https://r2.aiads.com/avatars/xxx.jpg",
    "file_id": "file_xxxxxxxxxxxxx",
    "expires_in": 3600
  }
}
```

#### 4.1.2 上传文件

使用上传凭证直接上传文件到 R2。

**请求**

```http
PUT {upload_url}
Content-Type: image/jpeg

<binary data>
```

**响应**

```http
HTTP/1.1 200 OK
```

---

### 4.2 Supabase 集成

#### 4.2.1 用户认证

使用 Supabase Auth 进行用户认证。

**请求**

```http
POST /v1/integrations/supabase/auth/signup
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | ✅ | 邮箱 |
| `password` | string | ✅ | 密码 |
| `options` | object | ❌ | 额外选项 |

**响应**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com"
    },
    "session": {
      "access_token": "xxx",
      "refresh_token": "xxx"
    }
  }
}
```

---

### 4.3 Upstash Redis 集成

#### 4.3.1 缓存操作

通过 API 操作 Redis 缓存。

**设置缓存**

```http
POST /v1/integrations/redis/set
Authorization: Bearer <internal_token>
Content-Type: application/json

{
  "key": "cache:kol:123",
  "value": "{\"followers\": 15000}",
  "ttl": 3600
}
```

**获取缓存**

```http
GET /v1/integrations/redis/get?key=cache:kol:123
Authorization: Bearer <internal_token>
```

**响应**

```json
{
  "success": true,
  "data": {
    "key": "cache:kol:123",
    "value": "{\"followers\": 15000}",
    "ttl": 3500
  }
}
```

---

## 5. Webhook

### 5.1 Webhook 配置

#### 5.1.1 创建 Webhook

创建 Webhook 订阅。

**请求**

```http
POST /v1/webhooks
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | ✅ | Webhook URL |
| `events` | array | ✅ | 订阅事件列表 |
| `secret` | string | ❌ | 签名密钥（不传则自动生成） |
| `active` | boolean | ❌ | 是否启用 |

**请求示例**

```json
{
  "url": "https://example.com/webhook/aiads",
  "events": [
    "order.completed",
    "payment.success",
    "withdrawal.processed"
  ],
  "active": true
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "webhook_id": "550e8400-e29b-41d4-a716-446655440a00",
    "url": "https://example.com/webhook/aiads",
    "events": ["order.completed", "payment.success", "withdrawal.processed"],
    "secret": "whsec_xxxxxxxxxxxxx",
    "active": true,
    "created_at": "2026-03-24T10:00:00Z"
  }
}
```

#### 5.1.2 获取 Webhook 列表

**请求**

```http
GET /v1/webhooks
Authorization: Bearer <access_token>
```

**响应**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "webhook_id": "550e8400-e29b-41d4-a716-446655440a00",
        "url": "https://example.com/webhook/aiads",
        "events": ["order.completed"],
        "active": true,
        "created_at": "2026-03-24T10:00:00Z"
      }
    ]
  }
}
```

#### 5.1.3 删除 Webhook

**请求**

```http
DELETE /v1/webhooks/:webhook_id
Authorization: Bearer <access_token>
```

**响应**

```json
{
  "success": true,
  "message": "Webhook 已删除"
}
```

### 5.2 Webhook 事件

#### 支持的事件类型

| 事件 | 说明 | 触发时机 |
|------|------|----------|
| `user.registered` | 用户注册 | 新用户注册成功 |
| `user.verified` | 用户认证 | 用户完成实名认证 |
| `campaign.created` | 活动创建 | 新活动创建 |
| `campaign.audited` | 活动审核 | 活动审核完成 |
| `order.created` | 订单创建 | 新订单创建 |
| `order.completed` | 订单完成 | 订单完成 |
| `payment.success` | 支付成功 | 充值支付成功 |
| `withdrawal.requested` | 提现申请 | 用户申请提现 |
| `withdrawal.processed` | 提现处理 | 提现处理完成 |
| `kol.verified` | KOL 认证 | KOL 认证通过 |

### 5.3 Webhook 载荷

#### 通用格式

```json
{
  "id": "evt_xxxxxxxxxxxxx",
  "type": "order.completed",
  "created_at": "2026-03-24T10:00:00Z",
  "data": {
    "order_id": "550e8400-e29b-41d4-a716-446655440200",
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "kol_id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 50000,
    "status": "completed",
    "completed_at": "2026-03-24T10:00:00Z"
  }
}
```

### 5.4 Webhook 签名验证

#### 签名头

```http
X-Webhook-Signature: t=1679644800,v1=xxxxxxxxxxxxx
```

#### 签名验证示例（Node.js）

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const timestamp = signature.match(/t=(\d+)/)[1];
  const signatureHash = signature.match(/v1=(\w+)/)[1];
  
  const signedPayload = `${timestamp}.${payload}`;
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return signatureHash === expectedHash;
}
```

---

## 附录

### A. API 密钥管理

#### 创建 API 密钥

```http
POST /v1/api-keys
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My Integration",
  "permissions": ["read", "write"]
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "api_key_id": "550e8400-e29b-41d4-a716-446655440b00",
    "name": "My Integration",
    "key": "ak_xxxxxxxxxxxxx",
    "permissions": ["read", "write"],
    "created_at": "2026-03-24T10:00:00Z"
  }
}
```

**注意：** API 密钥仅在创建时显示一次，请妥善保存。

### B. 错误码

| 错误码 | 说明 |
|--------|------|
| `INTEGRATION_NOT_CONFIGURED` | 集成未配置 |
| `AUTHORIZATION_FAILED` | 授权失败 |
| `TOKEN_EXPIRED` | Token 过期 |
| `API_RATE_LIMITED` | API 限流 |
| `WEBHOOK_DELIVERY_FAILED` | Webhook 投递失败 |

---

**AIAds 第三方集成 API 文档结束**
